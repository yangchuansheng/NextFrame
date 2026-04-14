# nf-recorder — HTML-to-MP4 recorder built on WKWebView frame capture.

## Build
`cargo check -p nf-recorder --features cli`

## Core Constraints
- Recorder is frame-accurate: drive pages through `window.__onFrame`, never screen-record.
- AppKit/WebKit work stays on the main thread inside `webview/`, `capture/`, and `record/`.
- `api/` owns orchestration; parallel recording goes through `api::parallel`, not ad hoc spawning.
- Audio/video overlays are discovered via `parser/` and applied through `overlay/` + `encoder/`.

## Module Structure
- `lib.rs` / `main.rs`: shared library API and optional CLI
- `api/`: recording entrypoints and parallel orchestration
- `record/` + `webview/`: segment lifecycle, navigation, frame capture
- `parser/` + `plan.rs`: HTML metadata extraction and frame planning
- `encoder/` + `overlay/`: H.264 writing, concat, mux, video overlay
