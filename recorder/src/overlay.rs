use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[allow(clippy::too_many_arguments)]
pub fn write_perf_log(
    _out: &Path,
    frame_files: &[PathBuf],
    video_overlay: &Option<PathBuf>,
    total_frames: usize,
    skipped_frames: usize,
    content_duration: f64,
    record_secs: f64,
    overlay_secs: f64,
    fps: f64,
    size_mb: f64,
    pixel_size: (usize, usize),
    target_fps: usize,
    encoder: &str,
) {
    use std::io::Write;

    let mode = if video_overlay.is_some() {
        "clip"
    } else {
        "slide"
    };
    let skip_pct = if total_frames > 0 {
        skipped_frames as f64 / total_frames as f64 * 100.0
    } else {
        0.0
    };
    let total_secs = record_secs + overlay_secs;
    let realtime_x = if total_secs > 0.0 {
        content_duration / total_secs
    } else {
        0.0
    };
    let first_file = frame_files
        .first()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let line = format!(
        r#"{{"ts":{ts},"mode":"{mode}","file":"{first_file}","content_s":{content_duration:.1},"record_s":{record_secs:.1},"overlay_s":{overlay_secs:.1},"total_s":{total_secs:.1},"realtime_x":{realtime_x:.1},"fps":{fps:.1},"frames":{total_frames},"skipped":{skipped_frames},"skip_pct":{skip_pct:.1},"size_mb":{size_mb:.1},"resolution":"{}x{}","target_fps":{target_fps},"encoder":"{encoder}"}}"#,
        pixel_size.0, pixel_size.1,
    );

    let log_path = env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.join("perf.jsonl")))
        .unwrap_or_else(|| PathBuf::from("/tmp/recorder-perf.jsonl"));

    if let Ok(mut f) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = writeln!(f, "{line}");
        println!("  perf → {}", log_path.display());
    }
}

/// Overlay a source video into the recorded clip's black video area.
/// Video area: x:80 y:276 w:920 h:538 in 1080x1920 output.
pub fn overlay_video(recorded: &Path, video: &Path) -> Result<(), String> {
    use std::process::Command;

    println!("  overlay: {} → video area", video.display());
    let temp_out = recorded.with_extension("overlay.mp4");

    let filter = "[1:v]scale=920:538:force_original_aspect_ratio=decrease,\
         pad=920:538:(ow-iw)/2:(oh-ih)/2:black[vid];\
         [0:v][vid]overlay=80:276[out]"
        .to_string();

    let status = Command::new("ffmpeg")
        .args(["-y"])
        .args(["-i", &recorded.to_string_lossy()])
        .args(["-i", &video.to_string_lossy()])
        .args(["-filter_complex", &filter])
        .args(["-map", "[out]"])
        .args(["-map", "0:a"])
        .args(["-c:v", "h264_videotoolbox", "-q:v", "65"])
        .args(["-c:a", "copy"])
        .arg(&temp_out)
        .output()
        .map_err(|err| format!("ffmpeg failed to start: {err}"))?;

    if !status.status.success() {
        let stderr = String::from_utf8_lossy(&status.stderr);
        return Err(format!(
            "ffmpeg overlay failed:\n{}",
            &stderr[stderr.len().saturating_sub(300)..]
        ));
    }

    fs::rename(&temp_out, recorded)
        .map_err(|err| format!("failed to rename overlay output: {err}"))?;

    let size_mb = fs::metadata(recorded)
        .map(|meta| meta.len() as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);
    println!("  ✓ overlay done: {:.1} MB\n", size_mb);
    Ok(())
}
