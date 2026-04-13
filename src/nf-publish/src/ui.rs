use std::panic::AssertUnwindSafe;

use objc2::msg_send;
use objc2::rc::Retained;
use objc2::runtime::{AnyObject, ProtocolObject};
use objc2::sel;
use objc2_app_kit::{NSAutoresizingMaskOptions, NSButton, NSColor, NSFont, NSTextField, NSView};
use objc2_foundation::{
    MainThreadMarker, NSInteger, NSPoint, NSRect, NSSize, NSString, NSURL, NSURLRequest,
};
use objc2_web_kit::{WKWebView, WKWebViewConfiguration};

use crate::delegates::{PilotNavDelegate, PilotUIDelegate};
use crate::state::{
    BOOKMARK_COLORS, BOOKMARKS_BAR_HEIGHT, BrowserTabView, TAB_STRIP_HEIGHT, TABS, TOOLBAR_HEIGHT,
};

pub(crate) struct BrowserLayout {
    pub(crate) tab_strip: Retained<NSView>,
    pub(crate) toolbar: Retained<NSView>,
    pub(crate) bookmarks_bar: Retained<NSView>,
    pub(crate) webview_host: Retained<NSView>,
    pub(crate) address_field: Retained<NSTextField>,
    pub(crate) back_button: Retained<NSButton>,
    pub(crate) forward_button: Retained<NSButton>,
    pub(crate) reload_button: Retained<NSButton>,
}

// ── Helpers ──

fn catch_objc(f: impl FnOnce()) -> Result<(), String> {
    let result = unsafe { objc2::exception::catch(AssertUnwindSafe(f)) };
    result.map_err(|e| format!("ObjC exception: {e:?}"))
}

fn srgb(r: f64, g: f64, b: f64, a: f64) -> Retained<NSColor> {
    NSColor::colorWithSRGBRed_green_blue_alpha(r, g, b, a)
}

fn set_layer_bg(view: &NSView, color: &NSColor) {
    view.setWantsLayer(true);
    if let Some(layer) = view.layer() {
        let cg = color.CGColor();
        let _: () = unsafe { msg_send![&*layer, setBackgroundColor: Some(&*cg)] };
    }
}

fn set_layer_radius(view: &NSView, radius: f64) {
    view.setWantsLayer(true);
    if let Some(layer) = view.layer() {
        let _: () = unsafe { msg_send![&*layer, setCornerRadius: radius] };
    }
}

fn set_top_corners(view: &NSView, radius: f64) {
    view.setWantsLayer(true);
    if let Some(layer) = view.layer() {
        let _: () = unsafe { msg_send![&*layer, setCornerRadius: radius] };
        // macOS: tabs sit at y=0 (bottom of strip). Visual top = MaxY in macOS coords.
        // kCALayerMinXMaxYCorner=4, kCALayerMaxXMaxYCorner=8 → mask=12 for top corners.
        // But CALayer uses iOS convention where MinY=top, MaxY=bottom regardless of view coords.
        // So visual top corners = MinXMinYCorner(1) + MaxXMinYCorner(2) = mask=3
        let _: () = unsafe { msg_send![&*layer, setMaskedCorners: 3u64] };
    }
}

fn set_btn_tint(btn: &NSButton, color: &NSColor) {
    let _: () = unsafe { msg_send![btn, setContentTintColor: color] };
}

fn remove_all_subviews(view: &NSView) {
    let subviews = view.subviews();
    for idx in (0..subviews.len()).rev() {
        let child = &*subviews.objectAtIndex(idx);
        let _ = catch_objc(|| {
            let _: () = unsafe { msg_send![child, removeFromSuperview] };
        });
    }
}

fn make_hairline(mtm: MainThreadMarker, x: f64, y: f64, w: f64, h: f64) -> Retained<NSView> {
    let view = unsafe {
        NSView::initWithFrame(
            mtm.alloc(),
            NSRect::new(NSPoint::new(x, y), NSSize::new(w, h)),
        )
    };
    set_layer_bg(&view, &srgb(0.910, 0.898, 0.882, 1.0));
    view
}

fn status_dot_color(status: Option<bool>) -> Retained<NSColor> {
    match status {
        Some(true) => srgb(0.204, 0.780, 0.349, 1.0), // green
        Some(false) => srgb(1.0, 0.231, 0.188, 1.0),  // red
        None => srgb(0.780, 0.780, 0.800, 1.0),       // gray
    }
}

// ── Traffic lights (Zed approach) ──

/// Repositions the macOS traffic-light buttons to match the custom browser chrome.
/// The buttons are aligned relative to the titlebar height on every rebuild.
pub(crate) fn move_traffic_lights(window: &objc2_app_kit::NSWindow) {
    use objc2_app_kit::NSWindowButton;
    let padding_x = 10.0f64;
    let padding_y = 10.0f64;

    unsafe {
        let close = window.standardWindowButton(NSWindowButton::CloseButton);
        let mini = window.standardWindowButton(NSWindowButton::MiniaturizeButton);
        let zoom = window.standardWindowButton(NSWindowButton::ZoomButton);

        let (Some(close), Some(mini), Some(zoom)) = (close, mini, zoom) else {
            return;
        };

        // Real titlebar height = window frame height - content layout rect height
        let win_frame = window.frame();
        let content_rect: NSRect = msg_send![window, contentLayoutRect];
        let titlebar_h = win_frame.size.height - content_rect.size.height;

        let close_frame = close.frame();
        let mini_frame = mini.frame();
        let btn_h = close_frame.size.height;
        let spacing = mini_frame.origin.x - close_frame.origin.x;

        // Y from bottom of titlebar: titlebar_h - padding_y - btn_h
        let y = titlebar_h - padding_y - btn_h;
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

// ── Layout creation ──

/// Builds the top-level browser chrome views and returns retained handles to each section.
/// The layout includes the tab strip, toolbar, bookmarks bar, and webview host.
pub(crate) fn create_browser_layout(
    mtm: MainThreadMarker,
    width: f64,
    height: f64,
    target: &AnyObject,
) -> BrowserLayout {
    // Chrome-style hierarchy: tab strip darkest, active tab = toolbar color (connected)
    let tab_strip_bg = srgb(0.855, 0.847, 0.835, 1.0); // dark warm — tabs emerge from this
    let toolbar_bg = srgb(0.961, 0.957, 0.949, 1.0); // lighter — active tab matches this
    let bookmarks_bg = srgb(0.976, 0.973, 0.968, 1.0); // lightest

    // Tab strip
    let tab_strip = unsafe {
        NSView::initWithFrame(
            mtm.alloc(),
            NSRect::new(
                NSPoint::new(0.0, height - TAB_STRIP_HEIGHT),
                NSSize::new(width, TAB_STRIP_HEIGHT),
            ),
        )
    };
    tab_strip.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewMinYMargin,
    );
    set_layer_bg(&tab_strip, &tab_strip_bg);

    // Toolbar
    let toolbar_y = height - TAB_STRIP_HEIGHT - TOOLBAR_HEIGHT;
    let toolbar = unsafe {
        NSView::initWithFrame(
            mtm.alloc(),
            NSRect::new(
                NSPoint::new(0.0, toolbar_y),
                NSSize::new(width, TOOLBAR_HEIGHT),
            ),
        )
    };
    toolbar.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewMinYMargin,
    );
    set_layer_bg(&toolbar, &toolbar_bg);

    // Bookmarks bar
    let bookmarks_y = height - TAB_STRIP_HEIGHT - TOOLBAR_HEIGHT - BOOKMARKS_BAR_HEIGHT;
    let bookmarks_bar = unsafe {
        NSView::initWithFrame(
            mtm.alloc(),
            NSRect::new(
                NSPoint::new(0.0, bookmarks_y),
                NSSize::new(width, BOOKMARKS_BAR_HEIGHT),
            ),
        )
    };
    bookmarks_bar.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewMinYMargin,
    );
    set_layer_bg(&bookmarks_bar, &bookmarks_bg);
    // Bottom hairline separating bookmarks from content
    let bookmarks_line = make_hairline(mtm, 0.0, 0.0, width, 1.0);
    bookmarks_line.setAutoresizingMask(NSAutoresizingMaskOptions::ViewWidthSizable);
    bookmarks_bar.addSubview(&bookmarks_line);

    // WebView host
    let wv_h = height - TAB_STRIP_HEIGHT - TOOLBAR_HEIGHT - BOOKMARKS_BAR_HEIGHT;
    let webview_host = unsafe {
        NSView::initWithFrame(
            mtm.alloc(),
            NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(width, wv_h)),
        )
    };
    webview_host.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewHeightSizable,
    );

    // Nav buttons
    let nav_font = unsafe { NSFont::systemFontOfSize(20.0) };
    let nav_tint = srgb(0.30, 0.30, 0.32, 1.0);
    let btn_y = (TOOLBAR_HEIGHT - 32.0) / 2.0;
    let back_button = make_nav_btn(
        mtm,
        12.0,
        btn_y,
        "‹",
        &nav_font,
        &nav_tint,
        target,
        sel!(toolbarBackClicked:),
    );
    let forward_button = make_nav_btn(
        mtm,
        44.0,
        btn_y,
        "›",
        &nav_font,
        &nav_tint,
        target,
        sel!(toolbarForwardClicked:),
    );
    let reload_button = make_nav_btn(
        mtm,
        76.0,
        btn_y,
        "↻",
        &nav_font,
        &nav_tint,
        target,
        sel!(toolbarReloadClicked:),
    );
    toolbar.addSubview(&back_button);
    toolbar.addSubview(&forward_button);
    toolbar.addSubview(&reload_button);

    // Address field
    let addr_x = 116.0;
    let addr_h = 22.0;
    let addr_y = (TOOLBAR_HEIGHT - addr_h) / 2.0;
    let address_field = unsafe {
        NSTextField::initWithFrame(
            mtm.alloc(),
            NSRect::new(
                NSPoint::new(addr_x, addr_y),
                NSSize::new((width - addr_x - 14.0).max(160.0), addr_h),
            ),
        )
    };
    address_field.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewMinYMargin,
    );
    address_field.setEditable(true);
    address_field.setSelectable(true);
    address_field.setBezeled(false);
    address_field.setBordered(false);
    address_field.setDrawsBackground(false);
    // Use layer for all visual styling — avoids bezel padding that misaligns text
    set_layer_bg(&address_field, &srgb(0.925, 0.920, 0.910, 1.0));
    set_layer_radius(&address_field, 6.0);
    address_field.setTextColor(Some(&srgb(0.15, 0.15, 0.16, 1.0)));
    let addr_font = unsafe { NSFont::systemFontOfSize(13.0) };
    unsafe { address_field.setFont(Some(&addr_font)) };
    address_field.setPlaceholderString(Some(&NSString::from_str("Search or enter URL")));
    unsafe {
        address_field.setTarget(Some(target));
        address_field.setAction(Some(sel!(addressBarSubmitted:)));
    }
    toolbar.addSubview(&address_field);

    BrowserLayout {
        tab_strip,
        toolbar,
        bookmarks_bar,
        webview_host,
        address_field,
        back_button,
        forward_button,
        reload_button,
    }
}

fn make_nav_btn(
    mtm: MainThreadMarker,
    x: f64,
    y: f64,
    title: &str,
    font: &NSFont,
    tint: &NSColor,
    target: &AnyObject,
    action: objc2::runtime::Sel,
) -> Retained<NSButton> {
    let btn = unsafe {
        NSButton::initWithFrame(
            mtm.alloc(),
            NSRect::new(NSPoint::new(x, y), NSSize::new(32.0, 32.0)),
        )
    };
    btn.setTitle(&NSString::from_str(title));
    btn.setBordered(false);
    unsafe { btn.setFont(Some(font)) };
    set_btn_tint(&btn, tint);
    unsafe {
        btn.setTarget(Some(target));
        btn.setAction(Some(action));
    }
    btn
}

fn bookmark_label_width(label: &str) -> f64 {
    label
        .chars()
        .map(|ch| if ch.is_ascii() { 7.0 } else { 12.0 })
        .sum::<f64>()
        + 4.0
}

/// Rebuilds the bookmarks bar buttons and per-workspace status dots from scratch.
/// Each button is wired to the shared browser target for bookmark activation.
pub(crate) fn rebuild_bookmarks_bar(bar: &NSView, target: &AnyObject, statuses: &[Option<bool>]) {
    let mtm = MainThreadMarker::new().expect("main thread");
    remove_all_subviews(bar);

    let width = bar.frame().size.width;
    let bottom_line = make_hairline(mtm, 0.0, 0.0, width, 1.0);
    bottom_line.setAutoresizingMask(NSAutoresizingMaskOptions::ViewWidthSizable);
    bar.addSubview(&bottom_line);

    let label_font = unsafe { NSFont::systemFontOfSize(12.0) };
    let label_color = srgb(0.267, 0.267, 0.267, 1.0);
    let mut x = 14.0;
    let dot_size = 6.0;
    let dot_y = (BOOKMARKS_BAR_HEIGHT - dot_size) / 2.0;
    let button_h = 18.0;
    let button_y = (BOOKMARKS_BAR_HEIGHT - button_h) / 2.0;

    for (index, (tab, _)) in TABS.iter().zip(BOOKMARK_COLORS.iter()).enumerate() {
        let status = statuses.get(index).copied().unwrap_or(None);
        let dot = unsafe {
            NSView::initWithFrame(
                mtm.alloc(),
                NSRect::new(NSPoint::new(x, dot_y), NSSize::new(dot_size, dot_size)),
            )
        };
        set_layer_bg(&dot, &status_dot_color(status));
        set_layer_radius(&dot, dot_size / 2.0);
        bar.addSubview(&dot);

        let label_x = x + dot_size + 6.0;
        let button_w = bookmark_label_width(tab.label);
        let button = unsafe {
            NSButton::initWithFrame(
                mtm.alloc(),
                NSRect::new(
                    NSPoint::new(label_x, button_y),
                    NSSize::new(button_w, button_h),
                ),
            )
        };
        button.setTitle(&NSString::from_str(tab.label));
        button.setTag(index as NSInteger);
        button.setBordered(false);
        unsafe { button.setFont(Some(&label_font)) };
        let _: () = unsafe { msg_send![&*button, setAlignment: 0i64] };
        set_btn_tint(&button, &label_color);
        unsafe {
            button.setTarget(Some(target));
            button.setAction(Some(sel!(sidebarTabClicked:)));
        }
        bar.addSubview(&button);

        x = label_x + button_w + 16.0;
    }
}

// ── Tab strip ──

/// Rebuilds the runtime tab strip, including active styling, close buttons, and the new-tab control.
/// Tabs are rendered from a lightweight view model snapshot.
pub(crate) fn rebuild_tab_strip(tab_strip: &NSView, target: &AnyObject, tabs: &[BrowserTabView]) {
    let mtm = MainThreadMarker::new().expect("main thread");
    remove_all_subviews(tab_strip);

    let tab_font = unsafe { NSFont::systemFontOfSize(12.0) };
    let active_text = srgb(0.12, 0.12, 0.13, 1.0);
    let inactive_text = srgb(0.55, 0.55, 0.57, 1.0);
    // Active tab color = toolbar color (visual connection)
    let active_tab_bg = srgb(0.961, 0.957, 0.949, 1.0);
    let sep_color = srgb(0.78, 0.77, 0.76, 1.0);

    // Tabs sit at bottom of strip, touching toolbar (y=0). Top gap = 6px.
    let tab_h = TAB_STRIP_HEIGHT - 6.0;
    let tab_y = 0.0;
    let close_w = 20.0;
    let pad_left = 78.0; // clear traffic light buttons (red/yellow/green ~72px)
    let pad_right = 44.0; // space for + button
    let gap = 1.0; // separator width
    let strip_w = tab_strip.frame().size.width;
    let num_tabs = tabs.len().max(1) as f64;
    let available = strip_w - pad_left - pad_right - (num_tabs - 1.0) * gap;
    let tab_w = (available / num_tabs).clamp(80.0, 220.0);
    let mut x = pad_left;

    for (idx, tab) in tabs.iter().enumerate() {
        let title_w = tab_w - close_w - 8.0;
        let title = if tab.loading {
            format!("⟳ {}", tab.title)
        } else {
            tab.title.clone()
        };

        // Tab title button — rounded top corners only for active, flat for inactive
        let btn = unsafe {
            NSButton::initWithFrame(
                mtm.alloc(),
                NSRect::new(NSPoint::new(x, tab_y), NSSize::new(title_w, tab_h)),
            )
        };
        btn.setTitle(&NSString::from_str(&title));
        btn.setTag(tab.id as NSInteger);
        btn.setBordered(false);
        unsafe { btn.setFont(Some(&tab_font)) };
        let _: () = unsafe { msg_send![&*btn, setAlignment: 0i64] }; // left-align
        // Single line + truncate with ellipsis
        let _: () = unsafe {
            let cell: *const objc2::runtime::AnyObject = msg_send![&*btn, cell];
            msg_send![cell, setLineBreakMode: 4i64] // NSLineBreakByTruncatingTail
        };
        let _: () = unsafe {
            let cell: *const objc2::runtime::AnyObject = msg_send![&*btn, cell];
            msg_send![cell, setWraps: false]
        };
        btn.setWantsLayer(true);
        if tab.active {
            set_layer_bg(&btn, &active_tab_bg);
            set_top_corners(&btn, 8.0);
            set_btn_tint(&btn, &active_text);
        } else {
            set_btn_tint(&btn, &inactive_text);
        }
        unsafe {
            btn.setTarget(Some(target));
            btn.setAction(Some(sel!(runtimeTabClicked:)));
        }
        tab_strip.addSubview(&btn);

        // Close button
        let close = unsafe {
            NSButton::initWithFrame(
                mtm.alloc(),
                NSRect::new(
                    NSPoint::new(x + title_w, tab_y),
                    NSSize::new(close_w, tab_h),
                ),
            )
        };
        close.setTitle(&NSString::from_str("×"));
        close.setTag(tab.id as NSInteger);
        close.setBordered(false);
        let close_font = unsafe { NSFont::systemFontOfSize(12.0) };
        unsafe { close.setFont(Some(&close_font)) };
        close.setWantsLayer(true);
        if tab.active {
            set_layer_bg(&close, &active_tab_bg);
            set_top_corners(&close, 8.0);
            // Only round top-right (CALayer MinY = visual top, so MaxXMinYCorner = 2)
            if let Some(layer) = close.layer() {
                let _: () = unsafe { msg_send![&*layer, setMaskedCorners: 2u64] };
            }
            set_btn_tint(&close, &srgb(0.45, 0.45, 0.47, 1.0));
        } else {
            set_btn_tint(&close, &srgb(0.62, 0.62, 0.64, 1.0));
        }
        unsafe {
            close.setTarget(Some(target));
            close.setAction(Some(sel!(closeTabClicked:)));
        }
        tab_strip.addSubview(&close);

        // Fix title button corner mask: active only rounds top-left
        if tab.active {
            if let Some(layer) = btn.layer() {
                let _: () = unsafe { msg_send![&*layer, setMaskedCorners: 1u64] }; // top-left only (MinXMinY)
            }
        }

        x += tab_w;

        // Separator between inactive tabs (not after active, not after last)
        if !tab.active && idx + 1 < tabs.len() && !tabs[idx + 1].active {
            let sep = unsafe {
                NSView::initWithFrame(
                    mtm.alloc(),
                    NSRect::new(NSPoint::new(x, tab_y + 6.0), NSSize::new(1.0, tab_h - 12.0)),
                )
            };
            set_layer_bg(&sep, &sep_color);
            tab_strip.addSubview(&sep);
        }
        x += 1.0; // 1px gap for separator space
    }

    // + button
    let plus = unsafe {
        NSButton::initWithFrame(
            mtm.alloc(),
            NSRect::new(
                NSPoint::new(x + 6.0, tab_y + 2.0),
                NSSize::new(28.0, tab_h - 4.0),
            ),
        )
    };
    plus.setTitle(&NSString::from_str("+"));
    plus.setBordered(false);
    let plus_font = unsafe { NSFont::systemFontOfSize(18.0) };
    unsafe { plus.setFont(Some(&plus_font)) };
    set_btn_tint(&plus, &srgb(0.55, 0.55, 0.57, 1.0));
    unsafe {
        plus.setTarget(Some(target));
        plus.setAction(Some(sel!(newTabClicked:)));
    }
    tab_strip.addSubview(&plus);
}

// ── WebView ──

/// Creates and configures a `WKWebView` for the shared browser shell.
/// When the provided URL is valid, the webview immediately begins loading it.
pub(crate) fn create_webview(
    mtm: MainThreadMarker,
    frame: NSRect,
    url: &str,
    config: &WKWebViewConfiguration,
    ui_delegate: &PilotUIDelegate,
    nav_delegate: &PilotNavDelegate,
) -> Retained<WKWebView> {
    let webview = unsafe { WKWebView::initWithFrame_configuration(mtm.alloc(), frame, config) };
    unsafe {
        webview.setUIDelegate(Some(ProtocolObject::from_ref(ui_delegate)));
        webview.setNavigationDelegate(Some(ProtocolObject::from_ref(nav_delegate)));
    }
    webview.setAutoresizingMask(
        NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewHeightSizable,
    );
    if let Some(url) = NSURL::URLWithString(&NSString::from_str(url)) {
        let request = NSURLRequest::requestWithURL(&url);
        unsafe {
            webview.loadRequest(&request);
        }
    }
    webview
}
