//! nf-tts library exports
pub(crate) mod backend;
pub(crate) mod cache;
pub(crate) mod config;
pub(crate) mod lang;
pub(crate) mod output;
pub(crate) mod queue;
pub(crate) mod whisper;

pub use config::VoxConfig;
pub use output::manifest::{Manifest, ManifestEntry};
