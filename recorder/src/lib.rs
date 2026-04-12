//! Shared recorder modules used by the CLI and benchmarks.

extern crate self as recorder;

use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct CommonArgs {
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

pub mod api;
pub mod capture;
pub mod clock;
pub mod encoder;
pub mod overlay;
pub mod parallel;
pub mod parser;
pub mod plan;
pub mod progress;
pub mod record;
pub mod server;
pub mod util;
pub mod webview;
