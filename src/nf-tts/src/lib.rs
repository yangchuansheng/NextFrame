//! nf-tts library exports
mod config;
mod output {
    pub(crate) mod manifest;
}

pub use config::VoxConfig;
pub use output::manifest::{Manifest, ManifestEntry};
