# NextFrame — AI-native video editor for scripted scenes, desktop editing, recording, and publishing.

## Build
cargo check --workspace
cargo test --workspace
bash scripts/lint-all.sh

## CLI
node src/nf-cli/bin/nextframe.js --help
node src/nf-cli/bin/nextframe.js scenes

## Core Rules
- Read `spec/standards/00-index.md` before non-trivial code changes.
- Do not add `unwrap`/`expect`/`panic`; workspace lints deny them.
- Errors returned to users or agents must include an actionable `Fix:` hint.
- Route browser/native behavior through `nf-bridge`; do not invent parallel IPC paths.
- Check scene contracts with `nextframe scenes <id>` before guessing timeline params.

## Modules
- `src/nf-cli/`: Node CLI, timeline commands, scene inspection, render entrypoints.
- `src/nf-runtime/web/`: browser runtime, stage rendering, and web components.
- `src/nf-shell/`: desktop shell and app-control transport.
- `src/nf-bridge/`: JSON IPC for project, timeline, storage, and export flows.
- `src/nf-recorder/`: WKWebView recorder and encoder pipeline.
- `src/nf-tts/`: TTS CLI, backends, alignment, and queueing.
- `src/nf-publish/`: macOS publisher automation via WKWebView tabs.
- `src/crates/`: shared pipeline crates for download, source, transcribe, align, and cut.

## Find Information
- Standards: `spec/standards/00-index.md` and `spec/standards/`
- Architecture: `spec/architecture/`
- CLI and scene contracts: `node src/nf-cli/bin/nextframe.js --help` and `node src/nf-cli/bin/nextframe.js scenes`
- Scene/component code: `src/nf-cli/src/scenes/` and `src/nf-runtime/web/src/components/`
- IPC methods: `src/nf-bridge/src/lib.rs` `dispatch` and `dispatch_inner`
