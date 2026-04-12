//! POC Y: CALayer IOSurface Direct Read
//!
//! Test three approaches:
//! 1. Baseline: CALayer.renderInContext → CGBitmapContext (heap alloc) → CGImage
//! 2. IOSurface direct: renderInContext → IOSurface memory → CVPixelBufferCreateWithIOSurface
//! 3. Probe: check if WKWebView's sublayer tree exposes IOSurface contents

use std::ffi::c_void;
use std::ptr;
use std::time::{Duration, Instant};

use objc2::rc::Retained;
use objc2::runtime::{AnyClass, AnyObject};
use objc2::{msg_send, MainThreadMarker};
use objc2_app_kit::{NSApplication, NSBackingStoreType, NSWindow, NSWindowStyleMask};
use objc2_core_graphics::{
    CGBitmapContextCreate, CGBitmapContextCreateImage, CGColorSpace, CGContext,
    CGImageAlphaInfo, CGImageByteOrderInfo,
};
use objc2_foundation::{
    NSDate, NSDefaultRunLoopMode, NSNumber, NSPoint, NSRect, NSRunLoop, NSSize, NSString, NSURL,
};
use objc2_quartz_core::CALayer;

// ── CoreVideo / IOSurface FFI ────────────────────────────────────────────
const K_CV_PIXEL_FORMAT_TYPE_32_BGRA: u32 = 0x4247_5241;
type CVPixelBufferRef = *mut c_void;
type IOSurfaceRef = *mut c_void;

#[link(name = "CoreVideo", kind = "framework")]
unsafe extern "C" {}
#[link(name = "IOSurface", kind = "framework")]
unsafe extern "C" {}
#[link(name = "WebKit", kind = "framework")]
unsafe extern "C" {}

unsafe extern "C" {
    fn CVPixelBufferCreateWithIOSurface(
        allocator: *const c_void,
        surface: IOSurfaceRef,
        pixel_buffer_attributes: *const c_void,
        pixel_buffer_out: *mut CVPixelBufferRef,
    ) -> i32;
    fn CVPixelBufferGetIOSurface(pixel_buffer: CVPixelBufferRef) -> IOSurfaceRef;
    fn CVBufferRelease(buffer: CVPixelBufferRef);
    fn IOSurfaceGetWidth(surface: IOSurfaceRef) -> usize;
    fn IOSurfaceGetHeight(surface: IOSurfaceRef) -> usize;
    fn IOSurfaceGetBytesPerRow(surface: IOSurfaceRef) -> usize;
    fn IOSurfaceGetBaseAddress(surface: IOSurfaceRef) -> *mut c_void;
    fn IOSurfaceLock(surface: IOSurfaceRef, options: u32, seed: *mut u32) -> i32;
    fn IOSurfaceUnlock(surface: IOSurfaceRef, options: u32, seed: *mut u32) -> i32;
    fn IOSurfaceGetPixelFormat(surface: IOSurfaceRef) -> u32;
}

const WIDTH: usize = 1920;
const HEIGHT: usize = 1080;
const TOTAL_FRAMES: usize = 90; // 3s @ 30fps

fn main() {
    let mtm = MainThreadMarker::new().expect("must run on main thread");
    let app = NSApplication::sharedApplication(mtm);
    unsafe {
        app.setActivationPolicy(objc2_app_kit::NSApplicationActivationPolicy::Regular);
        #[allow(deprecated)]
        app.activateIgnoringOtherApps(true);
    }

    println!("=== POC Y: CALayer IOSurface Direct Read ===");
    println!("Target: {WIDTH}x{HEIGHT}, {TOTAL_FRAMES} frames\n");

    // ── Create window + WebView ──────────────────────────────────────────
    let window = create_window(mtm);
    let webview = create_webview(mtm, &window);
    println!("Waiting for WebView to load...");
    pump(Duration::from_secs(2));

    // ── Benchmark 1: Baseline (heap buffer) ──────────────────────────────
    println!("\n--- [A] Baseline: renderInContext → heap vec → CGImage ---");
    let a = bench_heap_render(&webview);
    report("Heap baseline", &a);

    // ── Benchmark 2: IOSurface render target ─────────────────────────────
    println!("\n--- [B] IOSurface: renderInContext → IOSurface → CVPixelBuffer ---");
    let b = bench_iosurface_render(&webview);
    report("IOSurface render", &b);

    // ── Probe layer tree ─────────────────────────────────────────────────
    println!("\n--- [C] Probe: sublayer IOSurface contents ---");
    let layer: Retained<CALayer> = unsafe { msg_send![&*webview, layer] };
    dump_layer_tree(&layer, 0);

    // ── Summary ──────────────────────────────────────────────────────────
    println!("\n=== RESULTS ===");
    report("Heap baseline", &a);
    report("IOSurface render", &b);
    if b.fps() > a.fps() && a.fps() > 0.0 {
        println!("  → IOSurface is {:.2}x faster", b.fps() / a.fps());
    } else if a.fps() > 0.0 && b.fps() > 0.0 {
        println!("  → IOSurface is {:.2}x slower", a.fps() / b.fps());
    }
    println!("  → IOSurface-backed CVPixelBuffers: {}/{}", b.ios_ok, b.frames);
}

// ── Bench result ─────────────────────────────────────────────────────────

struct Bench {
    frames: usize,
    secs: f64,
    ios_ok: usize,
}
impl Bench {
    fn fps(&self) -> f64 {
        if self.secs > 0.0 { self.frames as f64 / self.secs } else { 0.0 }
    }
    fn ms(&self) -> f64 {
        if self.frames > 0 { self.secs * 1000.0 / self.frames as f64 } else { 0.0 }
    }
}
fn report(label: &str, b: &Bench) {
    println!("  {label}: {:.1} fps, {:.2}ms/frame ({} frames in {:.2}s)",
        b.fps(), b.ms(), b.frames, b.secs);
}

// ── Benchmark A: heap buffer baseline ────────────────────────────────────

fn bench_heap_render(webview: &AnyObject) -> Bench {
    let layer: Retained<CALayer> = unsafe { msg_send![webview, layer] };
    let t0 = Instant::now();
    for _ in 0..TOTAL_FRAMES {
        let mut buf = vec![0u8; WIDTH * 4 * HEIGHT];
        let cs = CGColorSpace::new_device_rgb().unwrap();
        let bi = CGImageByteOrderInfo::Order32Little.0 | CGImageAlphaInfo::PremultipliedFirst.0;
        let ctx = unsafe {
            CGBitmapContextCreate(buf.as_mut_ptr().cast(), WIDTH, HEIGHT, 8, WIDTH * 4, Some(&cs), bi)
        };
        if let Some(ref c) = ctx {
            apply_transform(c, &layer);
            let _: () = unsafe { msg_send![&*layer, renderInContext: &**c] };
            let _ = CGBitmapContextCreateImage(Some(c));
        }
        pump(Duration::from_millis(1));
    }
    Bench { frames: TOTAL_FRAMES, secs: t0.elapsed().as_secs_f64(), ios_ok: 0 }
}

// ── Benchmark B: IOSurface render target ─────────────────────────────────

fn bench_iosurface_render(webview: &AnyObject) -> Bench {
    let surface = create_iosurface(WIDTH, HEIGHT);
    if surface.is_null() {
        println!("  ❌ Failed to create IOSurface");
        return Bench { frames: 0, secs: 0.0, ios_ok: 0 };
    }
    let sw = unsafe { IOSurfaceGetWidth(surface) };
    let sh = unsafe { IOSurfaceGetHeight(surface) };
    println!("  Created IOSurface: {sw}x{sh}");

    let layer: Retained<CALayer> = unsafe { msg_send![webview, layer] };
    let t0 = Instant::now();
    let mut ios_ok = 0usize;

    for _ in 0..TOTAL_FRAMES {
        if unsafe { IOSurfaceLock(surface, 0, ptr::null_mut()) } != 0 { continue; }

        let base = unsafe { IOSurfaceGetBaseAddress(surface) };
        let bpr = unsafe { IOSurfaceGetBytesPerRow(surface) };

        if !base.is_null() && bpr > 0 {
            let cs = CGColorSpace::new_device_rgb().unwrap();
            let bi = CGImageByteOrderInfo::Order32Little.0 | CGImageAlphaInfo::PremultipliedFirst.0;
            let ctx = unsafe {
                CGBitmapContextCreate(base, WIDTH, HEIGHT, 8, bpr, Some(&cs), bi)
            };
            if let Some(ref c) = ctx {
                apply_transform(c, &layer);
                let _: () = unsafe { msg_send![&*layer, renderInContext: &**c] };
            }

            // Key test: wrap IOSurface as CVPixelBuffer — zero copy
            let mut pxbuf: CVPixelBufferRef = ptr::null_mut();
            let rv = unsafe {
                CVPixelBufferCreateWithIOSurface(ptr::null(), surface, ptr::null(), &mut pxbuf)
            };
            if rv == 0 && !pxbuf.is_null() {
                let backing = unsafe { CVPixelBufferGetIOSurface(pxbuf) };
                if !backing.is_null() { ios_ok += 1; }
                unsafe { CVBufferRelease(pxbuf); }
            }
        }

        unsafe { IOSurfaceUnlock(surface, 0, ptr::null_mut()); }
        pump(Duration::from_millis(1));
    }

    Bench { frames: TOTAL_FRAMES, secs: t0.elapsed().as_secs_f64(), ios_ok }
}

// ── Layer tree probe ─────────────────────────────────────────────────────

fn dump_layer_tree(layer: &CALayer, depth: usize) {
    let indent = "  ".repeat(depth + 1);
    let cls: *const AnyClass = unsafe { msg_send![layer, class] };
    let name: Retained<NSString> = unsafe { msg_send![cls, className] };
    let bounds = layer.bounds();
    let contents: *mut c_void = unsafe { msg_send![layer, contents] };
    let has = !contents.is_null();
    print!("{indent}{name} ({:.0}x{:.0}) contents={has}", bounds.size.width, bounds.size.height);

    if has {
        // Try reading as IOSurface
        let w = unsafe { IOSurfaceGetWidth(contents) };
        let h = unsafe { IOSurfaceGetHeight(contents) };
        if w > 0 && h < 100000 && w < 100000 && h > 0 {
            print!(" → IOSurface {w}x{h} ✅");
        }
    }
    println!();

    let sublayers: *mut AnyObject = unsafe { msg_send![layer, sublayers] };
    if !sublayers.is_null() {
        let count: usize = unsafe { msg_send![sublayers, count] };
        for i in 0..count.min(20) {
            let sub: *mut AnyObject = unsafe { msg_send![sublayers, objectAtIndex: i] };
            if depth < 6 && !sub.is_null() {
                dump_layer_tree(unsafe { &*(sub as *const CALayer) }, depth + 1);
            }
        }
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────

fn apply_transform(ctx: &CGContext, layer: &CALayer) {
    let bounds = layer.bounds();
    let sx = if bounds.size.width > 0.0 { WIDTH as f64 / bounds.size.width } else { 1.0 };
    let sy = if bounds.size.height > 0.0 { HEIGHT as f64 / bounds.size.height } else { 1.0 };
    CGContext::translate_ctm(Some(ctx), 0.0, HEIGHT as f64);
    CGContext::scale_ctm(Some(ctx), sx, -sy);
}

fn create_iosurface(width: usize, height: usize) -> IOSurfaceRef {
    let bpr = width * 4;
    let alloc_size = bpr * height;
    unsafe {
        let cls = match AnyClass::get(c"IOSurface") {
            Some(c) => c,
            None => { eprintln!("IOSurface class not found"); return ptr::null_mut(); }
        };

        // Build properties dict using raw msg_send
        let dict_cls = AnyClass::get(c"NSMutableDictionary").unwrap();
        let dict: *mut AnyObject = msg_send![dict_cls, new];

        set_dict_uint(dict, "IOSurfaceWidth", width);
        set_dict_uint(dict, "IOSurfaceHeight", height);
        set_dict_uint(dict, "IOSurfaceBytesPerRow", bpr);
        set_dict_uint(dict, "IOSurfaceBytesPerElement", 4);
        set_dict_uint(dict, "IOSurfaceAllocSize", alloc_size);
        set_dict_uint(dict, "IOSurfacePixelFormat", K_CV_PIXEL_FORMAT_TYPE_32_BGRA as usize);

        let surface: *mut AnyObject = msg_send![cls, alloc];
        let surface: *mut AnyObject = msg_send![surface, initWithProperties: dict];
        surface as IOSurfaceRef
    }
}

unsafe fn set_dict_uint(dict: *mut AnyObject, key: &str, val: usize) {
    let k = NSString::from_str(key);
    let v = NSNumber::new_usize(val);
    let _: () = msg_send![dict, setObject: &*v, forKey: &*k];
}

fn create_window(mtm: MainThreadMarker) -> Retained<NSWindow> {
    let frame = NSRect::new(NSPoint::new(100.0, 100.0), NSSize::new(WIDTH as f64, HEIGHT as f64));
    let style = NSWindowStyleMask::Titled | NSWindowStyleMask::Closable;
    unsafe {
        let w = NSWindow::initWithContentRect_styleMask_backing_defer(
            mtm.alloc(), frame, style, NSBackingStoreType::Buffered, false,
        );
        w.setTitle(&NSString::from_str("POC-Y"));
        w.makeKeyAndOrderFront(None);
        w
    }
}

fn create_webview(_mtm: MainThreadMarker, window: &NSWindow) -> Retained<AnyObject> {
    unsafe {
        let frame = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(WIDTH as f64, HEIGHT as f64));
        let cfg_cls = AnyClass::get(c"WKWebViewConfiguration").unwrap();
        let cfg: *mut AnyObject = msg_send![cfg_cls, new];
        let wv_cls = AnyClass::get(c"WKWebView").unwrap();
        let wv: *mut AnyObject = msg_send![wv_cls, alloc];
        let wv: *mut AnyObject = msg_send![wv, initWithFrame: frame, configuration: cfg];
        let wv = Retained::retain(wv).unwrap();

        let html = NSString::from_str(r#"<!DOCTYPE html>
<html><head><style>
body{margin:0;background:#0f3460;overflow:hidden}
.r{width:300px;height:300px;border:8px solid #e94560;border-radius:50%;
   position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
   animation:p 1.5s ease-in-out infinite}
@keyframes p{0%,100%{transform:translate(-50%,-50%) scale(.8);opacity:.5}
              50%{transform:translate(-50%,-50%) scale(1.2);opacity:1}}
.t{position:fixed;bottom:20px;right:20px;color:#fff;font:32px monospace}
</style></head><body><div class="r"></div>
<div class="t" id="t">0</div>
<script>let n=0;setInterval(()=>{document.getElementById('t').textContent=++n},33)</script>
</body></html>"#);
        let _: () = msg_send![&*wv, loadHTMLString: &*html, baseURL: ptr::null::<AnyObject>()];
        // Set as contentView of window
        let _: () = msg_send![window, setContentView: &*wv];
        wv
    }
}

fn pump(dur: Duration) {
    let date = NSDate::dateWithTimeIntervalSinceNow(dur.as_secs_f64());
    unsafe {
        NSRunLoop::currentRunLoop().runMode_beforeDate(NSDefaultRunLoopMode, &date);
    }
}
