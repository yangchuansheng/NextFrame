//! NSApplication + NSWindow setup for NextFrame desktop.

use objc2::msg_send;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2::{MainThreadMarker, MainThreadOnly};
use objc2_app_kit::{
    NSApplication, NSApplicationActivationPolicy, NSAutoresizingMaskOptions,
    NSBackingStoreType, NSView, NSWindow, NSWindowButton, NSWindowStyleMask,
};
use objc2_foundation::{NSPoint, NSRect, NSSize, NSString};

use crate::webview;

const WINDOW_WIDTH: f64 = 1440.0;
const WINDOW_HEIGHT: f64 = 900.0;
const TOPBAR_H: f64 = 48.0;

/// Boot the macOS app: create window, embed WKWebView, run event loop.
pub fn run() {
    let Some(mtm) = MainThreadMarker::new() else {
        tracing::error!("must run on main thread");
        return;
    };

    let app = NSApplication::sharedApplication(mtm);
    app.setActivationPolicy(NSApplicationActivationPolicy::Regular);

    // Dark appearance
    unsafe {
        let dark_name = NSString::from_str("NSAppearanceNameDarkAqua");
        let appearance: Option<Retained<objc2_app_kit::NSAppearance>> =
            objc2_app_kit::NSAppearance::appearanceNamed(&dark_name);
        if let Some(ref a) = appearance {
            let ptr: *const objc2_app_kit::NSAppearance = Retained::as_ptr(a);
            let _: () = msg_send![&app, setAppearance: ptr];
        }
    }

    let style = NSWindowStyleMask::Titled
        | NSWindowStyleMask::Closable
        | NSWindowStyleMask::Resizable
        | NSWindowStyleMask::Miniaturizable
        | NSWindowStyleMask::FullSizeContentView;

    let rect = NSRect::new(
        NSPoint::new(100.0, 100.0),
        NSSize::new(WINDOW_WIDTH, WINDOW_HEIGHT),
    );

    let window: Retained<NSWindow> = unsafe {
        msg_send![
            NSWindow::alloc(mtm),
            initWithContentRect: rect,
            styleMask: style,
            backing: NSBackingStoreType::Buffered,
            defer: false
        ]
    };

    window.setTitle(&NSString::from_str("NextFrame"));
    window.center();

    // Transparent titlebar
    unsafe {
        let _: () = msg_send![&window, setTitlebarAppearsTransparent: true];
        let _: () = msg_send![&window, setTitleVisibility: 1i64]; // NSWindowTitleHidden
    }

    // Create container view to hold both WKWebView + drag overlay
    let container = NSView::initWithFrame(
        mtm.alloc::<NSView>(),
        NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(WINDOW_WIDTH, WINDOW_HEIGHT)),
    );
    container.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable
            | NSAutoresizingMaskOptions::ViewHeightSizable,
    );

    // Create WKWebView
    let wv = match webview::create(mtm, NSSize::new(WINDOW_WIDTH, WINDOW_HEIGHT)) {
        Ok(wv) => wv,
        Err(e) => {
            tracing::error!("failed to create webview: {e}");
            return;
        }
    };
    wv.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable
            | NSAutoresizingMaskOptions::ViewHeightSizable,
    );

    // Create transparent drag overlay for the topbar area
    // This sits ON TOP of WKWebView so the titlebar region is draggable
    let drag_overlay = NSView::initWithFrame(
        mtm.alloc::<NSView>(),
        NSRect::new(
                NSPoint::new(0.0, WINDOW_HEIGHT - TOPBAR_H),
                NSSize::new(WINDOW_WIDTH, TOPBAR_H),
            ),
        );
    // Pin to top, stretch width
    drag_overlay.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable
            | NSAutoresizingMaskOptions::ViewMinYMargin,
    );
    // Make it transparent — no background, just catches mouse for dragging
    // SAFETY: mouseDownCanMoveWindow is checked by NSWindow on the view hierarchy.
    // A transparent view that returns YES for mouseDownCanMoveWindow enables dragging.
    // We use a class that overrides this. For now, use movableByWindowBackground on window.
    unsafe {
        let _: () = msg_send![&window, setMovableByWindowBackground: true];
    }

    // Add views: WKWebView first (bottom), drag overlay on top
    container.addSubview(&wv);
    container.addSubview(&drag_overlay);

    window.setContentView(Some(&container));
    window.makeKeyAndOrderFront(None);

    // Position traffic lights to align with HTML topbar center
    position_traffic_lights(&window);
    register_resize_observer(&window);

    // Auto-screenshot
    if std::env::args().any(|a| a == "--screenshot") {
        let out = "/tmp/nf-screenshot.png";
        match webview::screenshot(&wv, out) {
            Ok(()) => tracing::info!("screenshot: {out}"),
            Err(e) => tracing::error!("screenshot failed: {e}"),
        }
        std::process::exit(0);
    }

    unsafe {
        let _: () = msg_send![&app, activateIgnoringOtherApps: true];
    }

    tracing::info!("NextFrame window ready");
    app.run();
}

/// Reposition traffic lights to vertically center in our 48px HTML topbar.
/// The buttons live in the system titlebar area (top of window).
/// With FullSizeContentView, content starts at y=0 and titlebar overlaps.
fn position_traffic_lights(window: &NSWindow) {
    let padding_x = 13.0f64;

    unsafe {
        let close = window.standardWindowButton(NSWindowButton::CloseButton);
        let mini = window.standardWindowButton(NSWindowButton::MiniaturizeButton);
        let zoom = window.standardWindowButton(NSWindowButton::ZoomButton);

        let (Some(close), Some(mini), Some(zoom)) = (close, mini, zoom) else {
            return;
        };

        let close_frame = close.frame();
        let mini_frame = mini.frame();
        let btn_h = close_frame.size.height;
        let spacing = mini_frame.origin.x - close_frame.origin.x;

        // We want buttons centered in a 48px topbar.
        // System titlebar is at the very top of the window.
        // Real titlebar height:
        let win_frame = window.frame();
        let content_rect: NSRect = msg_send![window, contentLayoutRect];
        let titlebar_h = win_frame.size.height - content_rect.size.height;

        // Our HTML topbar is 48px from the top of the content area.
        // But with FullSizeContentView, content area includes the titlebar.
        // So the "visual topbar" spans from (window top) to (window top - 48px).
        // The buttons are in the titlebar coordinate space (origin at bottom-left of titlebar).
        // Center button in 48px: y = (48 - btn_h) / 2, but measured from bottom of titlebar.
        // Since titlebar_h < 48, we need to shift buttons DOWN into content area.
        // Button y in titlebar coords: negative means below titlebar into content.
        let visual_center_from_top = (TOPBAR_H - btn_h) / 2.0;
        // From top of titlebar to center = visual_center_from_top
        // In titlebar coords (bottom-up): y = titlebar_h - visual_center_from_top - btn_h
        let y = titlebar_h - visual_center_from_top - btn_h;

        let mut x = padding_x;

        let mut cf = close_frame;
        cf.origin = NSPoint::new(x, y);
        let _: () = msg_send![&*close, setFrame: cf];
        x += spacing;

        let mut mf = mini_frame;
        mf.origin = NSPoint::new(x, y);
        let _: () = msg_send![&*mini, setFrame: mf];
        x += spacing;

        let mut zf = zoom.frame();
        zf.origin = NSPoint::new(x, y);
        let _: () = msg_send![&*zoom, setFrame: zf];
    }
}

/// Register resize/layout notifications to reapply traffic light positions.
fn register_resize_observer(window: &NSWindow) {
    unsafe {
        let center: *mut AnyObject =
            msg_send![objc2::class!(NSNotificationCenter), defaultCenter];

        let names = [
            "NSWindowDidResizeNotification",
            "NSWindowDidBecomeKeyNotification",
            "NSWindowDidEndLiveResizeNotification",
            "NSWindowDidExitFullScreenNotification",
        ];

        for name in names {
            let window_ptr: *const NSWindow = window as *const NSWindow;
            let ns_name = NSString::from_str(name);

            let block = block2::RcBlock::new(move |_notif: *mut AnyObject| {
                let win: &NSWindow = &*window_ptr;
                position_traffic_lights(win);
            });

            let _: *mut AnyObject = msg_send![
                center,
                addObserverForName: &*ns_name,
                object: window_ptr as *const AnyObject,
                queue: std::ptr::null::<AnyObject>(),
                usingBlock: &*block
            ];
        }
    }
}
