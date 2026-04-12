use serde_json::{json, Value};

use crate::validation::require_string;

pub(crate) fn handle_log(params: &Value) -> Result<Value, String> {
    let level = require_string(params, "level")?;
    let message = require_string(params, "msg")?;

    match level {
        "error" => eprintln!("[webview][error] {message}"),
        _ => println!("[webview][{level}] {message}"),
    }

    Ok(json!({
        "logged": true,
        "level": level,
    }))
}
