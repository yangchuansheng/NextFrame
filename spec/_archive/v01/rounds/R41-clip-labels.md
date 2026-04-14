# Task — R41: Clip color labels + note

## Goal
Let user assign a color label (red/orange/yellow/green/blue/purple) to any clip via Inspector. Color shown as a vertical stripe on the clip's left edge in the timeline. Also let user add a text note field.

## Requirements

### Store / data
- Clip can now have `clip.label: string` (color name) and `clip.note: string` (free text)
- Default: undefined/empty

### Inspector (`runtime/web/src/panels/inspector/sections.js`)
- Add "Organize" section when a clip is selected:
  - Label: 6-button color picker (red/orange/yellow/green/blue/purple + "None")
  - Note: single-line text input
- On change: dispatch `setClipParamCommand` or direct store.mutate to update the clip (preserve undo semantics)

### Timeline render (`runtime/web/src/timeline/clip.js`)
- If `clip.label` is set, prepend a 4px-wide vertical color stripe on the clip's left edge
- Colors: red `#ef4444`, orange `#f97316`, yellow `#eab308`, green `#22c55e`, blue `#3b82f6`, purple `#a855f7`

### Context menu integration
- If there's a right-click clip menu (R7 mentioned briefly), add "Assign Label" submenu. If no context menu yet, skip — inspector is sufficient.

## Technical Constraints
- Pure ES modules
- No Rust
- All existing tests pass
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace`, `node runtime/web/test/bdd/run.mjs`

## Verification Commands
```bash
grep -qE 'label|color-label' runtime/web/src/panels/inspector/sections.js
grep -qE 'label|stripe' runtime/web/src/timeline/clip.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
