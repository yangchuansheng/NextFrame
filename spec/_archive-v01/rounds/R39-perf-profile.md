# Task — R39: Performance profiling + 60fps guarantee

## Goal
Profile the render loop under demo-timeline.json load, ensure 60fps sustained, add telemetry that surfaces frame drops in a dev console hook.

## Requirements

### Perf module (`runtime/web/src/preview/perf.js`)
- `export function createPerfMonitor()` — returns object with:
  - `tick(dt)` — called every rAF, records frame delta
  - `getStats()` → `{fps, p50Ms, p95Ms, p99Ms, drops}` over last 120 frames
  - `reset()`
- Uses circular buffer, no GC pressure

### Preview integration
- `preview/loop.js` or `preview/index.js` — call `perf.tick(dt)` each frame
- Expose `window.__nextframe_perf` returning `getStats()` for dev consoles
- Add a tiny FPS counter in the top-right of the preview canvas, toggleable via `P` key
- FPS counter: "FPS 60" green if ≥55, yellow if 40-54, red if <40

### Store
- `state.showPerf: false` (default)

### Light optimization
- Look for obvious perf bugs in hot paths:
  - Any `new Map`/`new Array` inside rAF tick (should be hoisted)
  - Any `document.querySelector` inside tick (cache upfront)
  - Any JSON.stringify/parse in tick (eliminate)
- Fix at most 3 of these; document fix in commit

## Technical Constraints
- Pure ES modules
- No new deps
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace`, `node runtime/web/test/bdd/run.mjs` pass
- No regression

## Verification Commands
```bash
test -f runtime/web/src/preview/perf.js
grep -q 'createPerfMonitor' runtime/web/src/preview/perf.js
grep -q 'showPerf' runtime/web/src/store.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
