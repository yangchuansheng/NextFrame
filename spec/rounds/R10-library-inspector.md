# Task — R10: Left asset library + right inspector panels (interactive)

## Goal
Replace R6's placeholder left library and right inspector with functional panels:
- Left: Asset Library with tabs (Scenes / Media / Audio) — Scenes tab reads from the scene registry (R5), Media/Audio list imported assets
- Right: Inspector — shows properties of the currently selected clip, with schema-driven property editors

## Requirements

### Left Library (`runtime/web/src/panels/library/`)
- `library/index.js` — `export function mountLibrary(container, { store, scenes })` mounts the library into `#left-library`
- Top tabs: Scenes | Media | Audio (buttons, one active)
- Grid of items:
  - **Scenes**: each scene from `SCENE_MANIFEST` as a card with icon (procedural CSS gradient based on category color), name, hint text. Draggable (stub: set `draggable="true"`, sets `dataTransfer` with `{type:'scene', id}`)
  - **Media**: placeholder list of imported video/image assets (read from `store.state.assets.filter(a => a.kind === 'video' || a.kind === 'image')`)
  - **Audio**: same for audio assets
- Search bar at top of library filters visible items
- Empty state: "No media yet — File → Import" centered placeholder when Media/Audio tabs are empty

### Right Inspector (`runtime/web/src/panels/inspector/`)
- `inspector/index.js` — `export function mountInspector(container, { store })` mounts into `#right-inspector`
- Subscribes to `store.state.selectedClipId`
- If `null`: shows empty state "Select a clip to edit its properties"
- If a clip is selected: shows stacked sections
  - **Transform**: start time (number input), duration (number input), track (readonly label)
  - **Scene**: scene name (readonly), scene-specific params (schema-driven from `SCENE_MANIFEST[sceneId].params`)
- `inspector/field.js` — generic field renderer: given `{type, name, value, min, max, step, options}`, produce a labeled input (number/text/color/select/range)
- Editing a field calls `store.mutate()` to update the clip; timeline and preview auto-rerender (they subscribe already)

### Integration
- `runtime/web/index.html` module script mounts library + inspector after timeline + preview mounts
- Store extension: add `selectedClipId` (default null), `assets` (default []), `searchQuery` (default "")

### Schema-driven
- Scene params schema format comes from R5's `SCENE_MANIFEST` items. Each has `params: [{name, type, default, range?, description?}]`. The inspector reads this and renders fields accordingly.
- For unknown field types, fall back to text input

## Technical Constraints
- Pure ES modules, no deps
- No Rust changes
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings` still pass
- Idempotent mounts

## Code Structure
```
runtime/web/src/panels/
├── library/
│   ├── index.js
│   ├── tabs.js
│   └── card.js
└── inspector/
    ├── index.js
    ├── field.js
    └── sections.js
```

## Verification Commands
```bash
test -f runtime/web/src/panels/library/index.js
test -f runtime/web/src/panels/library/tabs.js
test -f runtime/web/src/panels/library/card.js
test -f runtime/web/src/panels/inspector/index.js
test -f runtime/web/src/panels/inspector/field.js
test -f runtime/web/src/panels/inspector/sections.js
grep -q 'mountLibrary' runtime/web/src/panels/library/index.js
grep -q 'mountInspector' runtime/web/src/panels/inspector/index.js
grep -q 'mountLibrary\|mountInspector' runtime/web/index.html
grep -q 'selectedClipId' runtime/web/src/store.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
```

## Non-Goals
- NO actual drag-drop onto timeline (R13)
- NO real asset import flow (R7 covers file dialogs; R10 just reads store.assets)
- NO undo/redo hook (R18)
