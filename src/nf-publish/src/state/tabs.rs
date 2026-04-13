use objc2::rc::Retained;

use super::*;
use crate::ui::create_webview;

#[derive(Clone, Serialize)]
pub(crate) struct BrowserTabInfo {
    pub(crate) id: usize,
    pub(crate) kind: &'static str,
    pub(crate) title: String,
    pub(crate) url: String,
    pub(crate) current: bool,
    pub(crate) loading: bool,
}

#[derive(Clone)]
pub(crate) struct BrowserTabView {
    pub(crate) id: usize,
    pub(crate) title: String,
    pub(crate) active: bool,
    pub(crate) loading: bool,
}

/// Rebuilds the bookmarks bar after a single workspace status change.
/// The tab argument is currently ignored because the whole bar is regenerated.
pub(crate) fn refresh_sidebar_button_title(_tab: usize) {
    refresh_bookmarks_bar();
}

/// Rebuilds all workspace bookmark buttons and their session status dots.
/// This is the broad refresh path used when multiple statuses may have changed.
pub(crate) fn refresh_all_sidebar_button_titles() {
    refresh_bookmarks_bar();
}

fn refresh_browser_controls() {
    fn set_nav_button_state(button: &NSButton, enabled: bool) {
        let tint = if enabled {
            NSColor::colorWithSRGBRed_green_blue_alpha(0.30, 0.30, 0.32, 1.0)
        } else {
            NSColor::colorWithSRGBRed_green_blue_alpha(0.72, 0.72, 0.74, 1.0)
        };
        button.setEnabled(enabled);
        let _: () = unsafe { msg_send![button, setContentTintColor: &*tint] };
    }

    let Some(state) = APP_STATE.get() else { return };
    let active = {
        let Ok(tabs) = state.browser_tabs.lock() else {
            return;
        };
        let active_id = state.current_tab.load(Ordering::Relaxed);
        tabs.iter().find(|tab| tab.id == active_id).cloned()
    };
    let Some(active) = active else { return };

    if let Some(field) = address_field() {
        let url = if !active.current_url.is_empty() {
            active.current_url.clone()
        } else if !active.last_committed_url.is_empty() {
            active.last_committed_url.clone()
        } else {
            match active.kind {
                BrowserTabKind::Workspace(index) => TABS[index].url.to_owned(),
                BrowserTabKind::Dynamic => "about:blank".to_owned(),
            }
        };
        field.setStringValue(&NSString::from_str(&url));
    }
    if let Some(button) = back_button() {
        set_nav_button_state(button, active.can_go_back);
    }
    if let Some(button) = forward_button() {
        set_nav_button_state(button, active.can_go_forward);
    }
    if let Some(button) = reload_button() {
        button.setEnabled(true);
        button.setTitle(&NSString::from_str("↻"));
    }
}

fn refresh_bookmarks_bar() {
    let Some(bookmarks_bar) = bookmarks_bar_view() else {
        return;
    };
    let Some(target) = browser_target() else {
        return;
    };
    let Some(state) = APP_STATE.get() else { return };

    let statuses = state
        .session_status
        .lock()
        .ok()
        .map(|s| s.clone())
        .unwrap_or_default();

    rebuild_bookmarks_bar(bookmarks_bar, target, &statuses);
}

fn refresh_tab_strip() {
    let Some(tab_strip) = tab_strip_view() else {
        return;
    };
    let Some(target) = browser_target() else {
        return;
    };
    let Some(state) = APP_STATE.get() else { return };
    let active_id = state.current_tab.load(Ordering::Relaxed);
    let views = {
        let Ok(tabs) = state.browser_tabs.lock() else {
            return;
        };
        tabs.iter()
            .filter(|tab| tab.visible)
            .map(|tab| BrowserTabView {
                id: tab.id,
                title: tab_title_from_state(tab),
                active: tab.id == active_id,
                loading: tab.is_loading,
            })
            .collect::<Vec<_>>()
    };
    rebuild_tab_strip(tab_strip, target, &views);
}

/// Refreshes the tab strip, toolbar controls, bookmarks bar, and traffic-light positions.
/// This is the top-level UI sync entry point after tab state changes.
pub(crate) fn refresh_browser_ui() {
    refresh_tab_strip();
    refresh_browser_controls();
    refresh_bookmarks_bar();
    if let Some(state) = APP_STATE.get() {
        let window = unsafe { &*state.window_ptr };
        crate::ui::move_traffic_lights(window);
    }
}

/// Opens the selected workspace bookmark in a new dynamic tab and activates it.
/// Invalid indices fall back to `about:blank`.
pub(crate) fn open_bookmark(bookmark_index: usize) {
    let url = TABS
        .get(bookmark_index)
        .map(|t| t.url)
        .unwrap_or("about:blank");
    let _ = create_dynamic_tab(Some(url), true);
}

/// Returns the runtime ids of all known browser tabs.
/// Hidden workspace tabs remain included so background command channels keep working.
pub(crate) fn all_tab_ids() -> Vec<usize> {
    browser_tabs_snapshot()
        .into_iter()
        .map(|tab| tab.id)
        .collect()
}

/// Returns a serializable snapshot of every tab for the `tabs` automation command.
/// The active tab and effective URL are resolved from current runtime state.
pub(crate) fn all_tab_infos() -> Vec<BrowserTabInfo> {
    let active = active_tab_id().unwrap_or(0);
    browser_tabs_snapshot()
        .into_iter()
        .map(|tab| BrowserTabInfo {
            id: tab.id,
            kind: match tab.kind {
                BrowserTabKind::Workspace(_) => "workspace",
                BrowserTabKind::Dynamic => "dynamic",
            },
            title: tab.title.clone(),
            url: if tab.current_url.is_empty() {
                tab.last_committed_url.clone()
            } else {
                tab.current_url.clone()
            },
            current: tab.id == active,
            loading: tab.is_loading,
        })
        .collect()
}

/// Makes the given runtime tab visible and hides the previously active one.
/// Successful switches also persist browser session state and refresh the chrome.
pub(crate) fn switch_tab(index: usize) {
    let Some(state) = APP_STATE.get() else { return };
    let prev = state.current_tab.load(Ordering::Relaxed);
    let (prev_ptr, next_ptr) = {
        let Ok(mut tabs) = state.browser_tabs.lock() else {
            return;
        };
        let prev_ptr = if prev == index {
            None
        } else {
            tabs.iter()
                .find(|tab| tab.id == prev)
                .map(|tab| tab.webview_ptr)
        };
        let Some(next_pos) = tabs.iter().position(|tab| tab.id == index) else {
            return;
        };
        tabs[next_pos].visible = true;
        let next_ptr = tabs[next_pos].webview_ptr;
        (prev_ptr, next_ptr)
    };

    let result = unsafe {
        objc2::exception::catch(std::panic::AssertUnwindSafe(|| {
            if let Some(prev_ptr) = prev_ptr {
                unsafe {
                    (&*prev_ptr).setHidden(true);
                }
            }
            unsafe {
                (&*next_ptr).setHidden(false);
            }
        }))
    };
    if let Err(e) = result {
        log_crash("ERROR", "switch_tab", &format!("ObjC exception: {e:?}"));
        return;
    }

    state.current_tab.store(index, Ordering::Relaxed);
    sync_tab_state_from_webview(index);
    refresh_browser_ui();
    persistence::save_browser_session();
}

fn sync_tab_state_locked(tab: &mut BrowserTab, webview: &WKWebView) {
    tab.current_url = current_url_for_webview(webview);
    if !tab.current_url.is_empty() {
        tab.last_committed_url = tab.current_url.clone();
    }
    tab.title = title_for_webview(webview);
    tab.is_loading = unsafe { webview.isLoading() };
    tab.can_go_back = unsafe { webview.canGoBack() };
    tab.can_go_forward = unsafe { webview.canGoForward() };
}

/// Pulls title, URL, loading, and navigation flags from a tab's live webview.
/// The updated snapshot is persisted before the browser UI is refreshed.
pub(crate) fn sync_tab_state_from_webview(tab_id: usize) {
    let Some(state) = APP_STATE.get() else { return };
    let Ok(mut tabs) = state.browser_tabs.lock() else {
        return;
    };
    let Some(tab) = tabs.iter_mut().find(|tab| tab.id == tab_id) else {
        return;
    };
    let webview = unsafe { &*tab.webview_ptr };
    sync_tab_state_locked(tab, webview);
    let active = state.current_tab.load(Ordering::Relaxed);
    persistence::save_browser_session_snapshot(&tabs, active);
    drop(tabs);
    refresh_browser_ui();
}

/// Updates a tab's loading flag without re-reading the rest of the webview state.
/// This is used for optimistic navigation updates driven by commands and delegates.
pub(crate) fn set_tab_loading_state(tab_id: usize, is_loading: bool) {
    let Some(state) = APP_STATE.get() else { return };
    let Ok(mut tabs) = state.browser_tabs.lock() else {
        return;
    };
    let Some(tab) = tabs.iter_mut().find(|tab| tab.id == tab_id) else {
        return;
    };
    tab.is_loading = is_loading;
    let active = state.current_tab.load(Ordering::Relaxed);
    persistence::save_browser_session_snapshot(&tabs, active);
    drop(tabs);
    refresh_browser_ui();
}

/// Synchronizes tab metadata after a navigation callback and persists URLs when needed.
/// Workspace tabs also refresh their saved startup URLs.
pub(crate) fn update_tab_after_navigation_event(tab_id: usize) {
    sync_tab_state_from_webview(tab_id);
    if tab_id < TABS.len() {
        persistence::save_tab_urls();
    }
}

/// Creates a runtime-managed dynamic tab, optionally loading an initial URL and activating it.
/// New blank tabs render the custom start page instead of navigating immediately.
pub(crate) fn create_dynamic_tab(
    initial_url: Option<&str>,
    activate: bool,
) -> Result<usize, String> {
    let is_new_tab = initial_url.is_none() || initial_url == Some("about:blank");
    let initial_url = initial_url.unwrap_or("about:blank");
    let state = APP_STATE
        .get()
        .ok_or_else(|| "app state not initialized".to_owned())?;
    let host = webview_host_view().ok_or_else(|| "missing webview host".to_owned())?;
    let config = unsafe { &*state.config_ptr };
    let ui_delegate = unsafe { &*state.ui_delegate_ptr };
    let nav_delegate = unsafe { &*state.nav_delegate_ptr };
    let frame = host.frame();
    let webview = create_webview(
        objc2_foundation::MainThreadMarker::new().expect("main thread"),
        NSRect::new(
            NSPoint::new(0.0, 0.0),
            NSSize::new(frame.size.width, frame.size.height),
        ),
        initial_url,
        config,
        ui_delegate,
        nav_delegate,
    );
    unsafe {
        webview.setCustomUserAgent(Some(&NSString::from_str(state.user_agent)));
    }
    if is_new_tab {
        let html = NSString::from_str(&new_tab_html());
        unsafe {
            webview.loadHTMLString_baseURL(&html, None);
        }
    }
    webview.setHidden(!activate);
    host.addSubview(&webview);

    // Dynamic tabs intentionally leak one retain. Delayed WebKit/AppKit callbacks in commands,
    // polling, and keyboard paths still reconstruct raw pointers after a tab is closed.
    // Keeping the Obj-C object alive avoids a use-after-free while stale callbacks no-op because
    // lookup helpers only return tabs that still exist in `browser_tabs`.
    let webview_ptr = Retained::into_raw(webview);
    let new_id = state.next_tab_id.fetch_add(1, Ordering::Relaxed);
    {
        let Ok(mut tabs) = state.browser_tabs.lock() else {
            return Err("failed to lock tabs".to_owned());
        };
        tabs.push(BrowserTab {
            id: new_id,
            kind: BrowserTabKind::Dynamic,
            title: "New Tab".to_owned(),
            current_url: initial_url.to_owned(),
            last_committed_url: initial_url.to_owned(),
            can_go_back: false,
            can_go_forward: false,
            is_loading: initial_url != "about:blank",
            visible: true,
            webview_ptr: webview_ptr as *const WKWebView,
        });
        let active = if activate {
            new_id
        } else {
            state.current_tab.load(Ordering::Relaxed)
        };
        persistence::save_browser_session_snapshot(&tabs, active);
    }
    log_crash(
        "DEBUG",
        "new_tab",
        &format!("created tab {} for {}", new_id, initial_url),
    );

    if activate {
        switch_tab(new_id);
    } else {
        refresh_browser_ui();
    }
    Ok(new_id)
}

/// Closes a tab by runtime id and updates the active tab when necessary.
/// Workspace tabs are hidden, while dynamic tabs are removed from the runtime snapshot.
pub(crate) fn close_tab(tab_id: usize) -> Result<(), String> {
    if tab_id < TABS.len() {
        let state = APP_STATE
            .get()
            .ok_or_else(|| "app state not initialized".to_owned())?;
        let current = state.current_tab.load(Ordering::Relaxed);
        {
            let Ok(mut tabs) = state.browser_tabs.lock() else {
                return Err("failed to lock tabs".to_owned());
            };
            if let Some(tab) = tabs.iter_mut().find(|t| t.id == tab_id) {
                tab.visible = false;
            }
            if current == tab_id {
                let next = tabs
                    .iter()
                    .filter(|t| t.visible && t.id != tab_id)
                    .next()
                    .map(|t| t.id);
                if let Some(next_id) = next {
                    drop(tabs);
                    switch_tab(next_id);
                } else {
                    drop(tabs);
                    if let Some(wv) = webview_for_tab(tab_id) {
                        wv.setHidden(true);
                    }
                    refresh_browser_ui();
                }
            } else {
                drop(tabs);
                refresh_browser_ui();
            }
        }
        return Ok(());
    }
    let state = APP_STATE
        .get()
        .ok_or_else(|| "app state not initialized".to_owned())?;
    let current = state.current_tab.load(Ordering::Relaxed);
    let (removed_ptr, next_active, snapshot) = {
        let Ok(mut tabs) = state.browser_tabs.lock() else {
            return Err("failed to lock tabs".to_owned());
        };
        let Some(position) = tabs.iter().position(|tab| tab.id == tab_id) else {
            return Err(format!("tab {tab_id} not found"));
        };
        let removed = tabs.remove(position);
        let next_active = if current == tab_id {
            tabs.get(position.saturating_sub(1))
                .or_else(|| tabs.get(position))
                .map(|tab| tab.id)
                .unwrap_or(0)
        } else {
            current
        };
        let snapshot = tabs.clone();
        (removed.webview_ptr, next_active, snapshot)
    };

    // The dynamic `WKWebView` retain is intentionally leaked in `create_dynamic_tab`. Removing the
    // view detaches it from AppKit, but the object stays alive so any in-flight raw-pointer callback
    // can safely consult `tab_index_for_webview`/`webview_for_tab` and observe that the tab is gone.
    let webview = unsafe { &*removed_ptr };
    remove_view_from_superview(webview);
    let _ = std::fs::remove_file(cmd_file(tab_id));
    let _ = std::fs::remove_file(result_file(tab_id));
    let _ = std::fs::remove_file(screenshot_file(tab_id));
    let _ = std::fs::remove_file(upload_file(tab_id));

    persistence::save_browser_session_snapshot(&snapshot, next_active);
    if current == tab_id {
        switch_tab(next_active);
    } else {
        state.current_tab.store(next_active, Ordering::Relaxed);
        refresh_browser_ui();
    }
    Ok(())
}

fn workspace_allows_url(workspace: usize, url: &str) -> bool {
    let expected = url_host(TABS[workspace].url);
    let actual = url_host(url);
    !expected.is_empty() && expected == actual
}

/// Navigates a specific tab to a normalized URL after workspace safety checks.
/// Successful navigations mark the tab as loading and persist the new target URL.
pub(crate) fn navigate_tab_to_url(tab_id: usize, url: &str) -> Result<(), String> {
    let normalized = normalize_user_url(url).ok_or_else(|| format!("invalid input: {url}"))?;
    let state = APP_STATE
        .get()
        .ok_or_else(|| "app state not initialized".to_owned())?;
    let kind = {
        let Ok(tabs) = state.browser_tabs.lock() else {
            return Err("failed to lock tabs".to_owned());
        };
        tabs.iter().find(|tab| tab.id == tab_id).map(|tab| tab.kind)
    }
    .ok_or_else(|| format!("tab {tab_id} not found"))?;

    if let BrowserTabKind::Workspace(index) = kind {
        if !workspace_allows_url(index, &normalized) {
            return Err(format!(
                "workspace tab {index} only allows {}",
                TABS[index].url
            ));
        }
    }

    let request = make_request(&normalized)?;
    let webview = webview_for_tab(tab_id).ok_or_else(|| format!("tab {tab_id} missing webview"))?;
    unsafe {
        webview.loadRequest(&request);
    }
    set_tab_loading_state(tab_id, true);
    update_tab_url_hint(tab_id, &normalized);
    if tab_id < TABS.len() {
        persistence::save_tab_urls();
    } else {
        persistence::save_browser_session();
    }
    Ok(())
}

fn update_tab_url_hint(tab_id: usize, url: &str) {
    let Some(state) = APP_STATE.get() else { return };
    let Ok(mut tabs) = state.browser_tabs.lock() else {
        return;
    };
    if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == tab_id) {
        tab.current_url = url.to_owned();
        if !url.is_empty() {
            tab.last_committed_url = url.to_owned();
        }
        if tab.kind == BrowserTabKind::Dynamic && (tab.title.is_empty() || tab.title == "New Tab") {
            tab.title = url.to_owned();
        }
    }
    let active = state.current_tab.load(Ordering::Relaxed);
    persistence::save_browser_session_snapshot(&tabs, active);
}

/// Routes address-bar input to the active tab or a new dynamic tab as needed.
/// Workspace tabs reject cross-domain navigation and spill that request into a dynamic tab.
pub(crate) fn navigate_active_input(input: &str) -> Result<usize, String> {
    let normalized = normalize_user_url(input).ok_or_else(|| format!("invalid input: {input}"))?;
    let state = APP_STATE
        .get()
        .ok_or_else(|| "app state not initialized".to_owned())?;
    let active = state.current_tab.load(Ordering::Relaxed);
    let kind = {
        let Ok(tabs) = state.browser_tabs.lock() else {
            return Err("failed to lock tabs".to_owned());
        };
        tabs.iter().find(|tab| tab.id == active).map(|tab| tab.kind)
    }
    .ok_or_else(|| "active tab not found".to_owned())?;

    match kind {
        BrowserTabKind::Workspace(index) if !workspace_allows_url(index, &normalized) => {
            let new_id = create_dynamic_tab(Some(&normalized), true)?;
            Ok(new_id)
        }
        _ => {
            navigate_tab_to_url(active, &normalized)?;
            Ok(active)
        }
    }
}

/// Sends a back navigation command to the targeted tab or current active tab.
/// The tab is marked loading immediately so the chrome updates before WebKit callbacks land.
pub(crate) fn go_back(target: Option<usize>) -> Result<(), String> {
    let tab_id = target
        .or_else(active_tab_id)
        .ok_or_else(|| "no active tab".to_owned())?;
    let webview = webview_for_tab(tab_id).ok_or_else(|| format!("tab {tab_id} missing webview"))?;
    unsafe {
        webview.goBack();
    }
    set_tab_loading_state(tab_id, true);
    Ok(())
}

/// Sends a forward navigation command to the targeted tab or current active tab.
/// The tab is marked loading immediately so UI state stays responsive.
pub(crate) fn go_forward(target: Option<usize>) -> Result<(), String> {
    let tab_id = target
        .or_else(active_tab_id)
        .ok_or_else(|| "no active tab".to_owned())?;
    let webview = webview_for_tab(tab_id).ok_or_else(|| format!("tab {tab_id} missing webview"))?;
    unsafe {
        webview.goForward();
    }
    set_tab_loading_state(tab_id, true);
    Ok(())
}

/// Reloads the targeted tab or current active tab through WebKit.
/// The reload path also marks the tab as loading before delegate callbacks arrive.
pub(crate) fn reload_tab(target: Option<usize>) -> Result<(), String> {
    let tab_id = target
        .or_else(active_tab_id)
        .ok_or_else(|| "no active tab".to_owned())?;
    let webview = webview_for_tab(tab_id).ok_or_else(|| format!("tab {tab_id} missing webview"))?;
    unsafe {
        webview.reload();
    }
    set_tab_loading_state(tab_id, true);
    Ok(())
}

/// Recreates persisted dynamic tabs during startup and restores their saved titles.
/// Tabs are opened in the background so activation can be resolved afterward.
pub(crate) fn restore_dynamic_tabs(dynamic_tabs: &[SavedDynamicTab]) {
    for tab in dynamic_tabs {
        let url = if tab.url.trim().is_empty() {
            "about:blank"
        } else {
            tab.url.as_str()
        };
        if let Ok(id) = create_dynamic_tab(Some(url), false) {
            let Some(state) = APP_STATE.get() else { return };
            let Ok(mut tabs) = state.browser_tabs.lock() else {
                return;
            };
            if let Some(runtime_tab) = tabs.iter_mut().find(|runtime_tab| runtime_tab.id == id) {
                if !tab.title.trim().is_empty() {
                    runtime_tab.title = tab.title.clone();
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::{dynamic_tab_icon, tab_title_from_state};

    fn test_tab(kind: BrowserTabKind, url: &str, title: &str) -> BrowserTab {
        BrowserTab {
            id: 42,
            kind,
            title: title.to_owned(),
            current_url: url.to_owned(),
            last_committed_url: url.to_owned(),
            can_go_back: false,
            can_go_forward: false,
            is_loading: false,
            visible: true,
            webview_ptr: std::ptr::null(),
        }
    }

    #[test]
    fn workspace_allows_url_requires_matching_host() {
        assert_eq!(
            workspace_allows_url(0, "https://creator.douyin.com/path"),
            true
        );
        assert_eq!(
            workspace_allows_url(0, "https://creator.douyin.com:8443/path"),
            true
        );
        assert_eq!(workspace_allows_url(0, "https://example.com/path"), false);
    }

    #[test]
    fn tab_title_from_state_formats_workspace_and_dynamic_tabs() {
        let workspace = test_tab(BrowserTabKind::Workspace(0), TABS[0].url, "ignored");
        let dynamic = test_tab(BrowserTabKind::Dynamic, "https://github.com/openai", "Docs");

        assert_eq!(tab_title_from_state(&workspace), "抖 抖音".to_owned());
        assert_eq!(tab_title_from_state(&dynamic), "🐙 Docs".to_owned());
    }

    #[test]
    fn dynamic_tab_icon_maps_known_domains() {
        let github = test_tab(BrowserTabKind::Dynamic, "https://github.com/openai", "GitHub");
        let google = test_tab(BrowserTabKind::Dynamic, "https://google.com/search", "Google");
        let unknown = test_tab(BrowserTabKind::Dynamic, "https://example.com", "Example");

        assert_eq!(dynamic_tab_icon(&github), "🐙");
        assert_eq!(dynamic_tab_icon(&google), "🔍");
        assert_eq!(dynamic_tab_icon(&unknown), "🌐");
    }
}
