# Task — R13: Drag scene/asset from library → creates clip on timeline

## Goal
Wire HTML5 drag-and-drop so the user can drag a scene card from the left library (R10) onto a timeline track (R8) and the system creates a new clip at the drop position. The clip is added to `store.state.timeline`, timeline re-renders, and the clip becomes selected (R10 inspector shows its props).

## Requirements

### JS (`runtime/web/src/dnd/`)
- `dnd/index.js` — `export function initDragDrop({ store, scenes })` wires global dragstart/dragover/drop listeners
- `dnd/source.js` — helper to mark an element as a drag source: `makeDraggable(el, payload)` — sets `draggable="true"` and on `dragstart` sets `dataTransfer.setData('application/nextframe+json', JSON.stringify(payload))`
- `dnd/target.js` — `registerDropTarget(el, {accepts, onDrop})` — wires dragenter/dragover/dragleave/drop; prevents default only if the payload type matches `accepts` (array of strings like `['scene','media','audio']`); calls onDrop with parsed payload + mouse event

### Library integration
- R10's scene cards now use `makeDraggable(card, {type:'scene', id: sceneId})`
- Media/Audio cards use `{type:'media', assetId}` and `{type:'audio', assetId}`

### Timeline integration
- Each track (V1, V2, A1…) registered as a drop target via `registerDropTarget(trackEl, {accepts, onDrop})`
- accepts: video tracks accept `['scene','media']`; audio tracks accept `['audio']`
- On drop, compute drop X → time via `pxToTime(dropX - trackStartX)`, create a new clip:
  - For scene: `{id: newId(), start, dur: scene.duration_hint || 5, scene: sceneId, params: {...scene.default_params}}`
  - For media: similar, with asset reference
- Drop snaps to 0.1s grid (floor to 0.1s multiples) — simple snap for now
- If drop position causes overlap with existing clip on same track, reject drop (visual flash, no mutation)

### Store mutations
- `store.addClip(trackId, clip)` — immutable push, re-emit
- `store.selectClip(clipId)` — sets `selectedClipId`
- After successful drop, auto-select the new clip

### Visual feedback
- While dragging, target tracks highlight (add class `drop-accept` on dragenter, remove on dragleave)
- Show a ghost rectangle at the drop position following the cursor while dragging over a track
- On successful drop, brief flash animation (100ms) on the new clip

## Technical Constraints
- Pure ES modules, no deps
- No Rust changes
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace` all pass
- DOES NOT regress R8 timeline rendering or R10 library/inspector

## Code Structure
```
runtime/web/src/dnd/
├── index.js
├── source.js
└── target.js
```
Also modifies:
- `runtime/web/src/store.js` — adds addClip, selectClip mutations
- `runtime/web/src/panels/library/card.js` — uses makeDraggable
- `runtime/web/src/timeline/track.js` — uses registerDropTarget
- `runtime/web/index.html` — imports + initializes initDragDrop after other mounts

## Verification Commands
```bash
test -f runtime/web/src/dnd/index.js
test -f runtime/web/src/dnd/source.js
test -f runtime/web/src/dnd/target.js
grep -q 'initDragDrop' runtime/web/src/dnd/index.js
grep -q 'makeDraggable' runtime/web/src/dnd/source.js
grep -q 'registerDropTarget' runtime/web/src/dnd/target.js
grep -q 'application/nextframe+json' runtime/web/src/dnd/source.js
grep -qE 'addClip|mutate' runtime/web/src/store.js
grep -q 'initDragDrop' runtime/web/index.html
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
```

## Non-Goals
- NO clip move/resize (R14)
- NO blade tool (R15)
- NO undo (R18)
- NO visual thumbnail dragging (text-only ghost OK)
