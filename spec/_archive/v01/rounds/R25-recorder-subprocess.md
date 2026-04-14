# Task — R25: Export → MP4 via recorder subprocess

## Goal
Wire the File → Export menu action so it:
1. Opens an Export dialog (resolution presets, output path)
2. Launches the MediaAgentTeam `recorder` binary as a subprocess, pointing it at `file://.../runtime/web/index.html?record=true`
3. Reports progress back to the UI
4. Opens the output file location when done

## Requirements

### Rust side (`bridge/src/lib.rs`)
- New bridge method `export.start({outputPath, width, height, fps, duration})` which:
  - Spawns the recorder binary from `MediaAgentTeam/recorder` (path resolution: look first at `$NEXTFRAME_RECORDER_PATH` env var, fall back to `../MediaAgentTeam/recorder/target/release/recorder`, final fallback to `cargo run --release -p recorder --manifest-path ../MediaAgentTeam/recorder/Cargo.toml`)
  - Pass args: `--url file://$(pwd)/runtime/web/index.html?record=true`, `--out {outputPath}`, `--width {width}`, `--height {height}`, `--fps {fps}`, `--duration {duration}`
  - Returns `{ok, pid, logPath}`
- New method `export.status(pid)` returns `{state: "running"|"done"|"failed", percent, eta, outputPath, error}`
- New method `export.cancel(pid)` kills the subprocess
- The bridge tracks all spawned processes in a `HashMap<pid, ProcessHandle>` guarded by a Mutex

### JS side (`runtime/web/src/export/`)
- `export/dialog.js` — `showExportDialog({store})` builds a modal HTML overlay with:
  - Resolution presets (1080p, 720p, 480p)
  - FPS presets (30, 60, 24)
  - Output path (default: `~/Movies/NextFrame/{projectName}-{timestamp}.mp4`, user can change via rfd)
  - Duration (defaults to timeline duration)
  - Start / Cancel buttons
- On Start: calls `bridge.call('export.start', {...})`, shows progress bar polling `export.status` every 500ms
- On done: show "Reveal in Finder" button that calls `bridge.call('fs.reveal', {path})` (add fs.reveal too)

### Menu
- R7 added File → Export menu item; wire it to call `showExportDialog`

## Technical Constraints
- New deps OK: the bridge may need `std::process::Command` (already in std), but if cross-platform path resolution is needed, add nothing extra
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace`, `cargo test -p bridge` all pass
- No test that actually spawns recorder (non-deterministic); instead mock-test the bridge's spawn arg construction
- Recorder may not exist on CI — in that case `export.start` returns `{ok:false, error:"recorder_not_found"}` gracefully

## Verification Commands
```bash
grep -q 'export.start' bridge/src/lib.rs
grep -q 'export.status' bridge/src/lib.rs
grep -q 'showExportDialog' runtime/web/src/export/dialog.js
grep -q 'fs.reveal' bridge/src/lib.rs
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
cargo test -p bridge
test -f runtime/web/src/export/dialog.js
```

## Non-Goals
- NO audio mux (R26)
- NO parallel recording (one at a time)
