//! Shared error formatting helpers for user-facing publish commands.

use std::fmt::Display;

pub(crate) fn error_with_fix(action: &str, reason: impl Display, fix: &str) -> String {
    format!("failed to {action}: {reason}. Fix: {fix}")
}

pub(crate) fn ensure_fix(err: impl Into<String>, action: &str, fix: &str) -> String {
    let err = err.into();
    if err.contains(". Fix: ") {
        err
    } else {
        error_with_fix(action, err, fix)
    }
}
