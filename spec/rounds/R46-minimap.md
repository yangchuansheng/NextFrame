# Task — R46: Timeline minimap

## Goal
Tiny overview of the whole timeline shown above the main timeline ruler, showing all clips as thin rectangles colored by category. Clicking/dragging jumps playhead.

## Requirements

### JS (`runtime/web/src/timeline/minimap.js`)
- `export function mountMinimap(container, store)` renders a 40px-tall minimap strip
- Each track becomes a horizontal row of clip rectangles scaled to `container.offsetWidth / timeline.duration`
- Playhead position shown as a white vertical line
- Current visible window shown as a semi-transparent box (computed from ruler scroll / zoom)
- Click on minimap → jumps playhead to that time
- Drag horizontally → scrolls main timeline to center view

### Integration
- `runtime/web/src/timeline/index.js` — mount minimap between the ruler and track list
- Sync with scroll position and zoom state

## Technical Constraints
- Pure ES modules, no deps
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/timeline/minimap.js
grep -q 'mountMinimap' runtime/web/src/timeline/minimap.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
