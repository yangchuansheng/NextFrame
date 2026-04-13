use block2::RcBlock;
use objc2::runtime::AnyObject;
use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
use objc2_foundation::{NSDictionary, NSError, NSString};
use objc2_web_kit::WKWebView;
use std::cell::RefCell;
use std::rc::Rc;

fn encode_and_write_screenshot(image: &NSImage, screenshot_path: &str) -> Result<usize, String> {
    let tiff = image
        .TIFFRepresentation()
        .ok_or_else(|| "screenshot failed".to_owned())?;
    let bitmap = NSBitmapImageRep::imageRepWithData(&tiff)
        .ok_or_else(|| "failed to decode screenshot".to_owned())?;
    let bitmap: &NSBitmapImageRep = unsafe { &*(&*bitmap as *const _ as *const NSBitmapImageRep) };
    let dict: &NSDictionary<NSString> =
        unsafe { &*(NSDictionary::new().as_ref() as *const _ as *const _) };
    let png =
        unsafe { bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, dict) }
            .ok_or_else(|| "failed to encode screenshot".to_owned())?;
    let bytes = unsafe { png.as_bytes_unchecked() };
    std::fs::write(screenshot_path, bytes).map_err(|err| format!("write failed: {err}"))?;
    Ok(bytes.len())
}

pub(crate) fn take_screenshot_with_callback<F>(
    webview: &WKWebView,
    screenshot_path: String,
    callback: F,
) where
    F: FnOnce(Result<usize, String>) + 'static,
{
    let ss_path = screenshot_path;
    let callback = Rc::new(RefCell::new(Some(callback)));
    let handler = RcBlock::new(move |image: *mut NSImage, _error: *mut NSError| {
        let result = if image.is_null() {
            Err("screenshot failed".to_owned())
        } else {
            let image = unsafe { &*image };
            encode_and_write_screenshot(image, &ss_path)
        };
        if let Some(callback) = callback.borrow_mut().take() {
            callback(result);
        }
    });
    unsafe {
        webview.takeSnapshotWithConfiguration_completionHandler(None, &handler);
    }
}

/// Captures a native snapshot of the webview and writes it to the requested PNG path.
/// A short status message is written to `result_path` on success or failure.
pub(crate) fn take_screenshot(webview: &WKWebView, result_path: String, screenshot_path: String) {
    let ss_path = screenshot_path.clone();
    let res_path = result_path;
    take_screenshot_with_callback(webview, screenshot_path, move |result| match result {
        Ok(len) => {
            let _ = std::fs::write(&res_path, format!("ok: {} ({len} bytes)", ss_path));
        }
        Err(err) => {
            let _ = std::fs::write(&res_path, format!("error: {err}"));
        }
    });
}

/// Evaluates JavaScript in the webview and writes the stringified result to disk.
/// Results are wrapped to normalize `null`, errors, and non-string return values.
pub(crate) fn eval_js(webview: &WKWebView, js: &str, result_path: String) {
    // Wrap JS so the result is always a string (avoids NSNumber/NSNull crash).
    // serde_json::to_string properly escapes the JS code as a JSON string literal.
    let js_escaped = serde_json::to_string(js).unwrap_or_else(|_| "\"\"".to_owned());
    let wrapped = format!(
        "try{{var __r=eval({js_escaped});__r==null?'null':String(__r)}}catch(__e){{'error: '+__e.message}}"
    );
    let js_str = NSString::from_str(&wrapped);
    let res_path = result_path;
    let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
        if !error.is_null() {
            let err = unsafe { &*error };
            let desc = err.localizedDescription();
            let _ = std::fs::write(&res_path, format!("error: {desc}"));
        } else if !result.is_null() {
            let s: &NSString = unsafe { &*(result as *const NSString) };
            let _ = std::fs::write(&res_path, format!("ok: {s}"));
        } else {
            let _ = std::fs::write(&res_path, "ok: null");
        }
    });
    unsafe {
        webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
    }
}
