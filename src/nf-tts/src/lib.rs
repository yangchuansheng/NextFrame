//! nf-tts library exports
mod config;
pub mod output {
    pub mod manifest;
}

pub use config::VoxConfig;
pub use output::manifest::{Manifest, ManifestEntry};
