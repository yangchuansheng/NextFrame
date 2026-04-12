# Task — R17: Magnetic snap for clip move/resize

## Goal
Add snap-to-grid, snap-to-playhead, snap-to-clip-edges to R14's clip move/resize interactions. Toggle snap on/off globally via `store.state.snapEnabled` (default true). Hold Opt/Alt during drag to temporarily disable snap.

## Requirements

### Snap logic (`runtime/web/src/timeline/snap.js`)
- `export function computeSnap({candidateTime, timeline, playhead, zoom, strength = 0.1}) → number`
- Returns the closest snap point within `strength` seconds:
  - Playhead time
  - Every other clip's `start` and `start+dur` (ignoring the clip being dragged)
  - Grid tick: 0.5s, 1s, 5s, 10s multiples (depending on zoom level)
- Snap strength scales inversely with pxPerSecond — higher zoom = smaller threshold

### Integration (clip-interact.js)
- During drag (move), call `computeSnap` on the proposed new start; if result is in-range, use snapped value
- During edge resize (in), snap the new `start`
- During edge resize (out), snap the new `end` = `start + dur`
- When Alt/Option key is held, bypass snap
- When snap applies, draw a faint vertical guide line at the snap point for 60ms

### Store
- Add `state.snapEnabled: true`
- Menu item `View → Toggle Snap` flips it (add to R7 menu)
- Shortcut `S` toggles snap (when not in editable field)

## Technical Constraints
- Pure ES modules, no deps
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace` pass
- No regression of R14

## Verification Commands
```bash
test -f runtime/web/src/timeline/snap.js
grep -q 'computeSnap' runtime/web/src/timeline/snap.js
grep -q 'computeSnap' runtime/web/src/timeline/clip-interact.js
grep -q 'snapEnabled' runtime/web/src/store.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
```

## Non-Goals
- NO snap to audio transients
- NO snap guides across tracks (only same-track for now)
