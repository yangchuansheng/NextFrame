use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};

use chrono::{Local, SecondsFormat};
use objc2::msg_send;
use objc2::runtime::AnyObject;
use objc2_app_kit::{NSButton, NSColor, NSTextField, NSView};
use objc2_foundation::{NSPoint, NSRect, NSSize, NSString};
use objc2_web_kit::{WKWebView, WKWebViewConfiguration};
use serde::{Deserialize, Serialize};

use crate::delegates::{PilotNavDelegate, PilotUIDelegate};
use crate::ui::{rebuild_bookmarks_bar, rebuild_tab_strip};

mod persistence;
mod session;
mod tabs;

#[allow(unused_imports)]
pub(crate) use persistence::{
    LoadedBrowserSession, SavedDynamicTab, SessionHistoryEntry, SessionState, load_browser_session,
    load_sessions, load_tab_urls, load_window_frame, save_browser_session, save_tab_urls,
    save_window_frame,
};
#[allow(unused_imports)]
pub(crate) use session::{check_session, session_statuses};
#[allow(unused_imports)]
pub(crate) use tabs::{
    BrowserTabInfo, BrowserTabView, all_tab_ids, all_tab_infos, close_tab, create_dynamic_tab,
    go_back, go_forward, navigate_active_input, navigate_tab_to_url, open_bookmark,
    refresh_all_sidebar_button_titles, refresh_browser_ui, refresh_sidebar_button_title,
    reload_tab, restore_dynamic_tabs, set_tab_loading_state, switch_tab,
    sync_tab_state_from_webview, update_tab_after_navigation_event,
};

pub(crate) const LEGACY_CMD: &str = "/tmp/wp-cmd.js";
pub(crate) const LEGACY_RESULT: &str = "/tmp/wp-result.txt";
pub(crate) const LEGACY_SCREENSHOT: &str = "/tmp/wp-screenshot.png";
pub(crate) const LEGACY_UPLOAD: &str = "/tmp/wp-upload-path.txt";

pub(crate) const POLL_MS: u64 = 300;
pub(crate) const TAB_STRIP_HEIGHT: f64 = 38.0;
pub(crate) const TOOLBAR_HEIGHT: f64 = 44.0;
pub(crate) const BOOKMARKS_BAR_HEIGHT: f64 = 30.0;

pub(crate) const BOOKMARK_COLORS: &[(f64, f64, f64, &str)] = &[
    (0.10, 0.10, 0.10, "抖"),
    (1.00, 0.14, 0.26, "红"),
    (0.00, 0.63, 0.84, "B"),
    (0.03, 0.76, 0.38, "视"),
    (0.03, 0.76, 0.38, "公"),
    (1.00, 0.40, 0.00, "快"),
    (0.00, 0.40, 1.00, "知"),
    (0.83, 0.66, 0.26, "财"),
    (0.20, 0.44, 1.00, "飞"),
];

fn css_rgb_channel(value: f64) -> u8 {
    (value.clamp(0.0, 1.0) * 255.0).round() as u8
}

fn css_hex_color(r: f64, g: f64, b: f64) -> String {
    format!(
        "#{:02X}{:02X}{:02X}",
        css_rgb_channel(r),
        css_rgb_channel(g),
        css_rgb_channel(b)
    )
}

fn new_tab_html() -> String {
    let cards = TABS
        .iter()
        .zip(BOOKMARK_COLORS.iter())
        .map(|(tab, (r, g, b, icon))| {
            let color = css_hex_color(*r, *g, *b);
            format!(
                r#"<a class="shortcut" href="{url}">
    <span class="shortcut-circle" style="background:{color};">{icon}</span>
    <span class="shortcut-name">{label}</span>
</a>"#,
                url = tab.url,
                color = color,
                icon = icon,
                label = tab.label
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AutoMedia</title>
<style>
:root {{
    color-scheme: light;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
    --page-bg: #F9F8F6;
    --card-bg: rgba(255, 255, 255, 0.74);
    --card-border: rgba(180, 168, 153, 0.24);
    --text-main: #2F2A24;
    --text-subtle: #8C8174;
}}
* {{ box-sizing: border-box; }}
html, body {{ height: 100%; margin: 0; }}
body {{
    background:
        radial-gradient(circle at top, rgba(232, 221, 206, 0.52), transparent 36%),
        linear-gradient(180deg, #FBFAF8 0%, var(--page-bg) 100%);
    color: var(--text-main);
}}
.page {{
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
}}
.panel {{
    width: min(760px, 100%);
}}
.title {{
    margin: 0 0 24px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-subtle);
}}
.grid {{
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
}}
.shortcut {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 22px 18px 20px;
    border-radius: 22px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    box-shadow: 0 10px 30px rgba(103, 84, 63, 0.08);
    text-decoration: none;
    color: inherit;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}}
.shortcut:hover {{
    transform: translateY(-1px);
    box-shadow: 0 14px 32px rgba(103, 84, 63, 0.12);
    border-color: rgba(153, 134, 113, 0.38);
}}
.shortcut-circle {{
    width: 56px;
    height: 56px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #FFF;
    font-size: 24px;
    font-weight: 700;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}}
.shortcut-name {{
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
}}
@media (max-width: 680px) {{
    .page {{ padding: 28px 18px; }}
    .grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
}}
@media (max-width: 420px) {{
    .grid {{ grid-template-columns: minmax(0, 1fr); }}
}}
</style>
</head>
<body>
<main class="page">
    <section class="panel">
        <h1 class="title">AutoMedia</h1>
        <div class="grid">
{cards}
        </div>
    </section>
</main>
</body>
</html>"#
    )
}

/// Returns the per-tab command file path used by the polling bridge.
/// Each tab gets an isolated `/tmp` command channel keyed by tab id.
pub(crate) fn cmd_file(tab: usize) -> String {
    format!("/tmp/wp-cmd-{tab}.js")
}

/// Returns the per-tab result file path used to report command output.
/// The polling loop writes command status and JSON responses here.
pub(crate) fn result_file(tab: usize) -> String {
    format!("/tmp/wp-result-{tab}.txt")
}

/// Returns the per-tab screenshot file path for native capture commands.
/// Screenshots are written into `/tmp` with the tab id embedded in the name.
pub(crate) fn screenshot_file(tab: usize) -> String {
    format!("/tmp/wp-screenshot-{tab}.png")
}

/// Returns the per-tab upload path file used by command workflows.
/// External automation writes selected upload targets into this channel.
pub(crate) fn upload_file(tab: usize) -> String {
    format!("/tmp/wp-upload-path-{tab}.txt")
}

pub(crate) struct TabDef {
    pub(crate) label: &'static str,
    pub(crate) url: &'static str,
    pub(crate) check_session_js: &'static str,
    pub(crate) keep_alive_js: &'static str,
}

pub(crate) const TABS: &[TabDef] = &[
    TabDef {
        label: "抖音",
        url: "https://creator.douyin.com",
        check_session_js: r#"(function(){return fetch('/creator-micro/home',{credentials:'include',redirect:'manual'}).then(function(r){return r.status===200?'alive':'expired'}).catch(function(){var u=String(location.href||'');return u.includes('creator.douyin.com')&&!/login|passport/i.test(u)?'alive':'expired'});})()"#,
        keep_alive_js: r#"(function(){return fetch('/creator-micro/home',{credentials:'include'}).then(r=>r.ok?'kept':'fail').catch(()=>'fail');})()"#,
    },
    TabDef {
        label: "小红书",
        url: "https://creator.xiaohongshu.com",
        check_session_js: r#"(function(){return fetch('/api/galaxy/user/info',{credentials:'include'}).then(function(r){return r.status===200?'alive':'expired'}).catch(function(){var u=String(location.href||'');return u.includes('creator.xiaohongshu.com')&&!/login/i.test(u)?'alive':'expired'});})()"#,
        keep_alive_js: r#"(function(){return fetch('/api/galaxy/user/info',{credentials:'include'}).then(r=>r.ok?'kept':'fail').catch(()=>'fail');})()"#,
    },
    TabDef {
        label: "B站",
        url: "https://member.bilibili.com",
        check_session_js: r#"(function(){return fetch('https://api.bilibili.com/x/web-interface/nav',{credentials:'include'}).then(function(r){return r.json()}).then(function(d){return d.code===0?'alive':'expired'}).catch(function(){var u=String(location.href||'');return u.includes('member.bilibili.com')&&!/login|passport/i.test(u)?'alive':'expired'});})()"#,
        keep_alive_js: r#"(function(){
            return fetch('https://api.bilibili.com/x/web-interface/nav',{credentials:'include'})
            .then(r=>r.json()).then(d=>{
                if(d.code===0)return 'kept:'+d.data.uname;
                return 'expired:code='+d.code;
            }).then(s=>{
                return fetch('https://passport.bilibili.com/x/passport-login/web/cookie/info',{credentials:'include'})
                .then(r=>r.json()).then(d2=>{
                    var need=d2.data&&d2.data.refresh;
                    return s+(need?':NEED_REFRESH':'');
                }).catch(()=>s);
            }).catch(()=>'fail');
        })()"#,
    },
    TabDef {
        label: "视频号",
        url: "https://channels.weixin.qq.com",
        check_session_js: r#"(function(){return document.querySelector('[class*=qrcode]')===null?'alive':'expired';})()"#,
        keep_alive_js: "",
    },
    TabDef {
        label: "公众号",
        url: "https://mp.weixin.qq.com",
        check_session_js: r#"(function(){const u=new URL(String(location.href||''));return u.hostname==='mp.weixin.qq.com'&&!!u.searchParams.get('token')?'alive':'expired';})()"#,
        keep_alive_js: "",
    },
    TabDef {
        label: "快手",
        url: "https://cp.kuaishou.com",
        check_session_js: r#"(function(){return fetch('/article/manage/video',{credentials:'include',redirect:'manual'}).then(function(r){return r.status===200?'alive':'expired'}).catch(function(){var u=String(location.href||'');return u.includes('cp.kuaishou.com')&&!/login|passport/i.test(u)?'alive':'expired'});})()"#,
        keep_alive_js: r#"(function(){return fetch('/article/manage/video',{credentials:'include'}).then(r=>r.ok?'kept':'fail').catch(()=>'fail');})()"#,
    },
    TabDef {
        label: "知乎",
        url: "https://www.zhihu.com/creator",
        check_session_js: r#"(function(){return fetch('https://www.zhihu.com/api/v4/me',{credentials:'include'}).then(function(r){return r.ok?'alive':'expired'}).catch(function(){var u=String(location.href||'');return u.includes('zhihu.com/creator')&&!/signin/i.test(u)?'alive':'expired'});})()"#,
        keep_alive_js: r#"(function(){return fetch('https://www.zhihu.com/api/v4/me',{credentials:'include'}).then(r=>r.ok?'kept':'fail').catch(()=>'fail');})()"#,
    },
    TabDef {
        label: "生财",
        url: "https://scys.com/",
        check_session_js: r#"(function(){var u=String(location.href||'');return u.includes('scys.com')&&!/login|signin/i.test(u)?'alive':'expired';})()"#,
        keep_alive_js: "",
    },
    TabDef {
        label: "飞书",
        url: "https://my.feishu.cn/drive/home/",
        check_session_js: r#"(function(){var u=String(location.href||'');return u.includes('feishu.cn')&&!/login|passport/i.test(u)?'alive':'expired';})()"#,
        keep_alive_js: "",
    },
];

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum BrowserTabKind {
    Workspace(usize),
    Dynamic,
}

#[derive(Clone)]
pub(crate) struct BrowserTab {
    pub(crate) id: usize,
    pub(crate) kind: BrowserTabKind,
    pub(crate) title: String,
    pub(crate) current_url: String,
    pub(crate) last_committed_url: String,
    pub(crate) can_go_back: bool,
    pub(crate) can_go_forward: bool,
    pub(crate) is_loading: bool,
    pub(crate) visible: bool,
    pub(crate) webview_ptr: *const WKWebView,
}

pub(crate) struct AppState {
    pub(crate) window_ptr: *const objc2_app_kit::NSWindow,
    pub(crate) current_tab: AtomicUsize,
    pub(crate) next_tab_id: AtomicUsize,
    pub(crate) browser_tabs: Mutex<Vec<BrowserTab>>,
    pub(crate) session_status: Mutex<Vec<Option<bool>>>,
    pub(crate) sessions: Mutex<Vec<SessionState>>,
    pub(crate) bookmarks_bar_ptr: *const NSView,
    pub(crate) tab_strip_ptr: *const NSView,
    pub(crate) webview_host_ptr: *const NSView,
    pub(crate) address_field_ptr: *const NSTextField,
    pub(crate) back_button_ptr: *const NSButton,
    pub(crate) forward_button_ptr: *const NSButton,
    pub(crate) reload_button_ptr: *const NSButton,
    pub(crate) browser_target_ptr: *const AnyObject,
    pub(crate) config_ptr: *const WKWebViewConfiguration,
    pub(crate) ui_delegate_ptr: *const PilotUIDelegate,
    pub(crate) nav_delegate_ptr: *const PilotNavDelegate,
    pub(crate) user_agent: &'static str,
}

unsafe impl Send for AppState {}
unsafe impl Sync for AppState {}

pub(crate) static APP_STATE: OnceLock<AppState> = OnceLock::new();

fn timestamp_now() -> String {
    Local::now().to_rfc3339_opts(SecondsFormat::Secs, false)
}

fn trim_history(history: &mut Vec<SessionHistoryEntry>) {
    let excess = history.len().saturating_sub(100);
    if excess > 0 {
        history.drain(0..excess);
    }
}

fn active_tab_id() -> Option<usize> {
    let state = APP_STATE.get()?;
    Some(state.current_tab.load(Ordering::Relaxed))
}

fn browser_tabs_snapshot() -> Vec<BrowserTab> {
    let Some(state) = APP_STATE.get() else {
        return Vec::new();
    };
    let Ok(tabs) = state.browser_tabs.lock() else {
        return Vec::new();
    };
    tabs.clone()
}

fn webview_ptr_for_tab(tab_id: usize) -> Option<*const WKWebView> {
    let state = APP_STATE.get()?;
    let Ok(tabs) = state.browser_tabs.lock() else {
        return None;
    };
    tabs.iter()
        .find(|tab| tab.id == tab_id)
        .map(|tab| tab.webview_ptr)
}

/// Returns the currently active webview, if application state is initialized.
/// This resolves the active tab id first and then looks up its webview pointer.
pub(crate) fn current_webview() -> Option<&'static WKWebView> {
    let tab_id = active_tab_id()?;
    webview_for_tab(tab_id)
}

/// Returns the webview backing the given runtime tab id.
/// Missing app state or stale tab ids yield `None`.
pub(crate) fn webview_for_tab(tab_id: usize) -> Option<&'static WKWebView> {
    let ptr = webview_ptr_for_tab(tab_id)?;
    Some(unsafe { &*ptr })
}

/// Finds the runtime tab id associated with a specific `WKWebView`.
/// This is used by delegate callbacks to map WebKit events back to tabs.
pub(crate) fn tab_index_for_webview(wv: &WKWebView) -> Option<usize> {
    let state = APP_STATE.get()?;
    let ptr = wv as *const WKWebView;
    let Ok(tabs) = state.browser_tabs.lock() else {
        return None;
    };
    tabs.iter()
        .find(|tab| tab.webview_ptr == ptr)
        .map(|tab| tab.id)
}

fn bookmarks_bar_view() -> Option<&'static NSView> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.bookmarks_bar_ptr })
}

fn tab_strip_view() -> Option<&'static NSView> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.tab_strip_ptr })
}

fn webview_host_view() -> Option<&'static NSView> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.webview_host_ptr })
}

fn address_field() -> Option<&'static NSTextField> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.address_field_ptr })
}

fn back_button() -> Option<&'static NSButton> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.back_button_ptr })
}

fn forward_button() -> Option<&'static NSButton> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.forward_button_ptr })
}

fn reload_button() -> Option<&'static NSButton> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.reload_button_ptr })
}

fn browser_target() -> Option<&'static AnyObject> {
    let state = APP_STATE.get()?;
    Some(unsafe { &*state.browser_target_ptr })
}

fn short_title(title: &str) -> String {
    let compact = title.replace('\n', " ").trim().to_owned();
    if compact.is_empty() {
        return "New Tab".to_owned();
    }
    let chars: Vec<char> = compact.chars().collect();
    if chars.len() <= 18 {
        compact
    } else {
        format!("{}…", chars[..18].iter().collect::<String>())
    }
}

fn dynamic_tab_icon(tab: &BrowserTab) -> &'static str {
    let url = if !tab.current_url.trim().is_empty() {
        &tab.current_url
    } else {
        &tab.last_committed_url
    };
    let host = url_host(url).to_ascii_lowercase();

    if host.contains("douyin") {
        "🎵"
    } else if host.contains("xiaohongshu") {
        "📕"
    } else if host.contains("bilibili") {
        "📺"
    } else if host.contains("weixin") || host.contains("qq.com") {
        "💬"
    } else if host.contains("kuaishou") {
        "🎬"
    } else if host.contains("zhihu") {
        "💡"
    } else if host.contains("scys") {
        "💰"
    } else if host.contains("feishu") || host.contains("lark") {
        "📄"
    } else if host.contains("github") {
        "🐙"
    } else if host.contains("google") {
        "🔍"
    } else {
        "🌐"
    }
}

fn tab_title_from_state(tab: &BrowserTab) -> String {
    match tab.kind {
        BrowserTabKind::Workspace(index) => {
            let icon = BOOKMARK_COLORS.get(index).map(|c| c.3).unwrap_or("●");
            format!("{} {}", icon, TABS[index].label)
        }
        BrowserTabKind::Dynamic => format!("{} {}", dynamic_tab_icon(tab), short_title(&tab.title)),
    }
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
        .to_owned()
}

fn normalize_user_url(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.starts_with("about:") || trimmed.contains("://") {
        return Some(trimmed.to_owned());
    }
    if trimmed.contains(' ') {
        return None;
    }
    Some(format!("https://{trimmed}"))
}

fn title_for_webview(webview: &WKWebView) -> String {
    unsafe { webview.title() }
        .map(|value| value.to_string())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "New Tab".to_owned())
}

fn current_url_for_webview(webview: &WKWebView) -> String {
    unsafe { webview.URL() }
        .and_then(|url| url.absoluteString())
        .map(|value| value.to_string())
        .unwrap_or_default()
}

fn make_request(url: &str) -> Result<objc2::rc::Retained<objc2_foundation::NSURLRequest>, String> {
    let nsurl = objc2_foundation::NSURL::URLWithString(&NSString::from_str(url))
        .ok_or_else(|| format!("invalid URL: {url}"))?;
    Ok(objc2_foundation::NSURLRequest::requestWithURL(&nsurl))
}

fn remove_view_from_superview(view: &AnyObject) {
    let _ = unsafe {
        objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
            let _: () = unsafe { msg_send![view, removeFromSuperview] };
        }))
    };
}

/// Appends a structured activity event to the persistent JSONL activity log.
/// Failures are ignored so telemetry never blocks the main app flow.
pub(crate) fn log_activity(event_type: &str, platform: &str, details: &str) {
    use std::io::Write;

    let ts = timestamp_now();
    let entry = serde_json::json!({
        "ts": ts,
        "type": event_type,
        "platform": platform,
        "details": details,
    });
    let path = persistence::state_dir().join("activity.jsonl");
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        let _ = writeln!(file, "{}", entry);
        let _ = file.flush();
    }
}

/// Records an error or crash entry to stderr, the crash log, and activity telemetry.
/// This centralizes diagnostic reporting for Rust and Objective-C failures.
pub(crate) fn log_crash(level: &str, location: &str, message: &str) {
    use std::io::Write;

    let ts = timestamp_now();
    let line = format!("[{ts}] {level} {location}: {message}");
    eprintln!("{line}");
    let path = persistence::state_dir().join("crash.log");
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        let _ = writeln!(file, "{}", line);
        let _ = file.flush();
    }
    log_activity("crash", location, &format!("{level}: {message}"));
}

/// Returns the last `last_n` activity log lines as a newline-delimited string.
/// Missing log files produce an empty string.
pub(crate) fn read_activity_log(last_n: usize) -> String {
    let path = persistence::state_dir().join("activity.jsonl");
    let content = std::fs::read_to_string(&path).unwrap_or_default();
    let lines: Vec<&str> = content.lines().collect();
    let start = lines.len().saturating_sub(last_n);
    lines[start..].join("\n")
}
