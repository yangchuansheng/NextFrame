use std::panic::AssertUnwindSafe;

use block2::RcBlock;
use objc2::msg_send;
use objc2::runtime::AnyObject;
use objc2_app_kit::{NSEvent, NSEventModifierFlags, NSEventType};
use objc2_foundation::{NSError, NSPoint, NSString};
use objc2_web_kit::WKWebView;

use crate::eval::{eval_js, take_screenshot, take_screenshot_with_callback};
use crate::keyboard::{add_tag, jitter, paste_text_native, send_key_command, type_text_native};
use crate::state::{
    TABS, all_tab_ids, all_tab_infos, close_tab, create_dynamic_tab, go_back, go_forward,
    navigate_active_input, navigate_tab_to_url, reload_tab, switch_tab, tab_index_for_webview,
};

/// Run an Obj-C call that might throw an exception. Returns Ok(()) on success,
/// Err(description) on Obj-C exception. Prevents app crash from foreign exceptions.
fn catch_objc(f: impl FnOnce()) -> Result<(), String> {
    let result = unsafe { objc2::exception::catch(AssertUnwindSafe(f)) };
    result.map_err(|e| format!("ObjC exception: {e:?}"))
}

/// Generate JS to find an element by CSS selector or `text:xxx`, checking Shadow DOM too.
/// Returns JS code that evaluates to `"x,y"` (center coords) or `"not_found"` or `"error: ..."`.
fn find_element_js(selector: &str) -> String {
    let sel_escaped = serde_json::to_string(selector).unwrap_or_else(|_| "\"\"".to_owned());

    if selector.starts_with("text:") {
        let text = &selector[5..];
        let te = serde_json::to_string(text).unwrap_or_else(|_| "\"\"".to_owned());
        format!(
            "try{{var found=null;\
            var all=document.querySelectorAll('*');\
            for(var i=0;i<all.length;i++){{if(all[i].textContent.trim()==={te}&&all[i].offsetWidth>0&&all[i].children.length<=3){{found=all[i];break;}}}}\
            if(!found){{for(var i=0;i<all.length;i++){{if(all[i].textContent.trim().indexOf({te})===0&&all[i].offsetWidth>0&&all[i].children.length<=3&&all[i].textContent.trim().length<30){{found=all[i];break;}}}}}}\
            if(!found){{var w=document.querySelector('wujie-app');if(w&&w.shadowRoot){{var sa=w.shadowRoot.querySelectorAll('*');for(var i=0;i<sa.length;i++){{if(sa[i].textContent.trim()==={te}&&sa[i].offsetWidth>0&&sa[i].children.length<=3){{found=sa[i];break;}}}}}}}}\
            if(found){{var r=found.getBoundingClientRect();String(Math.round(r.x+r.width/2))+','+String(Math.round(r.y+r.height/2))}}else{{'not_found'}}\
            }}catch(e){{'error: '+e.message}}",
            te = te
        )
    } else {
        format!(
            "try{{\
            var el=document.querySelector({se});\
            if(!el){{var w=document.querySelector('wujie-app');if(w&&w.shadowRoot)el=w.shadowRoot.querySelector({se});}}\
            if(el&&el.offsetWidth>0){{var r=el.getBoundingClientRect();String(Math.round(r.x+r.width/2))+','+String(Math.round(r.y+r.height/2))}}\
            else{{'not_found'}}\
            }}catch(e){{'error: '+e.message}}",
            se = sel_escaped
        )
    }
}

/// Generate JS that binds `el` to the first matching element in the main DOM or supported
/// shadow roots. Supports CSS selectors and `text:...` lookups.
fn element_lookup_snippet(selector: &str) -> String {
    if let Some(text) = selector.strip_prefix("text:") {
        let text_json = serde_json::to_string(text).unwrap_or_else(|_| "\"\"".to_owned());
        format!(
            "var __needle={text_json};\
            var __roots=[document];\
            document.querySelectorAll('wujie-app').forEach(function(__host){{if(__host.shadowRoot)__roots.push(__host.shadowRoot);}});\
            var __matchText=function(__root){{\
                var __all=__root.querySelectorAll('*');\
                for(var __i=0;__i<__all.length;__i++){{\
                    var __candidate=__all[__i];\
                    var __text=(__candidate.textContent||'').trim();\
                    if(!__text)continue;\
                    var __rect=__candidate.getBoundingClientRect();\
                    if((__text===__needle||__text.indexOf(__needle)===0)&&__rect.width>0&&__rect.height>0){{return __candidate;}}\
                }}\
                return null;\
            }};\
            var el=null;\
            for(var __r=0;__r<__roots.length&&!el;__r++){{el=__matchText(__roots[__r]);}};"
        )
    } else {
        let selector_json = serde_json::to_string(selector).unwrap_or_else(|_| "\"\"".to_owned());
        format!(
            "var __selector={selector_json};\
            var __roots=[document];\
            document.querySelectorAll('wujie-app').forEach(function(__host){{if(__host.shadowRoot)__roots.push(__host.shadowRoot);}});\
            var el=null;\
            for(var __r=0;__r<__roots.length&&!el;__r++){{el=__roots[__r].querySelector(__selector);}};"
        )
    }
}

fn element_query_js(selector: &str, found_expr: &str, not_found_expr: &str) -> String {
    let body = format!("if(el){{{found_expr}}}return {not_found_expr};");
    format!(
        "(function(){{try{{{}{} }}catch(e){{return 'error: '+e.message;}}}})()",
        element_lookup_snippet(selector),
        body
    )
}

fn parse_selector_and_value(input: &str, usage: &str) -> Result<(String, String), String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(format!("usage: {usage}"));
    }
    if let Some(rest) = trimmed.strip_prefix('"') {
        if let Some(end) = rest.find('"') {
            let selector = rest[..end].to_owned();
            let value = rest[end + 1..].trim();
            if value.is_empty() {
                return Err(format!("usage: {usage}"));
            }
            return Ok((selector, value.to_owned()));
        }
        return Err("unclosed quote in selector".to_owned());
    }

    let Some(space) = trimmed.find(' ') else {
        return Err(format!("usage: {usage}"));
    };
    let selector = trimmed[..space].trim();
    let value = trimmed[space + 1..].trim();
    if selector.is_empty() || value.is_empty() {
        return Err(format!("usage: {usage}"));
    }
    Ok((selector.to_owned(), value.to_owned()))
}

fn parse_selector_and_timeout(
    input: &str,
    default_timeout_ms: u64,
) -> Result<(String, u64), String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("usage: wait <selector> [timeout_ms]".to_owned());
    }

    if let Some(rest) = trimmed.strip_prefix('"') {
        if let Some(end) = rest.find('"') {
            let selector = rest[..end].to_owned();
            let timeout = rest[end + 1..].trim();
            if timeout.is_empty() {
                return Ok((selector, default_timeout_ms));
            }
            return timeout
                .parse::<u64>()
                .map(|ms| (selector, ms))
                .map_err(|_| format!("invalid timeout_ms: {timeout}"));
        }
        return Err("unclosed quote in selector".to_owned());
    }

    let mut parts = trimmed.rsplitn(2, ' ');
    let last = parts.next().unwrap_or_default().trim();
    let rest = parts.next().unwrap_or_default().trim();
    if !rest.is_empty() {
        if let Ok(timeout_ms) = last.parse::<u64>() {
            return Ok((rest.to_owned(), timeout_ms));
        }
    }
    Ok((trimmed.to_owned(), default_timeout_ms))
}

fn parse_command_token(input: &str) -> Result<(String, &str), String> {
    let trimmed = input.trim_start();
    if trimmed.is_empty() {
        return Err("missing argument".to_owned());
    }

    if trimmed.starts_with('"') {
        let mut escaped = false;
        for (idx, ch) in trimmed.char_indices().skip(1) {
            if escaped {
                escaped = false;
                continue;
            }
            if ch == '\\' {
                escaped = true;
                continue;
            }
            if ch == '"' {
                let token = &trimmed[..=idx];
                let parsed = serde_json::from_str::<String>(token)
                    .map_err(|err| format!("invalid quoted argument: {err}"))?;
                let rest = trimmed[idx + 1..].trim_start();
                return Ok((parsed, rest));
            }
        }
        return Err("unclosed quote in argument".to_owned());
    }

    if let Some(space) = trimmed.find(char::is_whitespace) {
        Ok((trimmed[..space].to_owned(), trimmed[space..].trim_start()))
    } else {
        Ok((trimmed.to_owned(), ""))
    }
}

fn parse_selector_pair(input: &str, usage: &str) -> Result<(String, String), String> {
    let (first, rest) = parse_command_token(input).map_err(|err| format!("{usage}: {err}"))?;
    if first.is_empty() {
        return Err(format!("usage: {usage}"));
    }
    let (second, tail) = parse_command_token(rest).map_err(|err| format!("{usage}: {err}"))?;
    if second.is_empty() || !tail.trim().is_empty() {
        return Err(format!("usage: {usage}"));
    }
    Ok((first, second))
}

fn parse_selector_arg(input: &str, usage: &str) -> Result<String, String> {
    let (selector, tail) = parse_command_token(input).map_err(|err| format!("{usage}: {err}"))?;
    if selector.is_empty() || !tail.trim().is_empty() {
        return Err(format!("usage: {usage}"));
    }
    Ok(selector)
}

fn parse_xy_args(input: &str, usage: &str) -> Result<(f64, f64), String> {
    let parts: Vec<&str> = input.split_whitespace().collect();
    if parts.len() != 2 {
        return Err(format!("usage: {usage}"));
    }
    let x = parts[0]
        .parse::<f64>()
        .map_err(|_| "invalid x coordinate".to_owned())?;
    let y = parts[1]
        .parse::<f64>()
        .map_err(|_| "invalid y coordinate".to_owned())?;
    Ok((x, y))
}

fn parse_coords(coords: &str) -> Result<(f64, f64), String> {
    let parts: Vec<&str> = coords.split(',').collect();
    if let (Some(xs), Some(ys)) = (parts.first(), parts.get(1)) {
        if let (Ok(x), Ok(y)) = (xs.parse::<f64>(), ys.parse::<f64>()) {
            return Ok((x, y));
        }
    }
    Err(format!("bad coords {coords}"))
}

fn parse_rect(rect: &str) -> Result<(i64, i64, i64, i64), String> {
    let parts: Vec<&str> = rect.split(',').collect();
    if parts.len() != 4 {
        return Err(format!("bad rect {rect}"));
    }
    let x = parts[0]
        .parse::<i64>()
        .map_err(|_| format!("bad rect {rect}"))?;
    let y = parts[1]
        .parse::<i64>()
        .map_err(|_| format!("bad rect {rect}"))?;
    let w = parts[2]
        .parse::<i64>()
        .map_err(|_| format!("bad rect {rect}"))?;
    let h = parts[3]
        .parse::<i64>()
        .map_err(|_| format!("bad rect {rect}"))?;
    Ok((x, y, w, h))
}

fn current_url_for_webview(webview: &WKWebView) -> String {
    unsafe { webview.URL() }
        .and_then(|url| url.absoluteString())
        .map(|value| value.to_string())
        .unwrap_or_default()
}

fn url_host(url: &str) -> String {
    url.split("://")
        .nth(1)
        .unwrap_or("")
        .split('/')
        .next()
        .unwrap_or("")
        .split(':')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase()
}

fn matching_platform_index(url: &str) -> Option<usize> {
    let host = url_host(url);
    if host.is_empty() {
        return None;
    }
    TABS.iter().position(|tab| {
        let expected = url_host(tab.url);
        host == expected || host.ends_with(&format!(".{expected}"))
    })
}

fn wrapped_check_js(js: &str) -> String {
    let js_escaped = serde_json::to_string(js).unwrap_or_else(|_| "\"\"".to_owned());
    format!(
        "try{{var __r=eval({js_escaped});if(__r&&typeof __r.then==='function'){{window.__wpCheckStatus='pending';__r.then(function(v){{window.__wpCheckStatus=v==null?'null':String(v);}}).catch(function(){{window.__wpCheckStatus='error';}});'__wp_pending'}}else{{__r==null?'null':String(__r)}}}}catch(__e){{'error: '+__e.message}}"
    )
}

fn normalize_check_status(status: &str) -> String {
    let trimmed = status.trim();
    if trimmed.eq_ignore_ascii_case("alive") {
        "alive".to_owned()
    } else if trimmed.eq_ignore_ascii_case("expired") {
        "expired".to_owned()
    } else if trimmed == "__wp_pending" || trimmed.eq_ignore_ascii_case("pending") {
        "pending".to_owned()
    } else if trimmed.is_empty() || trimmed == "null" || trimmed.starts_with("error") {
        "expired".to_owned()
    } else {
        trimmed.to_owned()
    }
}

fn write_json_result(result_path: &str, value: serde_json::Value) {
    match serde_json::to_string(&value) {
        Ok(json) => {
            let _ = std::fs::write(result_path, json);
        }
        Err(err) => {
            let _ = std::fs::write(result_path, format!("error: {err}"));
        }
    }
}

fn write_check_result(result_path: &str, platform: &str, status: &str, url: Option<&str>) {
    let value = match url {
        Some(url) => serde_json::json!({
            "platform": platform,
            "status": status,
            "url": url,
        }),
        None => serde_json::json!({
            "platform": platform,
            "status": status,
        }),
    };
    write_json_result(result_path, value);
}

fn run_check_command(webview: &WKWebView, result_path: String) {
    let url = current_url_for_webview(webview);
    let Some(tab_index) = matching_platform_index(&url) else {
        write_check_result(&result_path, "unknown", "n/a", None);
        return;
    };

    let platform = TABS[tab_index].label.to_owned();
    let js = NSString::from_str(&wrapped_check_js(TABS[tab_index].check_session_js));
    let rp = result_path.clone();
    let url_for_result = url.clone();
    let platform_for_result = platform.clone();
    let wv_ptr = webview as *const WKWebView as usize;
    let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
        if !error.is_null() {
            write_check_result(&rp, &platform_for_result, "expired", Some(&url_for_result));
            return;
        }

        let raw = if result.is_null() {
            "expired".to_owned()
        } else {
            let s: &NSString = unsafe { &*(result as *const NSString) };
            s.to_string()
        };
        if raw == "__wp_pending" {
            let rp2 = rp.clone();
            let url2 = url_for_result.clone();
            let platform2 = platform_for_result.clone();
            dispatch::Queue::main().exec_after(std::time::Duration::from_secs(3), move || {
                let read_js = NSString::from_str("String(window.__wpCheckStatus||'pending')");
                let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                let handler2 = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
                    let status = if !error.is_null() || result.is_null() {
                        "expired".to_owned()
                    } else {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        normalize_check_status(&s.to_string())
                    };
                    write_check_result(&rp2, &platform2, &status, Some(&url2));
                });
                unsafe {
                    wv.evaluateJavaScript_completionHandler(&read_js, Some(&handler2));
                }
            });
            return;
        }

        let status = normalize_check_status(&raw);
        write_check_result(&rp, &platform_for_result, &status, Some(&url_for_result));
    });
    unsafe {
        webview.evaluateJavaScript_completionHandler(&js, Some(&handler));
    }
}

fn css_point(webview: &WKWebView, x: f64, y: f64) -> NSPoint {
    let frame = webview.frame();
    NSPoint::new(x, frame.size.height - y)
}

fn send_mouse_event(
    webview: &WKWebView,
    event_type: NSEventType,
    point: NSPoint,
    event_number: isize,
    click_count: isize,
    pressure: f32,
) -> Result<(), String> {
    let win_num = webview.window().map(|w| w.windowNumber()).unwrap_or(0);
    let event = NSEvent::mouseEventWithType_location_modifierFlags_timestamp_windowNumber_context_eventNumber_clickCount_pressure(
        event_type,
        point,
        NSEventModifierFlags::empty(),
        0.0,
        win_num,
        None,
        event_number,
        click_count,
        pressure,
    )
    .ok_or_else(|| format!("failed to create mouse event {event_type:?}"))?;

    catch_objc(|| match event_type {
        NSEventType::LeftMouseDown => {
            let _: () = unsafe { msg_send![webview, mouseDown: &*event] };
        }
        NSEventType::LeftMouseUp => {
            let _: () = unsafe { msg_send![webview, mouseUp: &*event] };
        }
        NSEventType::RightMouseDown => {
            let _: () = unsafe { msg_send![webview, rightMouseDown: &*event] };
        }
        NSEventType::RightMouseUp => {
            let _: () = unsafe { msg_send![webview, rightMouseUp: &*event] };
        }
        NSEventType::MouseMoved => {
            let _: () = unsafe { msg_send![webview, mouseMoved: &*event] };
        }
        NSEventType::LeftMouseDragged => {
            let _: () = unsafe { msg_send![webview, mouseDragged: &*event] };
        }
        _ => {}
    })
}

fn native_hover_at(webview: &WKWebView, x: f64, y: f64) -> Result<(), String> {
    send_mouse_event(
        webview,
        NSEventType::MouseMoved,
        css_point(webview, x, y),
        0,
        0,
        0.0,
    )
}

fn native_right_click_at(webview: &WKWebView, x: f64, y: f64) -> Result<(), String> {
    let point = css_point(webview, x, y);
    send_mouse_event(webview, NSEventType::RightMouseDown, point, 0, 1, 1.0)?;
    send_mouse_event(webview, NSEventType::RightMouseUp, point, 1, 1, 0.0)
}

fn native_double_click_at(webview: &WKWebView, x: f64, y: f64) -> Result<(), String> {
    let point = css_point(webview, x, y);
    send_mouse_event(webview, NSEventType::LeftMouseDown, point, 0, 1, 1.0)?;
    send_mouse_event(webview, NSEventType::LeftMouseUp, point, 1, 1, 0.0)?;
    std::thread::sleep(std::time::Duration::from_millis(50));
    send_mouse_event(webview, NSEventType::LeftMouseDown, point, 2, 2, 1.0)?;
    send_mouse_event(webview, NSEventType::LeftMouseUp, point, 3, 2, 0.0)
}

fn native_drag_at(
    webview: &WKWebView,
    from_x: f64,
    from_y: f64,
    to_x: f64,
    to_y: f64,
) -> Result<(), String> {
    let start = css_point(webview, from_x, from_y);
    let end = css_point(webview, to_x, to_y);
    send_mouse_event(webview, NSEventType::LeftMouseDown, start, 0, 1, 1.0)?;

    for step in 1..=10 {
        let t = step as f64 / 10.0;
        let point = NSPoint::new(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t,
        );
        send_mouse_event(
            webview,
            NSEventType::LeftMouseDragged,
            point,
            step as isize,
            1,
            1.0,
        )?;
        std::thread::sleep(std::time::Duration::from_millis(12));
    }

    send_mouse_event(webview, NSEventType::LeftMouseUp, end, 11, 1, 0.0)
}

fn find_element_pair_js(from_selector: &str, to_selector: &str) -> String {
    let from_lookup = element_lookup_snippet(from_selector);
    let to_lookup = element_lookup_snippet(to_selector);
    format!(
        "(function(){{try{{\
        {from_lookup}\
        if(!el)return 'from:not_found';\
        var __from_rect=el.getBoundingClientRect();\
        if(__from_rect.width<=0||__from_rect.height<=0)return 'from:not_found';\
        var __from=String(Math.round(__from_rect.x+__from_rect.width/2))+','+String(Math.round(__from_rect.y+__from_rect.height/2));\
        {to_lookup}\
        if(!el)return 'to:not_found';\
        var __to_rect=el.getBoundingClientRect();\
        if(__to_rect.width<=0||__to_rect.height<=0)return 'to:not_found';\
        var __to=String(Math.round(__to_rect.x+__to_rect.width/2))+','+String(Math.round(__to_rect.y+__to_rect.height/2));\
        return __from+'|'+__to;\
        }}catch(e){{return 'error: '+e.message;}}}})()"
    )
}

/// Send a native NSEvent mouse click at CSS coordinates (x, y) within the webview.
/// Produces isTrusted:true events that pass framework security checks.
fn native_click_at(webview: &WKWebView, x: f64, y: f64) {
    let frame = webview.frame();
    let jx = (jitter(0, 2, x as u64) as f64) - 1.0;
    let jy = (jitter(0, 2, y as u64) as f64) - 1.0;
    let point = NSPoint::new(x + jx, frame.size.height - y + jy);
    let win_num = webview.window().map(|w| w.windowNumber()).unwrap_or(0);

    let down = NSEvent::mouseEventWithType_location_modifierFlags_timestamp_windowNumber_context_eventNumber_clickCount_pressure(
        NSEventType::LeftMouseDown, point, NSEventModifierFlags::empty(),
        0.0, win_num, None, 0, 1, 1.0,
    );
    if let Some(event) = &down {
        let _ = catch_objc(|| {
            let _: () = unsafe { msg_send![webview, mouseDown: &**event] };
        });
    }
    let up = NSEvent::mouseEventWithType_location_modifierFlags_timestamp_windowNumber_context_eventNumber_clickCount_pressure(
        NSEventType::LeftMouseUp, point, NSEventModifierFlags::empty(),
        0.0, win_num, None, 0, 1, 0.0,
    );
    if let Some(event) = &up {
        let _ = catch_objc(|| {
            let _: () = unsafe { msg_send![webview, mouseUp: &**event] };
        });
    }
}

/// Paste text into the currently focused element via NSPasteboard + Cmd+V.
fn paste_text(webview: &WKWebView, text: &str) -> Result<(), String> {
    paste_text_native(webview, text)
}

fn parse_optional_tab_id(input: &str) -> Result<Option<usize>, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        Ok(None)
    } else {
        trimmed
            .parse::<usize>()
            .map(Some)
            .map_err(|_| format!("invalid tab id: {trimmed}"))
    }
}

fn parse_targeted_goto(input: &str) -> Option<(usize, &str)> {
    let trimmed = input.trim();
    let (first, rest) = trimmed.split_once(' ')?;
    let tab_id = first.parse::<usize>().ok()?;
    Some((tab_id, rest.trim()))
}

/// Executes a single automation command against the supplied webview and writes its result file.
/// Commands cover navigation, tab management, DOM interaction, and native input helpers.
pub(crate) fn run_command(
    webview: &WKWebView,
    cmd: &str,
    result_path: String,
    screenshot_path: String,
) {
    if cmd == "screenshot" {
        take_screenshot(webview, result_path, screenshot_path);
    } else if cmd == "check" {
        run_check_command(webview, result_path);
    } else if cmd == "tabs" {
        match serde_json::to_string_pretty(&all_tab_infos()) {
            Ok(json) => {
                let _ = std::fs::write(&result_path, json);
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(url) = cmd.strip_prefix("tab_new ") {
        match create_dynamic_tab(Some(url.trim()), true) {
            Ok(tab_id) => {
                let _ = std::fs::write(&result_path, format!("ok: created tab {tab_id}"));
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if cmd == "tab_new" {
        match create_dynamic_tab(Some("about:blank"), true) {
            Ok(tab_id) => {
                let _ = std::fs::write(&result_path, format!("ok: created tab {tab_id}"));
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(idx) = cmd.strip_prefix("tab_close ") {
        match idx.trim().parse::<usize>() {
            Ok(tab_id) => match close_tab(tab_id) {
                Ok(()) => {
                    let _ = std::fs::write(&result_path, format!("ok: closed tab {tab_id}"));
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            },
            Err(_) => {
                let _ = std::fs::write(&result_path, "error: invalid tab id");
            }
        }
    } else if let Some(url) = cmd.strip_prefix("goto ") {
        if let Some((tab_id, target_url)) = parse_targeted_goto(url) {
            match navigate_tab_to_url(tab_id, target_url) {
                Ok(()) => {
                    let _ = std::fs::write(
                        &result_path,
                        format!("ok: navigating tab {tab_id} to {target_url}"),
                    );
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            }
        } else {
            match navigate_active_input(url.trim()) {
                Ok(tab_id) => {
                    let _ = std::fs::write(&result_path, format!("ok: navigating tab {tab_id}"));
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            }
        }
    } else if let Some(idx) = cmd.strip_prefix("tab ") {
        if let Ok(i) = idx.trim().parse::<usize>() {
            switch_tab(i);
            let _ = std::fs::write(&result_path, format!("ok: switched to tab {i}"));
        }
    } else if cmd == "back" {
        match go_back(None) {
            Ok(()) => {
                let _ = std::fs::write(&result_path, "ok: back");
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(idx) = cmd.strip_prefix("back ") {
        match parse_optional_tab_id(idx) {
            Ok(target) => match go_back(target) {
                Ok(()) => {
                    let _ = std::fs::write(&result_path, "ok: back");
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            },
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if cmd == "forward" {
        match go_forward(None) {
            Ok(()) => {
                let _ = std::fs::write(&result_path, "ok: forward");
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(idx) = cmd.strip_prefix("forward ") {
        match parse_optional_tab_id(idx) {
            Ok(target) => match go_forward(target) {
                Ok(()) => {
                    let _ = std::fs::write(&result_path, "ok: forward");
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            },
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if cmd == "reload" {
        match reload_tab(None) {
            Ok(()) => {
                let _ = std::fs::write(&result_path, "ok: reloading");
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(idx) = cmd.strip_prefix("reload ") {
        match parse_optional_tab_id(idx) {
            Ok(target) => match reload_tab(target) {
                Ok(()) => {
                    let _ = std::fs::write(&result_path, "ok: reloading");
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            },
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if cmd == "reload_all" {
        for tab_id in all_tab_ids() {
            if let Err(err) = reload_tab(Some(tab_id)) {
                crate::state::log_crash("WARN", "reload_all", &err);
            }
        }
        let _ = std::fs::write(&result_path, format!("ok: reloading all tabs"));
    } else if let Some(text) = cmd.strip_prefix("paste ") {
        // Write to system clipboard, then paste via a native Cmd+V NSEvent.
        if let Err(err) = paste_text(webview, text) {
            crate::state::log_crash("WARN", "commands", &format!("paste: {err}"));
            let _ = std::fs::write(&result_path, format!("error: {err}"));
        } else {
            let _ = std::fs::write(&result_path, format!("ok: pasted {} chars", text.len()));
        }
    } else if cmd == "focus" {
        // Make window key (for CGEventPostToPid to know which window to target)
        if let Some(window) = webview.window() {
            window.makeKeyAndOrderFront(None);
        }
        let _ = std::fs::write(&result_path, "ok: focused");
    } else if let Some(tag) = cmd.strip_prefix("addtag ") {
        // Atomic tag: JS locates #添加话题, then native click + native key events.
        add_tag(webview, tag.trim(), &result_path);
    } else if let Some(text) = cmd.strip_prefix("type ") {
        type_text_native(webview, text, &result_path);
    } else if cmd == "movetoend" {
        // Move cursor to end of line via NSResponder action — no scrolling, no focus steal.
        // Wrapped in exception::catch because firstResponder may not support this selector.
        let msg = if let Some(window) = webview.window() {
            if let Some(responder) = window.firstResponder() {
                match catch_objc(|| {
                    let _: () = unsafe {
                        msg_send![&*responder, moveToEndOfLine: std::ptr::null::<AnyObject>()]
                    };
                }) {
                    Ok(()) => "ok: movetoend".to_owned(),
                    Err(e) => {
                        crate::state::log_crash("WARN", "commands", &format!("movetoend: {e}"));
                        "ok: movetoend".to_owned()
                    }
                }
            } else {
                "ok: movetoend (no responder)".to_owned()
            }
        } else {
            "ok: movetoend (no window)".to_owned()
        };
        let _ = std::fs::write(&result_path, msg);
    } else if let Some(key) = cmd.strip_prefix("key ") {
        if let Some(idx) = tab_index_for_webview(webview) {
            switch_tab(idx);
        }
        let key = key.trim();
        match send_key_command(webview, key) {
            Ok(()) => {
                let _ = std::fs::write(&result_path, format!("ok: key {key}"));
            }
            Err(err) => {
                crate::state::log_crash("WARN", "commands", &format!("key {key}: {err}"));
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(coords) = cmd.strip_prefix("hover_xy ") {
        match parse_xy_args(coords.trim(), "hover_xy x y") {
            Ok((x, y)) => match native_hover_at(webview, x, y) {
                Ok(()) => {
                    let _ = std::fs::write(&result_path, format!("ok: hovered {x},{y}"));
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            },
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(coords) = cmd.strip_prefix("dblclick_xy ") {
        match parse_xy_args(coords.trim(), "dblclick_xy x y") {
            Ok((x, y)) => match native_double_click_at(webview, x, y) {
                Ok(()) => {
                    let _ = std::fs::write(&result_path, format!("ok: double-clicked {x},{y}"));
                }
                Err(err) => {
                    let _ = std::fs::write(&result_path, format!("error: {err}"));
                }
            },
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(coords) = cmd.strip_prefix("click ") {
        // click x y — send a real NSEvent mouse click at CSS coordinates within the webview.
        let parts: Vec<&str> = coords.trim().split_whitespace().collect();
        if parts.len() >= 2 {
            if let (Ok(x), Ok(y)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
                native_click_at(webview, x, y);
                let _ = std::fs::write(&result_path, format!("ok: clicked {x},{y}"));
            } else {
                let _ = std::fs::write(&result_path, "error: invalid coordinates");
            }
        } else {
            let _ = std::fs::write(&result_path, "error: usage: click x y");
        }
    } else if let Some(selector) = cmd.strip_prefix("hover ") {
        match parse_selector_arg(selector, "hover <selector>") {
            Ok(selector) => {
                let result_path_clone = result_path.clone();
                let wv_ptr = webview as *const WKWebView as usize;
                let js_str = NSString::from_str(&find_element_js(&selector));
                let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
                    let coords = if !result.is_null() {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        format!("{s}")
                    } else {
                        "null".to_owned()
                    };
                    if coords == "not_found" || coords.starts_with("error") || coords == "null" {
                        let _ =
                            std::fs::write(&result_path_clone, format!("error: element {coords}"));
                        return;
                    }
                    match parse_coords(&coords) {
                        Ok((x, y)) => {
                            let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                            match native_hover_at(wv, x, y) {
                                Ok(()) => {
                                    let _ = std::fs::write(
                                        &result_path_clone,
                                        format!("ok: hovered element at {x},{y}"),
                                    );
                                }
                                Err(err) => {
                                    let _ =
                                        std::fs::write(&result_path_clone, format!("error: {err}"));
                                }
                            }
                        }
                        Err(err) => {
                            let _ = std::fs::write(&result_path_clone, format!("error: {err}"));
                        }
                    }
                });
                unsafe {
                    webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
                }
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(selector) = cmd.strip_prefix("dblclick ") {
        match parse_selector_arg(selector, "dblclick <selector>") {
            Ok(selector) => {
                let result_path_clone = result_path.clone();
                let wv_ptr = webview as *const WKWebView as usize;
                let js_str = NSString::from_str(&find_element_js(&selector));
                let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
                    let coords = if !result.is_null() {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        format!("{s}")
                    } else {
                        "null".to_owned()
                    };
                    if coords == "not_found" || coords.starts_with("error") || coords == "null" {
                        let _ =
                            std::fs::write(&result_path_clone, format!("error: element {coords}"));
                        return;
                    }
                    match parse_coords(&coords) {
                        Ok((x, y)) => {
                            let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                            match native_double_click_at(wv, x, y) {
                                Ok(()) => {
                                    let _ = std::fs::write(
                                        &result_path_clone,
                                        format!("ok: double-clicked element at {x},{y}"),
                                    );
                                }
                                Err(err) => {
                                    let _ =
                                        std::fs::write(&result_path_clone, format!("error: {err}"));
                                }
                            }
                        }
                        Err(err) => {
                            let _ = std::fs::write(&result_path_clone, format!("error: {err}"));
                        }
                    }
                });
                unsafe {
                    webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
                }
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(selector) = cmd.strip_prefix("rightclick ") {
        match parse_selector_arg(selector, "rightclick <selector>") {
            Ok(selector) => {
                let result_path_clone = result_path.clone();
                let wv_ptr = webview as *const WKWebView as usize;
                let js_str = NSString::from_str(&find_element_js(&selector));
                let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
                    let coords = if !result.is_null() {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        format!("{s}")
                    } else {
                        "null".to_owned()
                    };
                    if coords == "not_found" || coords.starts_with("error") || coords == "null" {
                        let _ =
                            std::fs::write(&result_path_clone, format!("error: element {coords}"));
                        return;
                    }
                    match parse_coords(&coords) {
                        Ok((x, y)) => {
                            let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                            match native_right_click_at(wv, x, y) {
                                Ok(()) => {
                                    let _ = std::fs::write(
                                        &result_path_clone,
                                        format!("ok: right-clicked element at {x},{y}"),
                                    );
                                }
                                Err(err) => {
                                    let _ =
                                        std::fs::write(&result_path_clone, format!("error: {err}"));
                                }
                            }
                        }
                        Err(err) => {
                            let _ = std::fs::write(&result_path_clone, format!("error: {err}"));
                        }
                    }
                });
                unsafe {
                    webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
                }
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(rest) = cmd.strip_prefix("drag ") {
        match parse_selector_pair(rest, "drag <from_selector> <to_selector>") {
            Ok((from_selector, to_selector)) => {
                let result_path_clone = result_path.clone();
                let wv_ptr = webview as *const WKWebView as usize;
                let js_str =
                    NSString::from_str(&find_element_pair_js(&from_selector, &to_selector));
                let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
                    let coords = if !result.is_null() {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        format!("{s}")
                    } else {
                        "null".to_owned()
                    };
                    if coords == "null"
                        || coords.starts_with("error")
                        || coords == "from:not_found"
                        || coords == "to:not_found"
                    {
                        let _ =
                            std::fs::write(&result_path_clone, format!("error: element {coords}"));
                        return;
                    }
                    let parts: Vec<&str> = coords.split('|').collect();
                    if let (Some(from_coords), Some(to_coords)) = (parts.first(), parts.get(1)) {
                        match (parse_coords(from_coords), parse_coords(to_coords)) {
                            (Ok((from_x, from_y)), Ok((to_x, to_y))) => {
                                let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                                match native_drag_at(wv, from_x, from_y, to_x, to_y) {
                                    Ok(()) => {
                                        let _ = std::fs::write(
                                            &result_path_clone,
                                            format!(
                                                "ok: dragged from {from_x},{from_y} to {to_x},{to_y}"
                                            ),
                                        );
                                    }
                                    Err(err) => {
                                        let _ = std::fs::write(
                                            &result_path_clone,
                                            format!("error: {err}"),
                                        );
                                    }
                                }
                            }
                            _ => {
                                let _ = std::fs::write(
                                    &result_path_clone,
                                    format!("error: bad coords {coords}"),
                                );
                            }
                        }
                        return;
                    }
                    let _ =
                        std::fs::write(&result_path_clone, format!("error: bad coords {coords}"));
                });
                unsafe {
                    webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
                }
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(selector) = cmd.strip_prefix("screenshot_el ") {
        match parse_selector_arg(selector, "screenshot_el <selector>") {
            Ok(selector) => {
                let result_path_clone = result_path.clone();
                let screenshot_path_clone = screenshot_path.clone();
                let wv_ptr = webview as *const WKWebView as usize;
                let js = element_query_js(
                    &selector,
                    "var r=el.getBoundingClientRect();\
                    if(r.width<=0||r.height<=0)return '__NOT_FOUND__';\
                    return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)].join(',');",
                    "'__NOT_FOUND__'",
                );
                let js_str = NSString::from_str(&js);
                let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
                    if !error.is_null() {
                        let err = unsafe { &*error };
                        let _ = std::fs::write(
                            &result_path_clone,
                            format!("error: {}", err.localizedDescription()),
                        );
                        return;
                    }
                    let rect = if result.is_null() {
                        "null".to_owned()
                    } else {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        s.to_string()
                    };
                    if rect == "__NOT_FOUND__" || rect == "null" || rect.starts_with("error") {
                        let _ =
                            std::fs::write(&result_path_clone, format!("error: element {rect}"));
                        return;
                    }
                    match parse_rect(&rect) {
                        Ok((x, y, w, h)) => {
                            let rp = result_path_clone.clone();
                            let message = format!("ok: {x},{y},{w},{h}");
                            let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                            take_screenshot_with_callback(
                                wv,
                                screenshot_path_clone.clone(),
                                move |result| match result {
                                    Ok(_) => {
                                        let _ = std::fs::write(&rp, &message);
                                    }
                                    Err(err) => {
                                        let _ = std::fs::write(&rp, format!("error: {err}"));
                                    }
                                },
                            );
                        }
                        Err(err) => {
                            let _ = std::fs::write(&result_path_clone, format!("error: {err}"));
                        }
                    }
                });
                unsafe {
                    webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
                }
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(selector) = cmd.strip_prefix("clickel ") {
        // clickel <css_selector_or_text:xxx> — find element (incl. Shadow DOM), native click.
        let selector = selector.trim().to_owned();
        let result_path_clone = result_path.clone();
        let wv_ptr = webview as *const WKWebView as usize;
        let js_str = NSString::from_str(&find_element_js(&selector));

        let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
            let coords = if !result.is_null() {
                let s: &NSString = unsafe { &*(result as *const NSString) };
                format!("{s}")
            } else {
                "null".to_owned()
            };
            if coords == "not_found" || coords.starts_with("error") || coords == "null" {
                let _ = std::fs::write(&result_path_clone, format!("error: element {coords}"));
                return;
            }
            let parts: Vec<&str> = coords.split(',').collect();
            if let (Some(xs), Some(ys)) = (parts.first(), parts.get(1)) {
                if let (Ok(x), Ok(y)) = (xs.parse::<f64>(), ys.parse::<f64>()) {
                    let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                    native_click_at(wv, x, y);
                    let _ = std::fs::write(
                        &result_path_clone,
                        format!("ok: clicked element at {x},{y}"),
                    );
                    return;
                }
            }
            let _ = std::fs::write(&result_path_clone, format!("error: bad coords {coords}"));
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
        }
    } else if let Some(rest) = cmd.strip_prefix("inputel ") {
        // inputel <selector> <text> — find element (incl. Shadow DOM), native click for focus, paste.
        let rest = rest.trim();
        let (selector, text) = if rest.starts_with('"') {
            if let Some(end) = rest[1..].find('"') {
                (
                    rest[1..1 + end].to_owned(),
                    rest[1 + end + 1..].trim().to_owned(),
                )
            } else {
                let _ = std::fs::write(&result_path, "error: unclosed quote in selector");
                return;
            }
        } else if let Some(space) = rest.find(' ') {
            (rest[..space].to_owned(), rest[space + 1..].to_owned())
        } else {
            let _ = std::fs::write(&result_path, "error: usage: inputel <selector> <text>");
            return;
        };

        let text_for_paste = text;
        let result_path_clone = result_path.clone();
        let wv_ptr = webview as *const WKWebView as usize;
        let js_str = NSString::from_str(&find_element_js(&selector));

        let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
            let coords = if !result.is_null() {
                let s: &NSString = unsafe { &*(result as *const NSString) };
                format!("{s}")
            } else {
                "null".to_owned()
            };
            if coords == "not_found" || coords.starts_with("error") || coords == "null" {
                let _ = std::fs::write(&result_path_clone, format!("error: element {coords}"));
                return;
            }
            let parts: Vec<&str> = coords.split(',').collect();
            if let (Some(xs), Some(ys)) = (parts.first(), parts.get(1)) {
                if let (Ok(x), Ok(y)) = (xs.parse::<f64>(), ys.parse::<f64>()) {
                    let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                    native_click_at(wv, x, y);
                    std::thread::sleep(std::time::Duration::from_millis(200));
                    match paste_text(wv, &text_for_paste) {
                        Ok(()) => {
                            let _ = std::fs::write(
                                &result_path_clone,
                                format!(
                                    "ok: inputel at {x},{y} pasted {} chars",
                                    text_for_paste.len()
                                ),
                            );
                        }
                        Err(err) => {
                            let _ = std::fs::write(&result_path_clone, format!("error: {err}"));
                        }
                    }
                    return;
                }
            }
            let _ = std::fs::write(&result_path_clone, format!("error: bad coords {coords}"));
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
        }
    } else if let Some(words) = cmd.strip_prefix("dismiss ") {
        // dismiss word1,word2,word3 — click ALL visible elements matching any of the words.
        // Uses native NSEvent click (isTrusted:true) for each match.
        // Words are comma-separated. Matches textContent.trim() of buttons/spans/divs.
        let words = words.trim();
        let words_json = serde_json::to_string(words).unwrap_or_else(|_| "\"\"".to_owned());
        // JS: find all matching elements, return their center coordinates as array
        let js = format!(
            "try{{var words={wj}.split(',').map(function(w){{return w.trim()}});var coords=[];document.querySelectorAll('button,span,div').forEach(function(e){{var t=e.textContent.trim();if(words.indexOf(t)>=0&&e.offsetWidth>0&&e.offsetHeight<80&&e.childElementCount<=3){{var r=e.getBoundingClientRect();coords.push(Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2))}}}});coords.join('|')}}catch(e){{'error:'+e.message}}",
            wj = words_json
        );
        let rp = result_path.clone();
        let wv_ptr = webview as *const WKWebView as usize;
        let js_str = NSString::from_str(&js);
        let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
            let coords_str = if !result.is_null() {
                let s: &NSString = unsafe { &*(result as *const NSString) };
                format!("{s}")
            } else {
                String::new()
            };

            if coords_str.is_empty() || coords_str.starts_with("error") {
                let _ = std::fs::write(&rp, format!("ok: dismissed 0"));
                return;
            }

            let wv = unsafe { &*(wv_ptr as *const WKWebView) };
            let mut count = 0;
            for coord in coords_str.split('|') {
                let parts: Vec<&str> = coord.split(',').collect();
                if parts.len() == 2 {
                    if let (Ok(x), Ok(y)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
                        native_click_at(wv, x, y);
                        count += 1;
                        // Small delay between clicks
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    }
                }
            }
            let _ = std::fs::write(&rp, format!("ok: dismissed {count}"));
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
        }
    } else if let Some(selector) = cmd.strip_prefix("focusel ") {
        // focusel <selector> — find element (incl. Shadow DOM), native click for real focus, no input.
        let selector = selector.trim().to_owned();
        let result_path_clone = result_path.clone();
        let wv_ptr = webview as *const WKWebView as usize;
        let js_str = NSString::from_str(&find_element_js(&selector));

        let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
            let coords = if !result.is_null() {
                let s: &NSString = unsafe { &*(result as *const NSString) };
                format!("{s}")
            } else {
                "null".to_owned()
            };
            if coords == "not_found" || coords.starts_with("error") || coords == "null" {
                let _ = std::fs::write(&result_path_clone, format!("error: element {coords}"));
                return;
            }
            let parts: Vec<&str> = coords.split(',').collect();
            if let (Some(xs), Some(ys)) = (parts.first(), parts.get(1)) {
                if let (Ok(x), Ok(y)) = (xs.parse::<f64>(), ys.parse::<f64>()) {
                    let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                    native_click_at(wv, x, y);
                    let _ = std::fs::write(&result_path_clone, format!("ok: focused at {x},{y}"));
                    return;
                }
            }
            let _ = std::fs::write(&result_path_clone, format!("error: bad coords {coords}"));
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
        }
    } else if let Some(selector) = cmd.strip_prefix("scrollel ") {
        // scrollel <selector> — scroll element into view via JS scrollIntoView.
        let selector = selector.trim();
        let sel_escaped = serde_json::to_string(selector).unwrap_or_else(|_| "\"\"".to_owned());
        let js = format!(
            "try{{var el=document.querySelector({se});if(!el){{var w=document.querySelector('wujie-app');if(w&&w.shadowRoot)el=w.shadowRoot.querySelector({se});}}if(el){{el.scrollIntoView({{block:'center',behavior:'smooth'}});'ok: scrolled'}}else{{'not_found'}}}}catch(e){{'error: '+e.message}}",
            se = sel_escaped
        );
        eval_js(webview, &js, result_path);
    } else if let Some(selector) = cmd.strip_prefix("exists ") {
        let selector = selector.trim();
        let js = element_query_js(selector, "return 'true';", "'false'");
        eval_js(webview, &js, result_path);
    } else if let Some(selector) = cmd.strip_prefix("visible ") {
        let selector = selector.trim();
        let js = element_query_js(
            selector,
            "var r=el.getBoundingClientRect();\
            var s=window.getComputedStyle(el);\
            var visible=r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.bottom>=0&&r.right>=0&&r.top<=window.innerHeight&&r.left<=window.innerWidth;\
            return visible?'true':'false';",
            "'false'",
        );
        eval_js(webview, &js, result_path);
    } else if let Some(rest) = cmd.strip_prefix("attr ") {
        match parse_selector_and_value(rest, "attr <selector> <attribute>") {
            Ok((selector, attr)) => {
                let attr_json = serde_json::to_string(&attr).unwrap_or_else(|_| "\"\"".to_owned());
                let js = element_query_js(
                    &selector,
                    &format!("var v=el.getAttribute({attr_json});return v==null?'null':String(v);"),
                    "'__NOT_FOUND__'",
                );
                eval_js(webview, &js, result_path);
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(selector) = cmd.strip_prefix("count ") {
        let selector = selector.trim();
        if let Some(text) = selector.strip_prefix("text:") {
            let text_json = serde_json::to_string(text).unwrap_or_else(|_| "\"\"".to_owned());
            let js = format!(
                "(function(){{try{{\
                var __needle={text_json};\
                var __roots=[document];\
                document.querySelectorAll('wujie-app').forEach(function(__host){{if(__host.shadowRoot)__roots.push(__host.shadowRoot);}});\
                var __count=0;\
                for(var __r=0;__r<__roots.length;__r++){{\
                    var __all=__roots[__r].querySelectorAll('*');\
                    for(var __i=0;__i<__all.length;__i++){{\
                        var __candidate=__all[__i];\
                        var __text=(__candidate.textContent||'').trim();\
                        if(__text&&(__text===__needle||__text.indexOf(__needle)===0))__count++;\
                    }}\
                }}\
                return String(__count);\
                }}catch(e){{return 'error: '+e.message;}}}})()"
            );
            eval_js(webview, &js, result_path);
        } else {
            let selector_json =
                serde_json::to_string(selector).unwrap_or_else(|_| "\"\"".to_owned());
            let js = format!(
                "(function(){{try{{\
                var __selector={selector_json};\
                var __roots=[document];\
                document.querySelectorAll('wujie-app').forEach(function(__host){{if(__host.shadowRoot)__roots.push(__host.shadowRoot);}});\
                var __count=0;\
                for(var __r=0;__r<__roots.length;__r++){{__count+=__roots[__r].querySelectorAll(__selector).length;}}\
                return String(__count);\
                }}catch(e){{return 'error: '+e.message;}}}})()"
            );
            eval_js(webview, &js, result_path);
        }
    } else if let Some(selector) = cmd.strip_prefix("htmlel ") {
        let selector = selector.trim();
        let js = element_query_js(
            selector,
            "return el.innerHTML==null?'null':String(el.innerHTML);",
            "'__NOT_FOUND__'",
        );
        eval_js(webview, &js, result_path);
    } else if let Some(selector) = cmd.strip_prefix("readel ") {
        // readel <selector> — read element's visible text content.
        // Returns trimmed textContent. Supports Shadow DOM.
        let selector = selector.trim();
        let js = element_query_js(
            selector,
            "return (el.textContent||'').trim();",
            "'__NOT_FOUND__'",
        );
        eval_js(webview, &js, result_path);
    } else if let Some(rest) = cmd.strip_prefix("wait ") {
        match parse_selector_and_timeout(rest, 5000) {
            Ok((selector, timeout_ms)) => {
                waitfor_element(webview, &selector, timeout_ms, result_path);
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if let Some(rest) = cmd.strip_prefix("waitfor ") {
        // waitfor <selector> [timeout_ms] — poll until element appears or timeout
        match parse_selector_and_timeout(rest, 5000) {
            Ok((selector, timeout_ms)) => {
                waitfor_element(webview, &selector, timeout_ms, result_path);
            }
            Err(err) => {
                let _ = std::fs::write(&result_path, format!("error: {err}"));
            }
        }
    } else if cmd == "url" {
        eval_js(webview, "window.location.href||''", result_path);
    } else if cmd == "title" {
        eval_js(webview, "document.title||''", result_path);
    } else if cmd == "text" {
        // text — dump visible text to /tmp/wp-text-{tab}.txt for offline parsing.
        // Lighter than html, just document.body.innerText.
        let tab_idx = tab_index_for_webview(webview).unwrap_or(0);
        let text_path = format!("/tmp/wp-text-{tab_idx}.txt");
        let tp = text_path.clone();
        let rp = result_path.clone();
        let js_str = NSString::from_str("document.body.innerText");
        let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
            if !error.is_null() {
                let err = unsafe { &*error };
                let _ = std::fs::write(&rp, format!("error: {}", err.localizedDescription()));
                return;
            }
            if result.is_null() {
                let _ = std::fs::write(&rp, "error: null");
                return;
            }
            let s: &NSString = unsafe { &*(result as *const NSString) };
            let text = format!("{s}");
            match std::fs::write(&tp, &text) {
                Ok(()) => {
                    let _ = std::fs::write(&rp, format!("ok: {} ({} bytes)", tp, text.len()));
                }
                Err(e) => {
                    let _ = std::fs::write(&rp, format!("error: write: {e}"));
                }
            }
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
        }
    } else if cmd == "text_shadow" {
        // text_shadow — dump text including Shadow DOM content.
        let tab_idx = tab_index_for_webview(webview).unwrap_or(0);
        let text_path = format!("/tmp/wp-text-{tab_idx}.txt");
        let tp = text_path.clone();
        let rp = result_path.clone();
        let js = NSString::from_str(
            "(function(){var t=document.body.innerText;var apps=document.querySelectorAll('wujie-app');for(var i=0;i<apps.length;i++){if(apps[i].shadowRoot){var el=apps[i].shadowRoot.querySelector('div');if(el)t+='\\n---SHADOW---\\n'+el.innerText;}}return t;})()",
        );
        let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
            if !error.is_null() {
                let err = unsafe { &*error };
                let _ = std::fs::write(&rp, format!("error: {}", err.localizedDescription()));
                return;
            }
            if result.is_null() {
                let _ = std::fs::write(&rp, "error: null");
                return;
            }
            let s: &NSString = unsafe { &*(result as *const NSString) };
            let text = format!("{s}");
            match std::fs::write(&tp, &text) {
                Ok(()) => {
                    let _ = std::fs::write(&rp, format!("ok: {} ({} bytes)", tp, text.len()));
                }
                Err(e) => {
                    let _ = std::fs::write(&rp, format!("error: write: {e}"));
                }
            }
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js, Some(&handler));
        }
    } else if cmd == "html" {
        // html — dump rendered DOM to /tmp/wp-html-{tab}.html for offline parsing.
        // Single read-only JS call, no injection, no behavior change.
        let tab_idx = tab_index_for_webview(webview).unwrap_or(0);
        let html_path = format!("/tmp/wp-html-{tab_idx}.html");
        let hp = html_path.clone();
        let rp = result_path.clone();
        let js_str = NSString::from_str("document.documentElement.outerHTML");
        let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
            if !error.is_null() {
                let err = unsafe { &*error };
                let _ = std::fs::write(&rp, format!("error: {}", err.localizedDescription()));
                return;
            }
            if result.is_null() {
                let _ = std::fs::write(&rp, "error: null result");
                return;
            }
            let s: &NSString = unsafe { &*(result as *const NSString) };
            let html = format!("{s}");
            match std::fs::write(&hp, &html) {
                Ok(()) => {
                    let _ = std::fs::write(&rp, format!("ok: {} ({} bytes)", hp, html.len()));
                }
                Err(e) => {
                    let _ = std::fs::write(&rp, format!("error: write failed: {e}"));
                }
            }
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
        }
    } else if cmd == "html_shadow" {
        // html_shadow — dump Shadow DOM content (for 视频号 wujie-app).
        // Gets main HTML + all shadow roots' innerHTML.
        let tab_idx = tab_index_for_webview(webview).unwrap_or(0);
        let html_path = format!("/tmp/wp-html-{tab_idx}.html");
        let hp = html_path.clone();
        let rp = result_path.clone();
        let shadow_js = NSString::from_str(
            "(function(){var h=document.documentElement.outerHTML;var apps=document.querySelectorAll('wujie-app');for(var i=0;i<apps.length;i++){if(apps[i].shadowRoot){h+='\\n<!-- SHADOW_ROOT_'+i+' -->\\n'+apps[i].shadowRoot.innerHTML;}}return h;})()",
        );
        let handler = RcBlock::new(move |result: *mut AnyObject, error: *mut NSError| {
            if !error.is_null() {
                let err = unsafe { &*error };
                let _ = std::fs::write(&rp, format!("error: {}", err.localizedDescription()));
                return;
            }
            if result.is_null() {
                let _ = std::fs::write(&rp, "error: null result");
                return;
            }
            let s: &NSString = unsafe { &*(result as *const NSString) };
            let html = format!("{s}");
            match std::fs::write(&hp, &html) {
                Ok(()) => {
                    let _ = std::fs::write(&rp, format!("ok: {} ({} bytes)", hp, html.len()));
                }
                Err(e) => {
                    let _ = std::fs::write(&rp, format!("error: write failed: {e}"));
                }
            }
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(&shadow_js, Some(&handler));
        }
    } else if let Some(rest) = cmd.strip_prefix("log ") {
        // log type:platform:details — append to activity log
        let parts: Vec<&str> = rest.splitn(3, ':').collect();
        let (event_type, platform, details) = match parts.len() {
            3 => (parts[0].trim(), parts[1].trim(), parts[2].trim()),
            2 => (parts[0].trim(), parts[1].trim(), ""),
            _ => ("event", rest.trim(), ""),
        };
        crate::state::log_activity(event_type, platform, details);
        let _ = std::fs::write(&result_path, format!("ok: logged {event_type}:{platform}"));
    } else if let Some(rest) = cmd.strip_prefix("stats ") {
        // stats N — read last N activity log entries
        let n: usize = rest.trim().parse().unwrap_or(20);
        let log = crate::state::read_activity_log(n);
        let _ = std::fs::write(&result_path, format!("ok: {log}"));
    } else {
        eval_js(webview, cmd, result_path);
    }
}

/// Poll webview for a CSS selector to match a visible element.
/// Returns element's trimmed textContent on success, or "error: timeout" on expiry.
fn waitfor_element(webview: &WKWebView, selector: &str, timeout_ms: u64, result_path: String) {
    let check_js = element_query_js(
        selector,
        "var text=(el.textContent||'').trim().substring(0,100);return text||'(found)';",
        "null",
    );
    let interval_ms: u64 = 300;
    let max_attempts = (timeout_ms / interval_ms).max(1);
    let wv_ptr = webview as *const WKWebView as usize;
    let res_path = result_path;

    // Schedule first check
    fn schedule_check(
        wv_ptr: usize,
        js: String,
        res_path: String,
        attempt: u64,
        max: u64,
        interval_ms: u64,
    ) {
        dispatch::Queue::main().exec_after(
            std::time::Duration::from_millis(interval_ms),
            move || {
                let webview = unsafe { &*(wv_ptr as *const WKWebView) };
                let rp = res_path.clone();
                let js_clone = js.clone();
                let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
                    let found = if !result.is_null() {
                        let s: &NSString = unsafe { &*(result as *const NSString) };
                        let text = format!("{s}");
                        if text != "null" { Some(text) } else { None }
                    } else {
                        None
                    };
                    if let Some(text) = found {
                        let _ = std::fs::write(&rp, format!("ok: {text}"));
                    } else if attempt >= max {
                        let _ = std::fs::write(&rp, "error: timeout");
                    } else {
                        schedule_check(wv_ptr, js_clone.clone(), rp.clone(), attempt + 1, max, interval_ms);
                    }
                });
                // Use the same eval wrapper to ensure string result
                let wrapped = format!(
                    "try{{var __r=eval({});__r==null?'null':String(__r)}}catch(__e){{'error: '+__e.message}}",
                    serde_json::to_string(js.as_str()).unwrap_or_else(|_| "\"\"".to_owned())
                );
                let wrapped_str = NSString::from_str(&wrapped);
                unsafe {
                    webview.evaluateJavaScript_completionHandler(&wrapped_str, Some(&handler));
                }
            },
        );
    }

    schedule_check(wv_ptr, check_js, res_path, 0, max_attempts, interval_ms);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn element_lookup_snippet_builds_text_lookup_js() {
        let snippet = element_lookup_snippet("text:Submit");

        assert_eq!(snippet.contains("var __needle=\"Submit\";"), true);
        assert_eq!(snippet.contains("var __matchText=function"), true);
        assert_eq!(snippet.contains("var __selector="), false);
    }

    #[test]
    fn element_lookup_snippet_builds_css_lookup_js() {
        let snippet = element_lookup_snippet("#submit-button");

        assert_eq!(snippet.contains("var __selector=\"#submit-button\";"), true);
        assert_eq!(snippet.contains("querySelector(__selector)"), true);
        assert_eq!(snippet.contains("var __needle="), false);
    }

    #[test]
    fn parse_selector_and_value_parses_quoted_input() {
        assert_eq!(
            parse_selector_and_value("\"text:Save draft\" hello world", "usage"),
            Ok(("text:Save draft".to_owned(), "hello world".to_owned()))
        );
    }

    #[test]
    fn parse_selector_and_value_parses_unquoted_input() {
        assert_eq!(
            parse_selector_and_value("button.primary hello", "usage"),
            Ok(("button.primary".to_owned(), "hello".to_owned()))
        );
    }
}
