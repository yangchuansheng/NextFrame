# Task — R9: Preview canvas + DPR + safe area + render loop plumbing

## Goal
Build the preview canvas module that mounts into `#center-preview`, sets up DPR-aware rendering, maintains 16:9 aspect ratio with letterboxing, and runs an rAF-driven render loop calling engine's `renderAt` with the current playhead time.

## Requirements

### JS (`runtime/web/src/preview/`)
- `preview/index.js` — `export function mountPreview(container, { engine, store })` inserts a wrapper + `<canvas>` into the container, sets up DPR via `engine.setupDPR(canvas)`, starts an rAF loop
- `preview/letterbox.js` — computes canvas inner rectangle (for configured `project.aspectRatio`, default 16:9) given container size; returns `{x, y, width, height}` in CSS pixels
- `preview/loop.js` — exports `createLoop({tick, getTime})` — rAF wrapper with pause/play/stop; `tick(t)` is called every frame when playing
- `preview/safeArea.js` — draws the title-safe (90%) and action-safe (95%) guide rectangles as optional overlays (toggled via `store.state.showSafeArea`)

### Integration
- `runtime/web/index.html` adds a `<script type="module">` that, on DOMContentLoaded, calls `mountPreview(document.getElementById('center-preview'), ...)` after timeline mount
- Preview canvas background is pure black (`#000`)
- The letterbox band around the canvas is `#0b0b14` (matches app bg), so the rounded black canvas visually floats
- When `store.state.playhead` changes, the loop reads it via `getTime()` — the loop does NOT subscribe directly; it polls each frame (simplest, avoids subscription cost)
- The loop starts paused; R20 will wire actual play/pause
- For this round, simulate: on mount, tick immediately at `t=0` so a single frame renders (proves the pipeline)
- Import `{ renderAt, setupDPR }` from `../engine/index.js` — do NOT modify engine

### Resize handling
- ResizeObserver on the container; re-compute letterbox and trigger a re-render at current time
- On resize, call `setupDPR` again to re-apply transform (watch out: avoid scaling twice)

### Store contract
- `store.state.playhead` (number, seconds)
- `store.state.playing` (bool)
- `store.state.showSafeArea` (bool, default false)
- `store.state.project` — `{ width: 1920, height: 1080, aspectRatio: 16/9 }` (seeded default)
- If `store.js` doesn't expose these yet, extend it (additive only; don't break R7 if it landed first)
- If `store.js` doesn't exist yet, create a minimal one: `export const store = { state: {...}, listeners: new Set(), subscribe(fn), mutate(recipe) }`

## Technical Constraints
- Pure ES modules, zero deps
- No changes to Rust crates
- `cargo fmt --check` + `cargo clippy --workspace --all-targets -- -D warnings` still pass (no Rust diff expected)
- Idempotent mount: calling `mountPreview` twice on same container is a no-op (or cleans up first)

## Code Structure
```
runtime/web/src/
├── preview/
│   ├── index.js
│   ├── letterbox.js
│   ├── loop.js
│   └── safeArea.js
├── store.js                  (create or extend — additive only)
└── (index.html gets a module script that mounts preview — under 30 lines of inline JS added)
```

## Verification Commands
```bash
test -f runtime/web/src/preview/index.js
test -f runtime/web/src/preview/letterbox.js
test -f runtime/web/src/preview/loop.js
test -f runtime/web/src/preview/safeArea.js
test -f runtime/web/src/store.js
grep -q 'mountPreview' runtime/web/src/preview/index.js
grep -q 'setupDPR' runtime/web/src/preview/index.js
grep -q 'ResizeObserver' runtime/web/src/preview/index.js
grep -q 'createLoop' runtime/web/src/preview/loop.js
grep -q 'mountPreview' runtime/web/index.html
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
node --input-type=module -e "import('./runtime/web/src/preview/loop.js').then(m => process.exit(typeof m.createLoop === 'function' ? 0 : 1))"
```

## Non-Goals
- NO actual scene playback logic (R20)
- NO audio sync (R22)
- NO frame-scrub optimization (R23)
- NO rendering scene content — only the pipeline; an empty canvas + background color at t=0 is fine
