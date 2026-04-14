use block2::RcBlock;
use std::ffi::c_ushort;
use std::panic::AssertUnwindSafe;
use std::ptr::{NonNull, null_mut};

use objc2::msg_send;
use objc2::rc::Retained;
use objc2::runtime::AnyObject;
use objc2_app_kit::{NSEvent, NSEventMask, NSEventModifierFlags, NSEventType};
use objc2_foundation::{NSError, NSPoint, NSString};
use objc2_web_kit::WKWebView;

use crate::state::{APP_STATE, close_tab, create_dynamic_tab, switch_tab};

/// Run an Obj-C call that might throw. Prevents crash from foreign exceptions in deferred closures.
fn catch_objc(f: impl FnOnce()) -> Result<(), String> {
    let result = unsafe { objc2::exception::catch(AssertUnwindSafe(f)) };
    result.map_err(|e| format!("ObjC exception: {e:?}"))
}

fn visible_tab_ids() -> Vec<usize> {
    let Some(state) = APP_STATE.get() else {
        return Vec::new();
    };
    let Ok(tabs) = state.browser_tabs.lock() else {
        return Vec::new();
    };
    tabs.iter()
        .filter(|tab| tab.visible)
        .map(|tab| tab.id)
        .collect()
}

fn shortcut_tab_target(keycode: c_ushort) -> Option<usize> {
    let visible = visible_tab_ids();
    match keycode {
        18..=28 => {}
        _ => return None,
    }
    if visible.is_empty() {
        return None;
    }
    match keycode {
        18 => visible.first().copied(),
        19 => visible.get(1).copied(),
        20 => visible.get(2).copied(),
        21 => visible.get(3).copied(),
        23 => visible.get(4).copied(),
        22 => visible.get(5).copied(),
        26 => visible.get(6).copied(),
        28 => visible.get(7).copied(),
        25 => visible.last().copied(),
        _ => None,
    }
}

fn handle_browser_shortcut(event: NonNull<NSEvent>) -> bool {
    let event = unsafe { event.as_ref() };
    if event.isARepeat() {
        return false;
    }

    let modifiers = event.modifierFlags() & NSEventModifierFlags::DeviceIndependentFlagsMask;
    if modifiers != NSEventModifierFlags::Command {
        return false;
    }

    match event.keyCode() {
        17 => {
            if let Err(err) = create_dynamic_tab(Some("about:blank"), true) {
                crate::state::log_crash("WARN", "keyboard", &format!("Cmd+T: {err}"));
            }
            true
        }
        13 => {
            let Some(state) = APP_STATE.get() else {
                return false;
            };
            let active_tab_id = state.current_tab.load(std::sync::atomic::Ordering::Relaxed);
            if let Err(err) = close_tab(active_tab_id) {
                crate::state::log_crash("WARN", "keyboard", &format!("Cmd+W: {err}"));
            }
            true
        }
        37 => {
            let Some(state) = APP_STATE.get() else {
                return false;
            };
            let field = unsafe { &*state.address_field_ptr };
            if let Err(err) = catch_objc(|| unsafe {
                field.selectText(None);
                let _: bool = msg_send![field, becomeFirstResponder];
            }) {
                crate::state::log_crash("WARN", "keyboard", &format!("Cmd+L: {err}"));
            }
            true
        }
        18 | 19 | 20 | 21 | 23 | 22 | 26 | 28 | 25 => {
            let Some(tab_id) = shortcut_tab_target(event.keyCode()) else {
                return false;
            };
            switch_tab(tab_id);
            true
        }
        _ => false,
    }
}

/// Installs the local key monitor that handles browser-wide keyboard shortcuts.
/// Supported shortcuts cover tab creation, closing, address focus, and tab switching.
pub(crate) fn install_browser_shortcuts() {
    let handler = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
        if handle_browser_shortcut(event) {
            null_mut()
        } else {
            event.as_ptr()
        }
    });
    let monitor = unsafe {
        NSEvent::addLocalMonitorForEventsMatchingMask_handler(NSEventMask::KeyDown, &handler)
    };
    if monitor.is_none() {
        crate::state::log_crash("WARN", "keyboard", "failed to install local key monitor");
        return;
    }
    let _ = objc2::rc::Retained::into_raw(monitor.unwrap());
}

// ── Keyboard simulation: send NSEvent directly to WKWebView ──
// Goes through WebKit's keyDown: → interpretKeyEvents: → full input pipeline.
// No OS-level focus issues — events go directly to our webview.

/// Create an NSEvent for a key and send it to the webview via keyDown:/keyUp:
/// Synthesizes a native key press and release pair directly into the target webview.
/// This goes through WebKit's event pipeline instead of global system focus.
pub(crate) fn send_key_to_webview(
    webview: &WKWebView,
    ch: &str,
    keycode: c_ushort,
    modifiers: NSEventModifierFlags,
) {
    let ns_ch = NSString::from_str(ch);
    let window = webview.window();
    let win_num = window.as_ref().map(|w| w.windowNumber()).unwrap_or(0);

    let down = NSEvent::keyEventWithType_location_modifierFlags_timestamp_windowNumber_context_characters_charactersIgnoringModifiers_isARepeat_keyCode(
        NSEventType::KeyDown,
        NSPoint::new(0.0, 0.0),
        modifiers,
        0.0,
        win_num,
        None,
        &ns_ch,
        &ns_ch,
        false,
        keycode,
    );
    if let Some(event) = &down
        && let Err(e) = catch_objc(|| {
            let _: () = unsafe { msg_send![webview, keyDown: &**event] };
        })
    {
        crate::state::log_crash("WARN", "keyboard", &format!("keyDown: {e}"));
    }

    let up = NSEvent::keyEventWithType_location_modifierFlags_timestamp_windowNumber_context_characters_charactersIgnoringModifiers_isARepeat_keyCode(
        NSEventType::KeyUp,
        NSPoint::new(0.0, 0.0),
        modifiers,
        0.0,
        win_num,
        None,
        &ns_ch,
        &ns_ch,
        false,
        keycode,
    );
    if let Some(event) = &up
        && let Err(e) = catch_objc(|| {
            let _: () = unsafe { msg_send![webview, keyUp: &**event] };
        })
    {
        crate::state::log_crash("WARN", "keyboard", &format!("keyUp: {e}"));
    }
}

fn native_click_at(webview: &WKWebView, x: f64, y: f64) {
    let frame = webview.frame();
    let jx = (jitter(0, 2, x as u64) as f64) - 1.0;
    let jy = (jitter(0, 2, y as u64) as f64) - 1.0;
    let point = NSPoint::new(x + jx, frame.size.height - y + jy);
    let win_num = webview.window().map(|w| w.windowNumber()).unwrap_or(0);

    let down = NSEvent::mouseEventWithType_location_modifierFlags_timestamp_windowNumber_context_eventNumber_clickCount_pressure(
        NSEventType::LeftMouseDown,
        point,
        NSEventModifierFlags::empty(),
        0.0,
        win_num,
        None,
        0,
        1,
        1.0,
    );
    if let Some(event) = &down {
        let _ = catch_objc(|| {
            let _: () = unsafe { msg_send![webview, mouseDown: &**event] };
        });
    }

    let up = NSEvent::mouseEventWithType_location_modifierFlags_timestamp_windowNumber_context_eventNumber_clickCount_pressure(
        NSEventType::LeftMouseUp,
        point,
        NSEventModifierFlags::empty(),
        0.0,
        win_num,
        None,
        0,
        1,
        0.0,
    );
    if let Some(event) = &up {
        let _ = catch_objc(|| {
            let _: () = unsafe { msg_send![webview, mouseUp: &**event] };
        });
    }
}

fn shifted_ascii_key(ch: char) -> Option<c_ushort> {
    match ch {
        '!' => Some(18),
        '@' => Some(19),
        '#' => Some(20),
        '$' => Some(21),
        '%' => Some(23),
        '^' => Some(22),
        '&' => Some(26),
        '*' => Some(28),
        '(' => Some(25),
        ')' => Some(29),
        '_' => Some(27),
        '+' => Some(24),
        '{' => Some(33),
        '}' => Some(30),
        '|' => Some(42),
        ':' => Some(41),
        '"' => Some(39),
        '<' => Some(43),
        '>' => Some(47),
        '?' => Some(44),
        '~' => Some(50),
        _ => None,
    }
}

/// Maps a text character to the characters, keycode, and modifier flags needed to type it.
/// ASCII uppercase and shifted punctuation are expanded into the correct Shift combinations.
pub(crate) fn key_spec_for_text(ch: char) -> (String, c_ushort, NSEventModifierFlags) {
    match ch {
        '\r' | '\n' => ("\r".to_owned(), 36, NSEventModifierFlags::empty()),
        '\t' => ("\t".to_owned(), 48, NSEventModifierFlags::empty()),
        ' ' => (" ".to_owned(), 49, NSEventModifierFlags::empty()),
        _ if ch.is_ascii_uppercase() => (
            ch.to_string(),
            mac_keycode(ch.to_ascii_lowercase()),
            NSEventModifierFlags::Shift,
        ),
        _ if shifted_ascii_key(ch).is_some() => (
            ch.to_string(),
            shifted_ascii_key(ch).unwrap_or(0),
            NSEventModifierFlags::Shift,
        ),
        _ => {
            let keycode = if ch.is_ascii() { mac_keycode(ch) } else { 0 };
            (ch.to_string(), keycode, NSEventModifierFlags::empty())
        }
    }
}

fn named_key_spec(key: &str) -> Option<(String, c_ushort)> {
    match key {
        "space" => Some((" ".to_owned(), 49)),
        "enter" | "return" => Some(("\r".to_owned(), 36)),
        "tab" => Some(("\t".to_owned(), 48)),
        "backspace" | "delete" => Some(("\u{7f}".to_owned(), 51)),
        "escape" | "esc" => Some(("\u{1b}".to_owned(), 53)),
        "left" => Some(("\u{F702}".to_owned(), 123)),
        "right" => Some(("\u{F703}".to_owned(), 124)),
        "up" => Some(("\u{F700}".to_owned(), 126)),
        "down" => Some(("\u{F701}".to_owned(), 125)),
        "home" => Some(("\u{F729}".to_owned(), 115)),
        "end" => Some(("\u{F72B}".to_owned(), 119)),
        _ => None,
    }
}

/// Parses a key command like `cmd+v` or `enter` and sends it to the webview.
/// Named keys, single characters, and modifier combinations are supported.
pub(crate) fn send_key_command(webview: &WKWebView, key: &str) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("empty key".to_owned());
    }

    let mut modifiers = NSEventModifierFlags::empty();
    let mut parts = key
        .split('+')
        .filter(|part| !part.trim().is_empty())
        .peekable();
    let mut key_part = None;

    while let Some(part) = parts.next() {
        let part = part.trim();
        if parts.peek().is_none() {
            key_part = Some(part);
            break;
        }
        match part {
            "cmd" | "command" => modifiers = modifiers.union(NSEventModifierFlags::Command),
            "shift" => modifiers = modifiers.union(NSEventModifierFlags::Shift),
            "alt" | "option" => modifiers = modifiers.union(NSEventModifierFlags::Option),
            "ctrl" | "control" => modifiers = modifiers.union(NSEventModifierFlags::Control),
            _ => return Err(format!("unsupported modifier: {part}")),
        }
    }

    let key_part = key_part.ok_or_else(|| "missing key".to_owned())?;
    let (chars, keycode, inferred_modifiers) =
        if let Some((chars, keycode)) = named_key_spec(key_part) {
            (chars, keycode, NSEventModifierFlags::empty())
        } else if key_part.chars().count() == 1 {
            key_spec_for_text(key_part.chars().next().unwrap())
        } else {
            return Err(format!("unsupported key: {key_part}"));
        };

    send_key_to_webview(
        webview,
        &chars,
        keycode,
        modifiers.union(inferred_modifiers),
    );
    Ok(())
}

/// Writes text into the macOS pasteboard and triggers a native `Cmd+V` in the webview.
/// This preserves trusted paste behavior for rich editors.
pub(crate) fn paste_text_native(webview: &WKWebView, text: &str) -> Result<(), String> {
    unsafe {
        let pb: Retained<AnyObject> = msg_send![objc2::class!(NSPasteboard), generalPasteboard];
        let _: () = msg_send![&*pb, clearContents];
        let ns_str = NSString::from_str(text);
        let ns_type = NSString::from_str("public.utf8-plain-text");
        let _: bool = msg_send![&*pb, setString: &*ns_str, forType: &*ns_type];
    }

    send_key_command(webview, "cmd+v")
}

/// Map character to Mac virtual keycode. Returns 0 for unmapped chars (non-ASCII).
/// Maps an ASCII character to its macOS virtual keycode.
/// Unmapped or non-ASCII characters fall back to `0`.
pub(crate) fn mac_keycode(ch: char) -> c_ushort {
    match ch.to_ascii_lowercase() {
        'a' => 0,
        's' => 1,
        'd' => 2,
        'f' => 3,
        'h' => 4,
        'g' => 5,
        'z' => 6,
        'x' => 7,
        'c' => 8,
        'v' => 9,
        'b' => 11,
        'q' => 12,
        'w' => 13,
        'e' => 14,
        'r' => 15,
        'y' => 16,
        't' => 17,
        '1' => 18,
        '2' => 19,
        '3' => 20,
        '4' => 21,
        '6' => 22,
        '5' => 23,
        '=' => 24,
        '9' => 25,
        '7' => 26,
        '-' => 27,
        '8' => 28,
        '0' => 29,
        ']' => 30,
        'o' => 31,
        'u' => 32,
        '[' => 33,
        'i' => 34,
        'p' => 35,
        '\n' => 36,
        'l' => 37,
        'j' => 38,
        '\'' => 39,
        'k' => 40,
        ';' => 41,
        '\\' => 42,
        ',' => 43,
        '/' => 44,
        'n' => 45,
        'm' => 46,
        '.' => 47,
        '\t' => 48,
        ' ' => 49,
        '`' => 50,
        '#' => 20, // # = Shift+3
        _ => 0,
    }
}

/// Pseudo-random in [min, max]. Mixes system clock nanos with a seed
/// to produce human-like timing variance. No external crate needed.
/// Returns a small pseudo-random delay in the inclusive range `[min, max]`.
/// The value mixes the system clock with a caller-provided seed for input timing variance.
pub(crate) fn jitter(min: u64, max: u64, seed: u64) -> u64 {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as u64;
    let h = nanos
        .wrapping_mul(6364136223846793005)
        .wrapping_add(seed.wrapping_mul(1442695040888963407));
    min + (h % (max - min + 1))
}

/// Type text as native NSEvent keyDown/keyUp pairs.
/// 80ms between chars.
/// Types text into the webview as scheduled native key events and reports completion to disk.
/// Characters are emitted with jittered delays to mimic human typing cadence.
pub(crate) fn type_text_native(webview: &WKWebView, text: &str, result_path: &str) {
    let chars: Vec<char> = text.chars().collect();
    let total = chars.len();
    let result_path = result_path.to_owned();
    let wv_ptr = webview as *const WKWebView as usize;

    for (i, ch) in chars.into_iter().enumerate() {
        let rp = result_path.clone();
        let delay_ms: u64 = (0..i).map(|j| jitter(55, 130, j as u64)).sum();
        dispatch::Queue::main().exec_after(std::time::Duration::from_millis(delay_ms), move || {
            let wv = unsafe { &*(wv_ptr as *const WKWebView) };
            let (chars, keycode, modifiers) = key_spec_for_text(ch);
            send_key_to_webview(wv, &chars, keycode, modifiers);
            if i == total - 1 {
                let _ = std::fs::write(&rp, format!("ok: typed {total} chars"));
            }
        });
    }

    if total == 0 {
        let _ = std::fs::write(&result_path, "ok: nothing to type");
    }
}

/// Add a blue hashtag to Douyin's Slate editor. Single command, no focus stealing.
///
/// Flow: JS locates #添加话题 button coords → native click → native keys per char → space confirm.
///
/// IMPORTANT: Must be called on an EMPTY editor or with cursor at end.
/// Tags should be added BEFORE description text (cmd+right goes to end of all content).
/// Adds a hashtag through Douyin's native editor flow using trusted clicks and key events.
/// The command finds the tag button, opens the picker, types the tag, and confirms it.
pub(crate) fn add_tag(webview: &WKWebView, tag: &str, result_path: &str) {
    let rp = result_path.to_owned();
    let tag_owned = tag.to_owned();
    let wv_ptr = webview as *const WKWebView as usize;
    let text = serde_json::to_string("#添加话题").unwrap_or_else(|_| "\"#添加话题\"".to_owned());
    let click_js = format!(
        "try{{var roots=[document];var apps=document.querySelectorAll('wujie-app');for(var j=0;j<apps.length;j++){{if(apps[j].shadowRoot)roots.push(apps[j].shadowRoot);}}var found=null;for(var r=0;r<roots.length&&!found;r++){{var all=roots[r].querySelectorAll('*');for(var i=0;i<all.length;i++){{var el=all[i];if(el.textContent.trim()==={text}&&el.childNodes.length<=3&&el.offsetWidth>0){{found=el;break;}}}}}}if(found){{var rect=found.getBoundingClientRect();String(Math.round(rect.x+rect.width/2))+','+String(Math.round(rect.y+rect.height/2))}}else{{'not_found'}}}}catch(e){{'error: '+e.message}}",
    );
    let js_str = NSString::from_str(&click_js);

    let handler = RcBlock::new(move |result: *mut AnyObject, _error: *mut NSError| {
        let coords = if result.is_null() {
            "null".to_owned()
        } else {
            let s: &NSString = unsafe { &*(result as *const NSString) };
            s.to_string()
        };

        let parts: Vec<&str> = coords.split(',').collect();
        let (Ok(x), Ok(y)) = (
            parts.first().unwrap_or(&"").parse::<f64>(),
            parts.get(1).unwrap_or(&"").parse::<f64>(),
        ) else {
            let _ = std::fs::write(&rp, format!("error: addtag button {coords}"));
            return;
        };

        let wv = unsafe { &*(wv_ptr as *const WKWebView) };
        native_click_at(wv, x, y);

        let chars: Vec<char> = tag_owned.chars().collect();
        let n_chars = chars.len();
        for (i, ch) in chars.into_iter().enumerate() {
            let cmd_delay = 1500 + (i as u64) * 300;
            dispatch::Queue::main().exec_after(std::time::Duration::from_millis(cmd_delay), {
                let wv_ptr = wv_ptr;
                move || {
                    let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                    if let Err(err) = send_key_command(wv, "cmd+right") {
                        crate::state::log_crash(
                            "WARN",
                            "keyboard",
                            &format!("add_tag move: {err}"),
                        );
                    }
                }
            });

            let ch_delay = cmd_delay + 150;
            dispatch::Queue::main().exec_after(std::time::Duration::from_millis(ch_delay), {
                let wv_ptr = wv_ptr;
                move || {
                    let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                    if let Err(err) = send_key_command(wv, &ch.to_string()) {
                        crate::state::log_crash(
                            "WARN",
                            "keyboard",
                            &format!("add_tag char: {err}"),
                        );
                    }
                }
            });
        }

        let space_delay = 1500 + (n_chars as u64) * 300 + 500;
        dispatch::Queue::main().exec_after(std::time::Duration::from_millis(space_delay), {
            let rp = rp.clone();
            let tag = tag_owned.clone();
            let wv_ptr = wv_ptr;
            move || {
                let wv = unsafe { &*(wv_ptr as *const WKWebView) };
                if let Err(err) = send_key_command(wv, "space") {
                    let _ = std::fs::write(&rp, format!("error: {err}"));
                    return;
                }

                dispatch::Queue::main().exec_after(
                    std::time::Duration::from_millis(1000),
                    move || {
                        let _ = std::fs::write(&rp, format!("ok: tag #{tag}"));
                    },
                );
            }
        });
    });

    unsafe {
        webview.evaluateJavaScript_completionHandler(&js_str, Some(&handler));
    }
}
