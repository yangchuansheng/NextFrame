//! WKWebView creation for NextFrame desktop.

use std::path::PathBuf;

use objc2::rc::Retained;
use objc2::{MainThreadMarker, MainThreadOnly};
use objc2_foundation::{NSPoint, NSRect, NSSize, NSString, NSURL};
use objc2_web_kit::{WKWebView, WKWebViewConfiguration, WKWebsiteDataStore};

/// Resolve the web-v2 directory relative to the executable.
fn web_dir() -> PathBuf {
    // In dev: executable is at target/debug/nextframe
    // web-v2 is at src/nf-runtime/web-v2/
    let exe = std::env::current_exe().unwrap_or_default();
    let project_root = exe
        .ancestors()
        .find(|p| p.join("Cargo.toml").exists())
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    project_root.join("src/nf-runtime/web-v2")
}

/// Create a WKWebView that loads the home page from disk.
pub fn create(
    mtm: MainThreadMarker,
    size: NSSize,
) -> Result<Retained<WKWebView>, String> {
    // SAFETY: mtm proves main-thread, required by WKWebViewConfiguration::new.
    let config = unsafe { WKWebViewConfiguration::new(mtm) };

    // SAFETY: mtm proves main-thread, required by nonPersistentDataStore.
    let store = unsafe { WKWebsiteDataStore::nonPersistentDataStore(mtm) };

    // SAFETY: config and store are live WebKit objects.
    unsafe {
        config.setWebsiteDataStore(&store);
    }

    let rect = NSRect::new(NSPoint::new(0.0, 0.0), size);

    // SAFETY: mtm, frame, and config satisfy WKWebView designated initializer.
    let web_view = unsafe {
        WKWebView::initWithFrame_configuration(WKWebView::alloc(mtm), rect, &config)
    };

    // Load from local file
    let dir = web_dir();
    let index_path = dir.join("index.html");

    if index_path.exists() {
        let file_url = NSURL::URLWithString(&NSString::from_str(
            &format!("file://{}", index_path.display()),
        ));
        let dir_url = NSURL::URLWithString(&NSString::from_str(
            &format!("file://{}/", dir.display()),
        ));

        if let (Some(file), Some(dir)) = (file_url, dir_url) {
            // SAFETY: loadFileURL:allowingReadAccessToURL: is a standard WKWebView method.
            unsafe {
                web_view.loadFileURL_allowingReadAccessToURL(&file, &dir);
            }
            tracing::info!("loading {}", index_path.display());
        } else {
            tracing::warn!("failed to create NSURLs, falling back to inline HTML");
            load_fallback(&web_view);
        }
    } else {
        tracing::warn!("index.html not found at {}, using fallback", index_path.display());
        load_fallback(&web_view);
    }

    tracing::info!("WKWebView created");
    Ok(web_view)
}

fn load_fallback(web_view: &WKWebView) {
    let html = NSString::from_str(FALLBACK_HTML);
    unsafe {
        web_view.loadHTMLString_baseURL(&html, None);
    }
}

const FALLBACK_HTML: &str = r#"<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
html, body { height: 100%; background: #050507; color: white;
  font-family: -apple-system, system-ui, sans-serif;
  display: flex; align-items: center; justify-content: center;
  -webkit-font-smoothing: antialiased; }
</style></head>
<body><h1>NextFrame v0.5</h1></body>
</html>"#;
