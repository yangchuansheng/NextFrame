use std::env;
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Instant;

use objc2::MainThreadMarker;
use serde::{Deserialize, Serialize};

use crate::CommonArgs;
use crate::overlay::{overlay_video, write_perf_log};
use crate::parser::SlideType;
use crate::plan::{build_segment_plans, collect_frame_files, detect_root};
use crate::record::record_segment;
use crate::util::{absolute_path, auto_jobs, create_temp_dir};
use crate::{encoder, server, webview};

pub const OUTPUT_JSON_ENV: &str = "NEXTFRAME_RECORDER_OUTPUT_JSON";
const RECORDER_PATH_ENV: &str = "NEXTFRAME_RECORDER_PATH";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordArgs {
    pub frames: Vec<PathBuf>,
    pub dir: Option<PathBuf>,
    pub out: PathBuf,
    pub fps: usize,
    pub crf: u8,
    pub dpr: f64,
    pub jobs: Option<usize>,
    pub no_skip: bool,
    pub headed: bool,
    pub width: f64,
    pub height: f64,
    pub parallel: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordOutput {
    pub output_path: PathBuf,
    pub total_frames: usize,
    pub skipped_frames: usize,
    pub duration_sec: f64,
}

impl From<RecordArgs> for CommonArgs {
    fn from(args: RecordArgs) -> Self {
        Self {
            frames: args.frames,
            dir: args.dir,
            out: args.out,
            fps: args.fps,
            crf: args.crf,
            dpr: args.dpr,
            jobs: args.jobs,
            no_skip: args.no_skip,
            headed: args.headed,
            width: args.width,
            height: args.height,
            parallel: args.parallel,
        }
    }
}

pub fn record_segments(args: RecordArgs) -> Result<RecordOutput, String> {
    validate_args(&args)?;

    let cli: CommonArgs = args.clone().into();
    let frame_files = collect_frame_files(&cli)?;
    let out = absolute_path(&cli.out)?;

    match cli.parallel {
        Some(requested) => record_parallel(&args, &frame_files, &out, requested),
        None => record_single(&cli, &frame_files, &out),
    }
}

pub fn overlay_output(recorded: &Path, video: &Path) -> Result<(), String> {
    overlay_video(recorded, video)
}

fn validate_args(args: &RecordArgs) -> Result<(), String> {
    if args.fps == 0 {
        return Err("--fps must be greater than 0".into());
    }
    if args.dpr <= 0.0 {
        return Err("--dpr must be greater than 0".into());
    }
    Ok(())
}

fn record_single(
    cli: &CommonArgs,
    frame_files: &[PathBuf],
    out: &Path,
) -> Result<RecordOutput, String> {
    let root = detect_root(frame_files)?;
    let requested_jobs = cli.jobs.unwrap_or_else(|| auto_jobs(cli.dpr));
    let effective_jobs = 1usize;

    println!("\n  recorder — CALayer.render + takeSnapshot fallback + VideoToolbox");
    println!("  frames: {}", frame_files.len());
    println!(
        "  output: {}x{} @{}fps CRF{} DPR {:.2}",
        (cli.width * cli.dpr).round() as usize,
        (cli.height * cli.dpr).round() as usize,
        cli.fps,
        cli.crf,
        cli.dpr
    );
    println!("  jobs: {requested_jobs} requested, {effective_jobs} active capture lane");
    println!("  file: {}\n", out.display());

    let plans = build_segment_plans(frame_files)?;
    let total_duration_sec: f64 = plans.iter().map(|plan| plan.effective_duration_sec).sum();
    let total_frame_budget: usize = plans
        .iter()
        .map(|plan| ((plan.effective_duration_sec + 0.5) * cli.fps as f64).ceil() as usize)
        .sum();
    println!(
        "  total audio: {:.1}s -> {} frames\n",
        total_duration_sec, total_frame_budget
    );

    let temp_root = create_temp_dir()?;
    let server = match server::HttpFileServer::start(root.clone()) {
        Ok(server) => {
            println!("  server: {}\n", server.base_url());
            Some(server)
        }
        Err(err) => {
            eprintln!("  warn server disabled: {err}");
            eprintln!("  warn falling back to file:// loadFileURL mode\n");
            None
        }
    };

    let backend = encoder::detect_backend();
    let mtm = MainThreadMarker::new().ok_or("recorder must start on the main thread")?;
    let mut host = webview::WebViewHost::new(mtm, cli.headed, cli.dpr, cli.width, cli.height)?;
    let pixel_size = host.target_pixel_size();
    println!(
        "  capture: {}x{} ({})\n",
        pixel_size.0,
        pixel_size.1,
        backend.label()
    );

    let started_at = Instant::now();
    let mut offset_sec = 0.0f64;
    let mut segment_paths = Vec::with_capacity(plans.len());
    let mut summaries = Vec::with_capacity(plans.len());
    let mut total_frames = 0usize;
    let segment_titles: Vec<String> = plans
        .iter()
        .map(|plan| {
            plan.metadata
                .html_path
                .file_stem()
                .and_then(|stem| stem.to_str())
                .unwrap_or("segment")
                .to_owned()
        })
        .collect();
    let total_segments = plans.len();
    let segment_durations: Vec<f64> = plans
        .iter()
        .map(|plan| plan.effective_duration_sec)
        .collect();

    let recording_result = (|| -> Result<(), String> {
        for (index, plan) in plans.iter().enumerate() {
            let summary = record_segment(
                &mut host,
                server.as_ref(),
                &root,
                plan,
                index,
                &temp_root,
                offset_sec,
                total_duration_sec,
                cli,
                backend,
                total_segments,
                &segment_titles,
                &segment_durations,
                None,
            )?;
            offset_sec += plan.effective_duration_sec;
            total_frames += summary.total_frames;

            if plan.metadata.slide_type == SlideType::Clip {
                if let Some(ref audio) = plan.metadata.audio_path {
                    let ext = audio.extension().and_then(|ext| ext.to_str()).unwrap_or("");
                    if matches!(ext, "mp4" | "mov" | "webm") {
                        println!(
                            "  auto-overlay: clip segment {} → {}",
                            index + 1,
                            audio.display()
                        );
                        overlay_video(&summary.path, audio)?;
                    }
                }
            }

            segment_paths.push(summary.path.clone());
            summaries.push(summary);
        }

        concat_output(&segment_paths, out, total_duration_sec)?;
        Ok(())
    })();

    let _ = fs::remove_dir_all(&temp_root);
    recording_result?;

    let elapsed = started_at.elapsed();
    let output_size_mb = fs::metadata(out)
        .map(|meta| meta.len() as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);
    let skipped_frames: usize = summaries.iter().map(|summary| summary.skipped_frames).sum();
    let measured_fps = total_frames as f64 / elapsed.as_secs_f64().max(0.001);

    println!("\n  ✓ {}", out.display());
    println!(
        "  {:.1} MB | {}x{} | {}fps | {} | skipped {}",
        output_size_mb,
        pixel_size.0,
        pixel_size.1,
        cli.fps,
        backend.label(),
        skipped_frames
    );
    println!(
        "  {} frames in {:.2}s = {:.1} fps\n",
        total_frames,
        elapsed.as_secs_f64(),
        measured_fps
    );

    write_perf_log(
        out,
        frame_files,
        &None,
        total_frames,
        skipped_frames,
        total_duration_sec,
        elapsed.as_secs_f64(),
        0.0,
        measured_fps,
        output_size_mb,
        pixel_size,
        cli.fps,
        backend.label(),
    );

    Ok(RecordOutput {
        output_path: out.to_path_buf(),
        total_frames,
        skipped_frames,
        duration_sec: total_duration_sec,
    })
}

fn record_parallel(
    args: &RecordArgs,
    frame_files: &[PathBuf],
    out: &Path,
    requested: usize,
) -> Result<RecordOutput, String> {
    let cpus = std::thread::available_parallelism()
        .map(|value| value.get())
        .unwrap_or(4);
    let num_procs = if requested == 0 {
        frame_files.len().min(cpus / 2).clamp(1, 4)
    } else {
        requested.min(frame_files.len()).max(1)
    };

    if num_procs <= 1 {
        return Err("--parallel 1 is equivalent to serial mode; omit --parallel".into());
    }

    let exe = resolve_parallel_executable()?;
    let temp_root = create_temp_dir()?;
    let chunk_size = frame_files.len().div_ceil(num_procs);
    let groups: Vec<&[PathBuf]> = frame_files.chunks(chunk_size).collect();
    let actual_procs = groups.len();
    let group_sizes: Vec<usize> = groups.iter().map(|group| group.len()).collect();

    println!(
        "\n  parallel: {} processes, {} files ({})\n",
        actual_procs,
        frame_files.len(),
        group_sizes
            .iter()
            .map(|count| count.to_string())
            .collect::<Vec<_>>()
            .join("/")
    );

    let started_at = Instant::now();
    let mut children = Vec::with_capacity(actual_procs);
    let mut group_outputs = Vec::with_capacity(actual_procs);
    let mut group_result_files = Vec::with_capacity(actual_procs);

    for (idx, group) in groups.iter().enumerate() {
        let group_out = temp_root.join(format!("group-{idx:02}.mp4"));
        let group_result = temp_root.join(format!("group-{idx:02}.json"));
        let group_args = RecordArgs {
            frames: group.to_vec(),
            dir: None,
            out: group_out.clone(),
            fps: args.fps,
            crf: args.crf,
            dpr: args.dpr,
            jobs: args.jobs,
            no_skip: args.no_skip,
            headed: args.headed,
            width: args.width,
            height: args.height,
            parallel: None,
        };

        let mut cmd = Command::new(&exe);
        cmd.args(build_cli_args(&group_args));
        cmd.env(OUTPUT_JSON_ENV, &group_result);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let child = cmd
            .spawn()
            .map_err(|err| format!("failed to spawn recorder process {}: {err}", idx + 1))?;
        println!(
            "  [{}] spawned (pid {}, {} slides)",
            idx + 1,
            child.id(),
            group.len()
        );

        children.push(child);
        group_outputs.push(group_out);
        group_result_files.push(group_result);
    }

    let mut failed = false;
    for (idx, child) in children.into_iter().enumerate() {
        let output = child
            .wait_with_output()
            .map_err(|err| format!("failed to wait for process {}: {err}", idx + 1))?;

        if output.status.success() {
            println!("  [{}] done", idx + 1);
        } else {
            eprintln!(
                "  [{}] FAILED (exit {}): {}",
                idx + 1,
                output.status,
                String::from_utf8_lossy(&output.stderr).trim()
            );
            failed = true;
        }
    }

    if failed {
        let _ = fs::remove_dir_all(&temp_root);
        return Err(format!(
            "one or more parallel recorder processes failed; set {RECORDER_PATH_ENV} to the recorder CLI binary when using library-driven parallel mode"
        ));
    }

    for (idx, path) in group_outputs.iter().enumerate() {
        if !path.exists() {
            let _ = fs::remove_dir_all(&temp_root);
            return Err(format!(
                "group {} output missing: {}",
                idx + 1,
                path.display()
            ));
        }
    }

    let mut total_frames = 0usize;
    let mut skipped_frames = 0usize;
    let mut duration_sec = 0.0f64;
    for (idx, result_path) in group_result_files.iter().enumerate() {
        let bytes = fs::read(result_path).map_err(|err| {
            format!(
                "failed to read group {} result {}: {err}",
                idx + 1,
                result_path.display()
            )
        })?;
        let group_output: RecordOutput = serde_json::from_slice(&bytes).map_err(|err| {
            format!(
                "failed to decode group {} result {}: {err}",
                idx + 1,
                result_path.display()
            )
        })?;
        total_frames += group_output.total_frames;
        skipped_frames += group_output.skipped_frames;
        duration_sec += group_output.duration_sec;
    }

    println!("\n  concat {} groups...", actual_procs);
    let concat_result = concat_output(&group_outputs, out, duration_sec);
    let _ = fs::remove_dir_all(&temp_root);
    concat_result?;

    let elapsed = started_at.elapsed();
    let output_size_mb = fs::metadata(out)
        .map(|meta| meta.len() as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);

    println!("\n  ✓ {}", out.display());
    println!(
        "  {:.1} MB | {} processes | {:.1}s total\n",
        output_size_mb,
        actual_procs,
        elapsed.as_secs_f64()
    );

    Ok(RecordOutput {
        output_path: out.to_path_buf(),
        total_frames,
        skipped_frames,
        duration_sec,
    })
}

fn concat_output(
    segment_paths: &[PathBuf],
    out: &Path,
    expected_duration_sec: f64,
) -> Result<(), String> {
    println!("\n  ffmpeg concat...");
    encoder::concat_segments(segment_paths, out)?;

    if segment_paths.len() > 1 {
        match encoder::probe_audio_duration(Some(out)) {
            Ok(actual) if actual > 0.0 => {
                let delta = (actual - expected_duration_sec).abs();
                if delta > 2.0 {
                    return Err(format!(
                        "concat duration mismatch: output {actual:.1}s vs expected {expected_duration_sec:.1}s (delta {delta:.1}s). \
                         This is a bug — segments have incompatible time_base."
                    ));
                }
                println!("  duration check: {actual:.1}s ≈ {expected_duration_sec:.1}s ✓");
            }
            _ => {
                eprintln!("  warn: could not verify output duration");
            }
        }
    }

    Ok(())
}

fn resolve_parallel_executable() -> Result<PathBuf, String> {
    if let Some(path) = env::var_os(RECORDER_PATH_ENV).map(PathBuf::from) {
        if path.is_file() {
            return Ok(path);
        }
        return Err(format!(
            "{RECORDER_PATH_ENV} does not point to a file: {}",
            path.display()
        ));
    }

    let current = env::current_exe()
        .map_err(|err| format!("failed to find current executable for parallel recorder: {err}"))?;
    if current.is_file() {
        return Ok(current);
    }

    Err(format!(
        "failed to resolve recorder executable; set {RECORDER_PATH_ENV} to the nextframe-recorder CLI binary"
    ))
}

fn build_cli_args(args: &RecordArgs) -> Vec<OsString> {
    let mut cli_args = Vec::with_capacity(args.frames.len() + 16);
    cli_args.push(OsString::from("slide"));
    for frame in &args.frames {
        cli_args.push(frame.as_os_str().to_os_string());
    }
    cli_args.push(OsString::from("--out"));
    cli_args.push(args.out.as_os_str().to_os_string());
    cli_args.push(OsString::from("--fps"));
    cli_args.push(OsString::from(args.fps.to_string()));
    cli_args.push(OsString::from("--crf"));
    cli_args.push(OsString::from(args.crf.to_string()));
    cli_args.push(OsString::from("--dpr"));
    cli_args.push(OsString::from(args.dpr.to_string()));
    cli_args.push(OsString::from("--width"));
    cli_args.push(OsString::from(args.width.to_string()));
    cli_args.push(OsString::from("--height"));
    cli_args.push(OsString::from(args.height.to_string()));

    if let Some(jobs) = args.jobs {
        cli_args.push(OsString::from("--jobs"));
        cli_args.push(OsString::from(jobs.to_string()));
    }
    if args.no_skip {
        cli_args.push(OsString::from("--no-skip"));
    }
    if args.headed {
        cli_args.push(OsString::from("--headed"));
    }

    cli_args
}
