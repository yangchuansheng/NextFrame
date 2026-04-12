//! CLI entry point for the recorder binary.

mod overlay;
mod parallel;
mod plan;
mod record;
mod util;

use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use clap::{Parser, Subcommand};
use objc2::MainThreadMarker;

use overlay::{overlay_video, write_perf_log};
use parallel::run_parallel;
use plan::{build_segment_plans, collect_frame_files, detect_root};
use record::record_segment;
use recorder::encoder::{concat_segments, detect_backend, probe_audio_duration};
use recorder::server::HttpFileServer;
use recorder::webview::WebViewHost;
use util::{absolute_path, auto_jobs, create_temp_dir};

#[derive(Parser, Debug)]
#[command(
    name = "recorder",
    version,
    about = "HTML slide → MP4. Two modes: `slide` (pure HTML) and `clip` (HTML + video overlay)."
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Record pure HTML slides (bridge, cover, toc, outro, etc.)
    Slide(SlideArgs),
    /// Record HTML template + overlay source video into the video area
    Clip(ClipArgs),
}

/// Shared recording options
#[derive(Parser, Debug, Clone)]
struct CommonArgs {
    /// HTML slide files to record (one or more)
    #[arg(value_name = "HTML")]
    pub frames: Vec<PathBuf>,

    /// Directory of HTML slides (alternative to listing files)
    #[arg(long, value_name = "DIR")]
    pub dir: Option<PathBuf>,

    /// Output MP4 path
    #[arg(long, value_name = "FILE", default_value = "output.mp4")]
    pub out: PathBuf,

    /// Target frame rate
    #[arg(long, value_name = "N", default_value_t = 30)]
    pub fps: usize,

    /// H.264 quality (lower = better, 14 is visually lossless)
    #[arg(long, value_name = "N", default_value_t = 14)]
    pub crf: u8,

    /// Device pixel ratio (2.0 = Retina, output is width*dpr x height*dpr)
    #[arg(long, value_name = "N", default_value_t = 2.0)]
    pub dpr: f64,

    /// Number of capture jobs (auto-detected from CPU/memory)
    #[arg(long, value_name = "N")]
    pub jobs: Option<usize>,

    /// Disable frame skipping (record every frame even if unchanged)
    #[arg(long)]
    pub no_skip: bool,

    /// Show the recording window (for debugging)
    #[arg(long)]
    pub headed: bool,

    /// CSS viewport width. Use 540 for vertical 9:16
    #[arg(long, value_name = "N", default_value_t = 540.0)]
    pub width: f64,

    /// CSS viewport height. Use 960 for vertical 9:16
    #[arg(long, value_name = "N", default_value_t = 960.0)]
    pub height: f64,

    /// Record slides in parallel using N processes (default: 4)
    #[arg(long, value_name = "N", default_missing_value = "4", num_args = 0..=1)]
    pub parallel: Option<usize>,

    /// Progress bar fill color as hex (e.g. #e8c47a). Default: #da7756
    #[arg(long, value_name = "HEX")]
    pub progress_color: Option<String>,
}

#[derive(Parser, Debug)]
struct SlideArgs {
    #[command(flatten)]
    common: CommonArgs,
}

#[derive(Parser, Debug)]
struct ClipArgs {
    #[command(flatten)]
    common: CommonArgs,

    /// Source video to overlay into the clip's video area (required).
    /// Video area: x:80 y:276 w:920 h:538 in 1080x1920 output.
    #[arg(long, value_name = "FILE")]
    video: PathBuf,
}

fn main() {
    if let Err(err) = run() {
        eprintln!("\n  ✗ {err}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let top = Cli::parse();
    let (cli, video_overlay) = match top.command {
        Command::Slide(args) => {
            println!("\n  mode: slide (pure HTML)");
            (args.common, None)
        }
        Command::Clip(args) => {
            let video = absolute_path(&args.video)?;
            if !video.exists() {
                return Err(format!("--video file not found: {}", video.display()));
            }
            println!("\n  mode: clip (HTML + video overlay)");
            println!("  video: {}", video.display());
            (args.common, Some(video))
        }
    };
    if cli.fps == 0 {
        return Err("--fps must be greater than 0".into());
    }
    if cli.dpr <= 0.0 {
        return Err("--dpr must be greater than 0".into());
    }

    let frame_files = collect_frame_files(&cli)?;
    if let Some(requested) = cli.parallel {
        let out = absolute_path(&cli.out)?;
        return run_parallel(&cli, &frame_files, &out, requested);
    }

    let root = detect_root(&frame_files)?;
    let out = absolute_path(&cli.out)?;
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

    let plans = build_segment_plans(&frame_files)?;
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
    let server = match HttpFileServer::start(root.clone()) {
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

    let backend = detect_backend();
    let mtm = MainThreadMarker::new().ok_or("recorder must start on the main thread")?;
    let mut host = WebViewHost::new(mtm, cli.headed, cli.dpr, cli.width, cli.height)?;
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
        .map(|p| {
            p.metadata
                .html_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("segment")
                .to_owned()
        })
        .collect();
    let total_segments = plans.len();
    let segment_durations: Vec<f64> = plans.iter().map(|p| p.effective_duration_sec).collect();
    let progress_color = cli
        .progress_color
        .as_ref()
        .and_then(|hex| recorder::progress::parse_hex_color(hex));
    if cli.progress_color.is_some() && progress_color.is_none() {
        eprintln!("  warn: invalid --progress-color, using default");
    }

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
                &cli,
                backend,
                total_segments,
                &segment_titles,
                &segment_durations,
                progress_color,
            )?;
            offset_sec += plan.effective_duration_sec;
            total_frames += summary.total_frames;

            // Auto-overlay for clip segments in slide mode:
            // If this HTML is a clip type and its audio_path points to a .mp4,
            // overlay the source video into the recorded segment's black video area.
            if video_overlay.is_none()
                && plan.metadata.slide_type == recorder::parser::SlideType::Clip
            {
                if let Some(ref audio) = plan.metadata.audio_path {
                    let ext = audio
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("");
                    if ext == "mp4" || ext == "mov" || ext == "webm" {
                        println!("  auto-overlay: clip segment {} → {}", index + 1, audio.display());
                        overlay_video(&summary.path, audio)?;
                    }
                }
            }

            segment_paths.push(summary.path.clone());
            summaries.push(summary);
        }

        println!("\n  ffmpeg concat...");
        concat_segments(&segment_paths, &out)?;

        // Self-verify: check output duration matches expected total
        if segment_paths.len() > 1 {
            let expected = total_duration_sec;
            match probe_audio_duration(Some(&out)) {
                Ok(actual) if actual > 0.0 => {
                    let delta = (actual - expected).abs();
                    if delta > 2.0 {
                        return Err(format!(
                            "concat duration mismatch: output {actual:.1}s vs expected {expected:.1}s (delta {delta:.1}s). \
                             This is a bug — segments have incompatible time_base."
                        ));
                    }
                    println!("  duration check: {actual:.1}s ≈ {expected:.1}s ✓");
                }
                _ => {
                    eprintln!("  warn: could not verify output duration");
                }
            }
        }

        Ok(())
    })();

    let _ = fs::remove_dir_all(&temp_root);
    recording_result?;

    let elapsed = started_at.elapsed();
    let output_size_mb = fs::metadata(&out)
        .map(|meta| meta.len() as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);
    let skipped_frames: usize = summaries.iter().map(|summary| summary.skipped_frames).sum();
    let fps = total_frames as f64 / elapsed.as_secs_f64().max(0.001);

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
        fps
    );

    let overlay_secs = if let Some(ref video_path) = video_overlay {
        let t0 = Instant::now();
        overlay_video(&out, video_path)?;
        t0.elapsed().as_secs_f64()
    } else {
        0.0
    };

    write_perf_log(
        &out,
        &frame_files,
        &video_overlay,
        total_frames,
        skipped_frames,
        total_duration_sec,
        elapsed.as_secs_f64(),
        overlay_secs,
        fps,
        output_size_mb,
        pixel_size,
        cli.fps,
        backend.label(),
    );

    Ok(())
}
