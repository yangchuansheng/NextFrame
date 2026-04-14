# Task — R14: Clip move + edge resize

## Goal
Make existing clips on the timeline draggable: drag body to move, drag left/right edge to resize. Overlap rejection and min-duration enforced. Integrates with R13 dnd but is separate interaction (mouse-based, not HTML5 dnd).

## Requirements

### JS (`runtime/web/src/timeline/clip-interact.js`)
- `export function attachClipInteractions(clipEl, clipId, store, zoom)` attaches mousedown handlers:
  - Body area (center) → drag to move: on mousemove, compute new start = original + (dx / pxPerSecond), snap to 0.1s grid, on mouseup dispatch `moveClip({clipId, start})` through commands.js
  - Left edge (8px) → drag to set in: resize from left, updates `start` and decreases `dur`
  - Right edge (8px) → drag to set out: resize from right, updates `dur`
- Cursor changes: `grab` on body, `col-resize` on edges
- While dragging, show a light blue overlay on the clip + a tooltip near cursor showing current `start`-`end` time

### Store command
- `commands.js` exports `moveClipCommand({clipId, newStart, newDur})` that:
  - Captures prev state of clip
  - exec: updates that clip's start/dur, validates no overlap, aborts if overlap
  - invert: restores prev start/dur
- `dispatch` runs it through the history so Cmd+Z works

### Min duration
- Clip duration cannot be less than 0.1s; clamp during resize

### Non-overlap
- During move/resize, if the new range intersects another clip on same track, visual glows red and the mutation is rejected (no state change)

### Update R8 clip.js
- `timeline/clip.js` uses `attachClipInteractions` when rendering each clip

## Technical Constraints
- Pure ES modules, no deps
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace` all pass
- No regression: R13 drag-drop from library still works

## Verification Commands
```bash
test -f runtime/web/src/timeline/clip-interact.js
grep -q 'attachClipInteractions' runtime/web/src/timeline/clip-interact.js
grep -q 'attachClipInteractions' runtime/web/src/timeline/clip.js
grep -qE 'moveClip|moveClipCommand' runtime/web/src/commands.js
grep -qE 'col-resize' runtime/web/src/timeline/clip-interact.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
```

## Non-Goals
- NO blade/split (R15)
- NO snap to other clip edges beyond 0.1s grid (R17)
- NO delete/copy/paste (R16)
