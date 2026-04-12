use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use crate::encoding::base64_encode;
use crate::fs::{resolve_existing_path, resolve_write_path};
use crate::path::home_dir;
use crate::time::iso_now;
use crate::validation::{
    require_object, require_string, require_value_alias, validate_project_component,
};

pub(crate) fn projects_root() -> PathBuf {
    home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("NextFrame")
        .join("projects")
}

pub(crate) fn handle_project_list(_params: &Value) -> Result<Value, String> {
    let root = projects_root();
    if !root.exists() {
        return Ok(json!({ "projects": [] }));
    }

    let mut projects: Vec<Value> = Vec::new();
    let entries = fs::read_dir(&root).map_err(|e| format!("failed to read projects dir: {e}"))?;

    for entry_result in entries {
        let entry = entry_result.map_err(|e| format!("dir entry error: {e}"))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let project_json = path.join("project.json");
        if !project_json.exists() {
            continue;
        }
        let content = fs::read_to_string(&project_json)
            .map_err(|e| format!("failed to read {}: {e}", project_json.display()))?;
        let meta: Value = serde_json::from_str(&content).unwrap_or_else(|_| json!({}));

        // count episode subdirs
        let episode_count = fs::read_dir(&path)
            .map(|rd| {
                rd.filter_map(Result::ok)
                    .filter(|e| e.path().is_dir() && e.path().join("episode.json").exists())
                    .count()
            })
            .unwrap_or(0);

        let updated = meta
            .get("updated")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();

        projects.push(json!({
            "name": meta.get("name").and_then(Value::as_str).unwrap_or_default(),
            "path": path.display().to_string(),
            "episodes": episode_count,
            "updated": updated,
        }));
    }

    projects.sort_by(|a, b| {
        let a_updated = a.get("updated").and_then(Value::as_str).unwrap_or("");
        let b_updated = b.get("updated").and_then(Value::as_str).unwrap_or("");
        b_updated.cmp(a_updated)
    });

    Ok(json!({ "projects": projects }))
}

pub(crate) fn handle_project_create(params: &Value) -> Result<Value, String> {
    let name = require_string(params, "name")?;
    let root = projects_root();
    let project_dir = root.join(name);
    if project_dir.exists() {
        return Err(format!("project '{}' already exists", name));
    }

    fs::create_dir_all(&project_dir).map_err(|e| format!("failed to create project dir: {e}"))?;

    let now = iso_now();
    let meta = json!({
        "name": name,
        "created": now,
        "updated": now,
    });

    let project_json = project_dir.join("project.json");
    fs::write(
        &project_json,
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    )
    .map_err(|e| format!("failed to write project.json: {e}"))?;

    Ok(json!({ "path": project_dir.display().to_string() }))
}

pub(crate) fn handle_episode_list(params: &Value) -> Result<Value, String> {
    let project = require_string(params, "project")?;
    let project_dir = projects_root().join(project);
    if !project_dir.exists() {
        return Err(format!("project '{}' not found", project));
    }

    let mut episodes: Vec<Value> = Vec::new();
    let entries =
        fs::read_dir(&project_dir).map_err(|e| format!("failed to read project dir: {e}"))?;

    for entry_result in entries {
        let entry = entry_result.map_err(|e| format!("dir entry error: {e}"))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let episode_json = path.join("episode.json");
        if !episode_json.exists() {
            continue;
        }
        let content = fs::read_to_string(&episode_json)
            .map_err(|e| format!("failed to read {}: {e}", episode_json.display()))?;
        let meta: Value = serde_json::from_str(&content).unwrap_or_else(|_| json!({}));

        // count segment .json files (excluding episode.json)
        let mut segment_count = 0;
        let mut total_duration = 0.0_f64;
        if let Ok(rd) = fs::read_dir(&path) {
            for seg_entry in rd.filter_map(Result::ok) {
                let seg_path = seg_entry.path();
                if seg_path.extension().and_then(|e| e.to_str()) == Some("json")
                    && seg_path.file_name().and_then(|n| n.to_str()) != Some("episode.json")
                {
                    segment_count += 1;
                    if let Ok(seg_content) = fs::read_to_string(&seg_path) {
                        if let Ok(seg_val) = serde_json::from_str::<Value>(&seg_content) {
                            if let Some(dur) = seg_val.get("duration").and_then(Value::as_f64) {
                                total_duration += dur;
                            }
                        }
                    }
                }
            }
        }

        let order = meta.get("order").and_then(Value::as_u64).unwrap_or(0);
        episodes.push(json!({
            "name": meta.get("name").and_then(Value::as_str).unwrap_or_default(),
            "path": path.display().to_string(),
            "order": order,
            "segments": segment_count,
            "totalDuration": total_duration,
        }));
    }

    episodes.sort_by_key(|e| e.get("order").and_then(Value::as_u64).unwrap_or(0));

    Ok(json!({ "episodes": episodes }))
}

pub(crate) fn handle_episode_create(params: &Value) -> Result<Value, String> {
    let project = require_string(params, "project")?;
    let name = require_string(params, "name")?;
    let project_dir = projects_root().join(project);
    if !project_dir.exists() {
        return Err(format!("project '{}' not found", project));
    }

    let episode_dir = project_dir.join(name);
    if episode_dir.exists() {
        return Err(format!("episode '{}' already exists", name));
    }

    // count existing episodes for order
    let order = fs::read_dir(&project_dir)
        .map(|rd| {
            rd.filter_map(Result::ok)
                .filter(|e| e.path().is_dir() && e.path().join("episode.json").exists())
                .count()
        })
        .unwrap_or(0);

    fs::create_dir_all(&episode_dir).map_err(|e| format!("failed to create episode dir: {e}"))?;

    let now = iso_now();
    let meta = json!({
        "name": name,
        "order": order,
        "created": now,
    });

    fs::write(
        episode_dir.join("episode.json"),
        serde_json::to_string_pretty(&meta).unwrap_or_default(),
    )
    .map_err(|e| format!("failed to write episode.json: {e}"))?;

    // update project.json updated timestamp
    let project_json_path = project_dir.join("project.json");
    if let Ok(content) = fs::read_to_string(&project_json_path) {
        if let Ok(mut project_meta) = serde_json::from_str::<Value>(&content) {
            if let Some(obj) = project_meta.as_object_mut() {
                obj.insert("updated".to_string(), json!(now));
                let _ = fs::write(
                    &project_json_path,
                    serde_json::to_string_pretty(&project_meta).unwrap_or_default(),
                );
            }
        }
    }

    Ok(json!({ "path": episode_dir.display().to_string() }))
}

pub(crate) fn handle_segment_list(params: &Value) -> Result<Value, String> {
    let project = require_string(params, "project")?;
    let episode = require_string(params, "episode")?;
    let episode_dir = projects_root().join(project).join(episode);
    if !episode_dir.exists() {
        return Err("episode directory not found".to_string());
    }

    let mut segments: Vec<Value> = Vec::new();
    let entries =
        fs::read_dir(&episode_dir).map_err(|e| format!("failed to read episode dir: {e}"))?;

    for entry_result in entries {
        let entry = entry_result.map_err(|e| format!("dir entry error: {e}"))?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        if path.file_name().and_then(|n| n.to_str()) == Some("episode.json") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let mut duration = 0.0_f64;
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(val) = serde_json::from_str::<Value>(&content) {
                duration = val.get("duration").and_then(Value::as_f64).unwrap_or(0.0);
            }
        }

        segments.push(json!({
            "name": name,
            "path": path.display().to_string(),
            "duration": duration,
        }));
    }

    segments.sort_by(|a, b| {
        let a_name = a.get("name").and_then(Value::as_str).unwrap_or("");
        let b_name = b.get("name").and_then(Value::as_str).unwrap_or("");
        a_name.cmp(b_name)
    });

    Ok(json!({ "segments": segments }))
}

pub(crate) fn handle_segment_video_url(params: &Value) -> Result<Value, String> {
    let project = require_string(params, "project")?;
    let episode = require_string(params, "episode")?;
    let segment = require_string(params, "segment")?;

    validate_project_component(project, "project")?;
    validate_project_component(episode, "episode")?;
    validate_project_component(segment, "segment")?;

    let video_path = projects_root()
        .join(project)
        .join(episode)
        .join(format!("{segment}.mp4"));

    if !video_path.is_file() {
        return Ok(json!({ "exists": false }));
    }

    Ok(json!({
        "exists": true,
        "path": video_path.display().to_string(),
    }))
}

pub(crate) fn handle_scene_list(params: &Value) -> Result<Value, String> {
    require_object(params)?;

    Ok(json!([
        {
            "id": "auroraGradient",
            "name": "Aurora Gradient",
            "category": "Backgrounds"
        },
        {
            "id": "kineticHeadline",
            "name": "Kinetic Headline",
            "category": "Typography"
        },
        {
            "id": "neonGrid",
            "name": "Neon Grid",
            "category": "Shapes & Layout"
        },
        {
            "id": "starfield",
            "name": "Starfield",
            "category": "Backgrounds"
        },
        {
            "id": "circleRipple",
            "name": "Circle Ripple",
            "category": "Shapes & Layout"
        },
        {
            "id": "countdown",
            "name": "Countdown",
            "category": "Typography"
        },
        {
            "id": "barChartReveal",
            "name": "Bar Chart Reveal",
            "category": "Data Viz"
        },
        {
            "id": "lineChart",
            "name": "Line Chart",
            "category": "Data Viz"
        },
        {
            "id": "lowerThirdVelvet",
            "name": "Lower Third Velvet",
            "category": "Overlays"
        },
        {
            "id": "cornerBadge",
            "name": "Corner Badge",
            "category": "Overlays"
        }
    ]))
}

pub(crate) fn handle_timeline_load(params: &Value) -> Result<Value, String> {
    let path = require_string(params, "path")?;
    let path_buf = resolve_existing_path(path)?;
    let contents = fs::read_to_string(&path_buf)
        .map_err(|error| format!("failed to read timeline '{}': {error}", path_buf.display()))?;

    serde_json::from_str(&contents)
        .map_err(|error| format!("failed to parse timeline '{}': {error}", path_buf.display()))
}

pub(crate) fn handle_timeline_save(params: &Value) -> Result<Value, String> {
    let path = require_string(params, "path")?;
    let path_buf = resolve_write_path(path)?;
    let json_value = require_value_alias(params, &["json", "timeline"])?;
    let serialized = serde_json::to_string_pretty(json_value).map_err(|error| {
        format!(
            "failed to serialize timeline for '{}': {error}",
            path_buf.display()
        )
    })?;

    let bytes_written = serialized.len();
    fs::write(&path_buf, serialized)
        .map_err(|error| format!("failed to write timeline '{}': {error}", path_buf.display()))?;

    Ok(json!({
        "path": path,
        "bytesWritten": bytes_written,
    }))
}

pub(crate) fn handle_preview_frame(params: &Value) -> Result<Value, String> {
    use std::io::Read as _;

    let timeline_path = require_string(params, "timelinePath")?;
    let t = params
        .get("t")
        .and_then(Value::as_f64)
        .ok_or_else(|| "preview.frame requires numeric 't' parameter".to_string())?;
    let width = params.get("width").and_then(Value::as_u64).unwrap_or(960);
    let height = params.get("height").and_then(Value::as_u64).unwrap_or(540);

    // render to temp file
    let tmp_dir = env::temp_dir().join("nextframe-preview");
    let _ = fs::create_dir_all(&tmp_dir);
    let out_path = tmp_dir.join(format!("frame-{}.png", t));

    // find nextframe CLI
    let cli_path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../nextframe-cli/bin/nextframe.js");

    let status = Command::new("node")
        .arg(&cli_path)
        .arg("frame")
        .arg(timeline_path)
        .arg(format!("{t}"))
        .arg(out_path.display().to_string())
        .arg(format!("--width={width}"))
        .arg(format!("--height={height}"))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|e| format!("failed to run nextframe frame: {e}"))?;

    if !status.success() {
        return Err(format!(
            "nextframe frame exited with code {}",
            status.code().unwrap_or(-1)
        ));
    }

    // read PNG and encode as base64
    let mut file = std::fs::File::open(&out_path)
        .map_err(|e| format!("failed to open rendered frame: {e}"))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes)
        .map_err(|e| format!("failed to read rendered frame: {e}"))?;

    // base64 encode (manual, no external crate)
    let b64 = base64_encode(&bytes);

    Ok(json!({
        "dataUrl": format!("data:image/png;base64,{b64}"),
        "width": width,
        "height": height,
        "t": t,
    }))
}
