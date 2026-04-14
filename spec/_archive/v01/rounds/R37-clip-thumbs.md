# Task — R37: Timeline clip thumbnails

## Goal
Each visual clip on the timeline shows a mini canvas thumbnail of its scene. When user zooms out, thumbnails stay legible. Mirrors R35 library thumbnails but rendered inside the clip rectangle.

## Requirements

### Clip rendering (`runtime/web/src/timeline/clip.js`)
- When creating a video clip element, inject a small `<canvas>` element sized to fit the clip width (with min 48px)
- Render scene at `clip.start + clip.dur * 0.5` (hero frame) via `engine.renderAt` with the clip's params
- If clip width < 48px OR scene not registered, skip thumbnail (show label only)
- Thumbnail is placed as background layer; label + handles on top
- DPR-aware backing store
- Re-render thumbnail if clip width changes (zoom / resize)

### Non-regression
- Audio clips keep their waveform rendering (R22)
- Library cards (R35) keep their thumbnails
- Drag interactions (R13/R14) still work through the thumbnail canvas (CSS pointer-events)

## Technical Constraints
- Pure ES modules
- No new deps
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace`, `node runtime/web/test/bdd/run.mjs` pass

## Verification Commands
```bash
grep -qE 'canvas|Canvas' runtime/web/src/timeline/clip.js
grep -q 'renderAt' runtime/web/src/timeline/clip.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
