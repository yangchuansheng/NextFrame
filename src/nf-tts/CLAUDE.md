# nf-tts — Agent-friendly TTS CLI with multi-backend synthesis and alignment.

## Build
`cargo check -p nf-tts`

## Core Constraints
- Keep provider-specific behavior inside `backend/`; CLI commands call shared interfaces.
- Subtitle timing comes from whisperX forced alignment; preserve original text verbatim.
- Machine-readable outputs flow through `output/`; do not print ad hoc status formats.
- Batch scheduling and concurrency belong in `queue/`, not individual commands.

## Module Structure
- `main.rs` + `cli/`: command parsing and subcommand entrypoints
- `backend/`: Edge and Volcengine synthesis implementations
- `queue/` + `output/`: batch jobs, manifests, events, SRT/timeline files
- `config.rs`, `lang.rs`, `cache/`: defaults, voice selection, local audio cache
- `whisper/`: forced-alignment pipeline and timeline model
