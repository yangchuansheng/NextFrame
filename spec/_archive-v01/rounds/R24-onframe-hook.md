# Task — R24: window.__onFrame contract for recorder subprocess

## Goal
Expose a `window.__onFrame` function the recorder subprocess can call to advance one frame at a time, render, and receive a callback with the rendered canvas bytes. This is the contract MediaAgentTeam's existing recorder relies on.

## Requirements

### JS contract (`runtime/web/src/export/onframe.js`)
- `export function installOnFrame({ engine, store, preview })` attaches `window.__onFrame` to globalThis/window
- `window.__onFrame(timeSeconds, fps)` is synchronous:
  1. Sets `store.state.playhead = timeSeconds` (bypass dispatcher — direct set, no history)
  2. Forces the preview canvas to re-render at that exact time via `engine.renderAt(ctx, store.state.timeline, timeSeconds)`
  3. Returns an object `{ok: true, t: timeSeconds}` or throws on error
- `window.__onFrame_getImageData()` — returns `ctx.getImageData(...)` of the preview canvas as a plain data URL or binary buffer (recorder will read via screencapture API — this is a fallback for unit tests)
- `window.__onFrame_meta` — readonly object `{width, height, duration, fps}` for the recorder to query before starting

### Integration
- `index.html` module script calls `installOnFrame({engine, store, preview})` after mountPreview; takes the canvas from `preview` return value (R9's mountPreview should return `{canvas, ctx}` — if it doesn't, augment R9's implementation to return this)
- `preview/index.js` ensures the rAF loop is PAUSED while `__onFrame` is actively being called (avoid double-advancing). Add a `preview.setRecordingMode(true/false)` helper
- When `window.__onFrame` is invoked, pause the rAF loop for safety

### Recorder README update
- `runtime/web/src/export/README.md` (new): documents the contract so an external recorder (Rust subprocess) knows what to call. Includes the exact function signature and expected behavior.

## Technical Constraints
- Pure ES modules
- No new Rust deps
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace` all pass
- No regression: demo autoplay (R11) still works when `window.__onFrame` is not in recording mode

## Code Structure
```
runtime/web/src/export/
├── onframe.js          (new)
└── README.md           (new)
runtime/web/src/preview/index.js    (minor update: return {canvas, ctx, setRecordingMode})
runtime/web/index.html              (call installOnFrame after mountPreview)
```

## Verification Commands
```bash
test -f runtime/web/src/export/onframe.js
test -f runtime/web/src/export/README.md
grep -q 'installOnFrame' runtime/web/src/export/onframe.js
grep -q '__onFrame' runtime/web/src/export/onframe.js
grep -q 'setRecordingMode' runtime/web/src/preview/index.js
grep -q 'installOnFrame' runtime/web/index.html
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node --input-type=module -e "import('./runtime/web/src/export/onframe.js').then(m => process.exit(typeof m.installOnFrame === 'function' ? 0 : 1))"
```

## Non-Goals
- NO actual recorder subprocess spawn (R25)
- NO audio mux (R26)
