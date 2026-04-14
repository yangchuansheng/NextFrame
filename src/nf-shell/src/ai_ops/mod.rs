//! ai control module exports
mod control;
mod screenshot;
mod script;

use std::fmt::Display;

pub(crate) use control::{
    new_pending_appctl, poll_app_control_server, prune_expired_appctl_requests, PendingAppCtlMap,
    PendingAppCtlRequest,
};
pub(crate) use screenshot::{
    decode_query_component, default_screenshot_path, native_screenshot, now_unix_millis,
    query_value, split_path_and_query,
};
pub(crate) use script::{build_navigate_script, queue_appctl_script};

pub(crate) fn error_with_fix(action: &str, reason: impl Display, fix: &str) -> String {
    format!("failed to {action}: {reason}. Fix: {fix}")
}
