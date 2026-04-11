# Task — R26: ffmpeg audio mux for exported MP4

## Goal
After R25's recorder produces a silent video MP4, mux the project's audio tracks into it via ffmpeg to produce a final MP4 with video + audio. Integrate into the R25 export flow.

## Requirements

### Rust bridge extension (`bridge/src/lib.rs`)
- New method `export.muxAudio({videoPath, audioSources, outputPath})`:
  - `audioSources`: array of `{path, startTime, volume}`
  - Spawns `ffmpeg` as subprocess, builds filter_complex for mixing + delay
  - Returns `{ok, outputPath}` or `{ok:false, error}`
- Single ffmpeg invocation: `ffmpeg -y -i video.mp4 -i audio1.mp3 -i audio2.mp3 -filter_complex "...adelay...;...amix..." -map 0:v -map [aout] -c:v copy -c:a aac final.mp4`
- If no audio sources: skip ffmpeg, just copy videoPath → outputPath
- Detect ffmpeg availability at startup (cache `which ffmpeg` result)

### Export flow integration (R25's dialog.js)
- After `export.start` reports done:
  - Gather audio clips from `store.state.timeline.tracks.filter(t => t.kind === 'audio').flatMap(t => t.clips)`
  - Map each clip to `{path: asset.path, startTime: clip.start, volume: clip.volume || 1}`
  - Call `bridge.call('export.muxAudio', {videoPath: recorderOutput, audioSources, outputPath: finalPath})`
  - Update progress UI to show "Muxing audio..."
- If no audio tracks: skip (already handled by muxAudio stub behavior)

### Error handling
- ffmpeg not found → graceful error message "Install ffmpeg to export with audio. `brew install ffmpeg`"
- ffmpeg subprocess failure → surface stderr in UI

## Technical Constraints
- No new Rust deps (use std::process::Command)
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace`, `cargo test -p bridge` pass
- Bridge unit tests mock the ffmpeg command (don't actually spawn in tests)

## Verification Commands
```bash
grep -q 'export.muxAudio\|muxAudio' bridge/src/lib.rs
grep -q 'ffmpeg' bridge/src/lib.rs
grep -q 'muxAudio' runtime/web/src/export/dialog.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
cargo test -p bridge
```

## Non-Goals
- NO in-timeline audio effects
- NO ffmpeg alternatives (fail gracefully if missing)
