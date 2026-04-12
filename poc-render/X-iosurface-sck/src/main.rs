//! POC X: ScreenCaptureKit → IOSurface-backed CMSampleBuffer → AVAssetWriter
//!
//! The CORRECT zero-copy path: WindowServer already composites WKWebView into
//! an IOSurface. SCK reads that surface directly — no CALayer render, no CPU copy.

use std::ffi::c_void;
use std::ptr;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use block2::RcBlock;
use objc2::rc::Retained;
use objc2::runtime::{AnyClass, AnyObject, Bool};
use objc2::{msg_send, MainThreadMarker};
use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy, NSBackingStoreType, NSWindow, NSWindowStyleMask};
use objc2_core_graphics::{
    CGBitmapContextCreate, CGBitmapContextCreateImage, CGColorSpace, CGContext,
    CGImageAlphaInfo, CGImageByteOrderInfo,
};
use objc2_core_media::CMTime;
use objc2_foundation::{
    NSDate, NSDefaultRunLoopMode, NSError, NSPoint, NSRect, NSRunLoop, NSSize, NSString,
};
use objc2_quartz_core::CALayer;

// ── FFI ──────────────────────────────────────────────────────────────────
type CVPixelBufferRef = *mut c_void;

#[link(name = "CoreVideo", kind = "framework")]
unsafe extern "C" {}
#[link(name = "ScreenCaptureKit", kind = "framework")]
unsafe extern "C" {}
#[link(name = "WebKit", kind = "framework")]
unsafe extern "C" {}
#[link(name = "CoreMedia", kind = "framework")]
unsafe extern "C" {}

unsafe extern "C" {
    fn CVPixelBufferGetIOSurface(pixel_buffer: CVPixelBufferRef) -> *mut c_void;
    fn CVPixelBufferGetWidth(pixel_buffer: CVPixelBufferRef) -> usize;
    fn CVPixelBufferGetHeight(pixel_buffer: CVPixelBufferRef) -> usize;
    fn CMSampleBufferGetImageBuffer(sbuf: *const c_void) -> CVPixelBufferRef;
    fn dispatch_queue_create(label: *const i8, attr: *const c_void) -> *mut c_void;
}

const WIDTH: usize = 1920;
const HEIGHT: usize = 1080;
const FPS: usize = 30;
const BENCH_FRAMES: usize = 90;
const SCK_DURATION: f64 = 3.0;

fn main() {
    let mtm = MainThreadMarker::new().expect("main thread");
    let app = NSApplication::sharedApplication(mtm);
    app.setActivationPolicy(NSApplicationActivationPolicy::Regular);
    #[allow(deprecated)]
    unsafe { app.activateIgnoringOtherApps(true); }

    println!("=== POC X: ScreenCaptureKit Zero-Copy ===");
    println!("Target: {WIDTH}x{HEIGHT} @ {FPS}fps\n");

    // ── Create window + WebView ──────────────────────────────────────────
    let window = create_window(mtm);
    let webview = create_webview(&window);
    println!("Waiting for WebView...");
    pump(Duration::from_secs(2));

    // ── Baseline: CALayer.renderInContext ─────────────────────────────────
    println!("\n--- [A] Baseline: CALayer.renderInContext ---");
    let a = bench_calayer(&webview);
    report("CALayer baseline", &a);

    // ── ScreenCaptureKit ─────────────────────────────────────────────────
    println!("\n--- [B] ScreenCaptureKit: SCStream → CMSampleBuffer ---");
    let b = bench_sck(&window);
    report("ScreenCaptureKit", &b);

    // ── Summary ──────────────────────────────────────────────────────────
    println!("\n=== RESULTS ===");
    report("CALayer baseline", &a);
    report("ScreenCaptureKit", &b);
    if b.fps() > 0.0 && a.fps() > 0.0 {
        if b.fps() > a.fps() {
            println!("  → SCK is {:.2}x faster!", b.fps() / a.fps());
        } else {
            println!("  → SCK is {:.2}x slower", a.fps() / b.fps());
        }
    }
    println!("  → IOSurface-backed: {}/{}", b.ios_ok, b.frames);
}

struct Bench { frames: usize, secs: f64, ios_ok: usize }
impl Bench {
    fn fps(&self) -> f64 { if self.secs > 0.0 { self.frames as f64 / self.secs } else { 0.0 } }
    fn ms(&self) -> f64 { if self.frames > 0 { self.secs * 1000.0 / self.frames as f64 } else { 0.0 } }
}
fn report(label: &str, b: &Bench) {
    println!("  {label}: {:.1} fps, {:.2}ms/frame ({} frames in {:.2}s)", b.fps(), b.ms(), b.frames, b.secs);
}

// ── Baseline ─────────────────────────────────────────────────────────────

fn bench_calayer(webview: &AnyObject) -> Bench {
    let layer: Retained<CALayer> = unsafe { msg_send![webview, layer] };
    let t0 = Instant::now();
    for _ in 0..BENCH_FRAMES {
        let mut buf = vec![0u8; WIDTH * 4 * HEIGHT];
        let cs = CGColorSpace::new_device_rgb().unwrap();
        let bi = CGImageByteOrderInfo::Order32Little.0 | CGImageAlphaInfo::PremultipliedFirst.0;
        if let Some(ref ctx) = unsafe {
            CGBitmapContextCreate(buf.as_mut_ptr().cast(), WIDTH, HEIGHT, 8, WIDTH * 4, Some(&cs), bi)
        } {
            let bounds = layer.bounds();
            let sx = if bounds.size.width > 0.0 { WIDTH as f64 / bounds.size.width } else { 1.0 };
            let sy = if bounds.size.height > 0.0 { HEIGHT as f64 / bounds.size.height } else { 1.0 };
            CGContext::translate_ctm(Some(ctx.as_ref()), 0.0, HEIGHT as f64);
            CGContext::scale_ctm(Some(ctx.as_ref()), sx, -sy);
            let _: () = unsafe { msg_send![&*layer, renderInContext: &**ctx] };
            let _ = CGBitmapContextCreateImage(Some(ctx));
        }
        pump(Duration::from_millis(1));
    }
    Bench { frames: BENCH_FRAMES, secs: t0.elapsed().as_secs_f64(), ios_ok: 0 }
}

// ── ScreenCaptureKit ─────────────────────────────────────────────────────

fn bench_sck(window: &NSWindow) -> Bench {
    // Step 1: Get shareable content
    let content = match get_shareable_content() {
        Some(c) => c,
        None => return Bench { frames: 0, secs: 0.0, ios_ok: 0 },
    };

    // Step 2: Find our window
    let window_id: u32 = unsafe { msg_send![window, windowNumber] };
    let sc_window = match find_sc_window(&content, window_id) {
        Some(w) => w,
        None => {
            eprintln!("  ❌ Window not found in SCShareableContent");
            return Bench { frames: 0, secs: 0.0, ios_ok: 0 };
        }
    };
    println!("  Found window (id={window_id})");

    // Step 3: Create filter + config
    let filter = create_window_filter(&sc_window);
    let config = create_stream_config();

    // Step 4: Create stream + output handler
    FRAME_COUNT.store(0, Ordering::Relaxed);
    IOS_COUNT.store(0, Ordering::Relaxed);

    let output_delegate = create_output_delegate();
    let stream = create_stream(&filter, &config, &output_delegate);

    // Step 5: Add output using dispatch queue
    let queue_label = std::ffi::CString::new("poc.sck.q").unwrap();
    let queue = unsafe { dispatch_queue_create(queue_label.as_ptr(), ptr::null()) };

    // Try different approaches for addStreamOutput
    let add_ok = unsafe {
        // Wrap in exception handler — SCK throws NSException on invalid params
        let stream_ref = &*stream;
        let delegate_ref = &*output_delegate;
        let mut error: *mut NSError = ptr::null_mut();
        let result = objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
            let ok: Bool = msg_send![stream_ref,
                addStreamOutput: delegate_ref,
                type: 0i64,
                sampleHandlerQueue: queue,
                error: &mut error
            ];
            ok
        }));
        match result {
            Ok(ok) => {
                if ok.as_bool() {
                    println!("  addStreamOutput succeeded");
                    true
                } else {
                    let msg = if !error.is_null() {
                        (*error).localizedDescription().to_string()
                    } else { "unknown".into() };
                    eprintln!("  addStreamOutput returned NO: {msg}");
                    false
                }
            }
            Err(e) => {
                eprintln!("  addStreamOutput threw exception: {:?}", e);
                false
            }
        }
    };
    if !add_ok {
        return Bench { frames: 0, secs: 0.0, ios_ok: 0 };
    }

    // Step 6: Start capture
    if !start_stream(&stream) {
        return Bench { frames: 0, secs: 0.0, ios_ok: 0 };
    }
    println!("  SCStream started, capturing for {SCK_DURATION}s...");

    // Step 7: Let it run
    let t0 = Instant::now();
    while t0.elapsed() < Duration::from_secs_f64(SCK_DURATION) {
        pump(Duration::from_millis(16));
    }
    let elapsed = t0.elapsed();

    // Step 8: Stop
    stop_stream(&stream);

    let frames = FRAME_COUNT.load(Ordering::Relaxed);
    let ios = IOS_COUNT.load(Ordering::Relaxed);
    println!("  Captured {frames} frames ({ios} IOSurface-backed)");

    Bench { frames, secs: elapsed.as_secs_f64(), ios_ok: ios }
}

fn get_shareable_content() -> Option<Retained<AnyObject>> {
    let (tx, rx) = std::sync::mpsc::channel();
    let handler = RcBlock::new(move |content: *mut AnyObject, error: *mut NSError| {
        if !content.is_null() {
            let _ = tx.send(unsafe { Retained::retain(content) });
        } else {
            let msg = if !error.is_null() {
                unsafe { (*error).localizedDescription() }.to_string()
            } else {
                "unknown".into()
            };
            eprintln!("  ❌ SCShareableContent error: {msg}");
            let _ = tx.send(None);
        }
    });
    unsafe {
        let cls = AnyClass::get(c"SCShareableContent").unwrap();
        let _: () = msg_send![cls,
            getShareableContentExcludingDesktopWindows: Bool::NO,
            onScreenWindowsOnly: Bool::YES,
            completionHandler: &*handler
        ];
    }
    pump(Duration::from_secs(2));
    rx.recv_timeout(Duration::from_secs(5)).ok().flatten()
}

fn find_sc_window(content: &AnyObject, window_id: u32) -> Option<Retained<AnyObject>> {
    unsafe {
        let windows: *mut AnyObject = msg_send![content, windows];
        if windows.is_null() { return None; }
        let count: usize = msg_send![windows, count];
        for i in 0..count {
            let w: *mut AnyObject = msg_send![windows, objectAtIndex: i];
            let wid: u32 = msg_send![w, windowID];
            if wid == window_id {
                return Retained::retain(w);
            }
        }
        None
    }
}

fn create_window_filter(sc_window: &AnyObject) -> Retained<AnyObject> {
    unsafe {
        let cls = AnyClass::get(c"SCContentFilter").unwrap();
        let f: *mut AnyObject = msg_send![cls, alloc];
        let f: *mut AnyObject = msg_send![f, initWithDesktopIndependentWindow: sc_window];
        Retained::retain(f).unwrap()
    }
}

fn create_stream_config() -> Retained<AnyObject> {
    unsafe {
        let cls = AnyClass::get(c"SCStreamConfiguration").unwrap();
        let c: *mut AnyObject = msg_send![cls, new];
        let _: () = msg_send![c, setWidth: WIDTH];
        let _: () = msg_send![c, setHeight: HEIGHT];
        let _: () = msg_send![c, setMinimumFrameInterval: CMTime::new(1, FPS as i32)];
        let _: () = msg_send![c, setShowsCursor: false];
        let _: () = msg_send![c, setPixelFormat: 0x42475241u32]; // BGRA
        Retained::retain(c).unwrap()
    }
}

fn create_stream(filter: &AnyObject, config: &AnyObject, delegate: &AnyObject) -> Retained<AnyObject> {
    unsafe {
        let cls = AnyClass::get(c"SCStream").unwrap();
        let s: *mut AnyObject = msg_send![cls, alloc];
        let s: *mut AnyObject = msg_send![s, initWithFilter: filter, configuration: config, delegate: delegate];
        Retained::retain(s).unwrap()
    }
}

// SCStreamOutput delegate — uses raw ObjC class registration
// because define_class! has issues with the SCStreamOutput protocol.
// We register a class manually that responds to stream:didOutputSampleBuffer:ofType:

use objc2::sel;

static FRAME_COUNT: AtomicUsize = AtomicUsize::new(0);
static IOS_COUNT: AtomicUsize = AtomicUsize::new(0);

unsafe extern "C" fn stream_did_output(
    _this: *mut AnyObject,
    _sel: objc2::runtime::Sel,
    _stream: *mut AnyObject,
    sample_buffer: *mut c_void,
    output_type: i64,
) {
    if output_type != 0 { return; } // 0 = video
    FRAME_COUNT.fetch_add(1, Ordering::Relaxed);

    if !sample_buffer.is_null() {
        let pixel_buffer = CMSampleBufferGetImageBuffer(sample_buffer);
        if !pixel_buffer.is_null() {
            let surface = CVPixelBufferGetIOSurface(pixel_buffer);
            if !surface.is_null() {
                IOS_COUNT.fetch_add(1, Ordering::Relaxed);
            }
        }
    }
}

fn create_output_delegate() -> Retained<AnyObject> {
    unsafe {
        // Register a custom ObjC class at runtime
        use std::ffi::CString;
        let superclass = AnyClass::get(c"NSObject").unwrap();

        // Check if already registered
        if let Some(cls) = AnyClass::get(c"POCStreamOutput") {
            let obj: *mut AnyObject = msg_send![cls, new];
            return Retained::retain(obj).unwrap();
        }

        let mut builder = objc2::runtime::ClassBuilder::new(c"POCStreamOutput", superclass).unwrap();

        // Add the SCStreamOutput protocol method
        builder.add_method(
            sel!(stream:didOutputSampleBuffer:ofType:),
            stream_did_output as unsafe extern "C" fn(_, _, _, _, _),
        );

        let cls = builder.register();
        let obj: *mut AnyObject = msg_send![cls, new];
        Retained::retain(obj).unwrap()
    }
}

fn start_stream(stream: &AnyObject) -> bool {
    let (tx, rx) = std::sync::mpsc::channel();
    let handler = RcBlock::new(move |error: *mut NSError| {
        if error.is_null() {
            let _ = tx.send(true);
        } else {
            let msg = unsafe { (*error).localizedDescription() }.to_string();
            eprintln!("  ❌ SCStream start failed: {msg}");
            let _ = tx.send(false);
        }
    });
    unsafe {
        let _: () = msg_send![stream, startCaptureWithCompletionHandler: &*handler];
    }
    pump(Duration::from_secs(2));
    rx.recv_timeout(Duration::from_secs(5)).unwrap_or(false)
}

fn stop_stream(stream: &AnyObject) {
    let (tx, rx) = std::sync::mpsc::channel::<()>();
    let handler = RcBlock::new(move |_: *mut NSError| { let _ = tx.send(()); });
    unsafe {
        let _: () = msg_send![stream, stopCaptureWithCompletionHandler: &*handler];
    }
    pump(Duration::from_secs(1));
    let _ = rx.recv_timeout(Duration::from_secs(3));
}

// ── Window / WebView ─────────────────────────────────────────────────────

fn create_window(mtm: MainThreadMarker) -> Retained<NSWindow> {
    let frame = NSRect::new(NSPoint::new(100.0, 100.0), NSSize::new(WIDTH as f64, HEIGHT as f64));
    let style = NSWindowStyleMask::Titled | NSWindowStyleMask::Closable;
    unsafe {
        let w = NSWindow::initWithContentRect_styleMask_backing_defer(
            mtm.alloc(), frame, style, NSBackingStoreType::Buffered, false,
        );
        w.setTitle(&NSString::from_str("POC-X: SCK"));
        w.makeKeyAndOrderFront(None);
        w
    }
}

fn create_webview(window: &NSWindow) -> Retained<AnyObject> {
    unsafe {
        let frame = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(WIDTH as f64, HEIGHT as f64));
        let cfg: *mut AnyObject = msg_send![AnyClass::get(c"WKWebViewConfiguration").unwrap(), new];
        let wv: *mut AnyObject = msg_send![AnyClass::get(c"WKWebView").unwrap(), alloc];
        let wv: *mut AnyObject = msg_send![wv, initWithFrame: frame, configuration: cfg];
        let wv = Retained::retain(wv).unwrap();

        let html = NSString::from_str(r#"<!DOCTYPE html>
<html><head><style>
body{margin:0;background:#1a1a2e;overflow:hidden}
.box{width:200px;height:200px;background:linear-gradient(135deg,#e94560,#0f3460);
     position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
     animation:spin 2s linear infinite;border-radius:20px}
@keyframes spin{to{transform:translate(-50%,-50%) rotate(360deg) scale(1.2)}}
.c{position:fixed;top:20px;left:20px;color:#fff;font:48px monospace}
</style></head><body><div class="box"></div>
<div class="c" id="c">0</div>
<script>let n=0;setInterval(()=>{document.getElementById('c').textContent=++n},33)</script>
</body></html>"#);
        let _: () = msg_send![&*wv, loadHTMLString: &*html, baseURL: ptr::null::<AnyObject>()];
        let _: () = msg_send![window, setContentView: &*wv];
        wv
    }
}

fn pump(dur: Duration) {
    let date = NSDate::dateWithTimeIntervalSinceNow(dur.as_secs_f64());
    unsafe { NSRunLoop::currentRunLoop().runMode_beforeDate(NSDefaultRunLoopMode, &date); }
}
