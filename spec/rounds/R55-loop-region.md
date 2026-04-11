# Task — R55: Loop region (in/out points)

## Goal
Let user set in/out playback markers on the timeline. Playback loops between them when loop mode is on. Markers are draggable.

## Requirements

### Store
- `state.loopRegion: { in: number, out: number, enabled: bool }` — defaults `{in:0, out:30, enabled:false}`

### Ruler markers (`runtime/web/src/timeline/loop-region.js`)
- `export function mountLoopRegion(rulerEl, store, zoom)` injects two draggable triangle markers above the ruler
- "I" marker (in point) at left, "O" marker (out point) at right
- Drag horizontally to set time
- Highlighted bar between them when loop enabled

### Preview loop (`runtime/web/src/preview/loop.js`)
- When `loopRegion.enabled` is true and playhead reaches `loopRegion.out`, jump to `loopRegion.in`
- Otherwise normal behavior

### Keyboard
- `I` key: set loopRegion.in to current playhead
- `O` key: set loopRegion.out to current playhead
- `Shift+L`: toggle loopRegion.enabled

### Visual
- Subtle blue tint over the loop region in the timeline
- Markers: orange triangles, 10px wide

## Technical Constraints
- Pure ES modules
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/timeline/loop-region.js
grep -q 'loopRegion' runtime/web/src/store.js
grep -q 'loopRegion' runtime/web/src/preview/loop.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
