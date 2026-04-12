# Task — R56: Right-click context menus

## Goal
Add context menus on clip right-click and timeline empty area right-click. Quick actions like Delete, Duplicate, Cut, Split at Playhead, Properties.

## Requirements

### JS (`runtime/web/src/context-menu.js`)
- `export function mountContextMenu({store})` — installs document-level contextmenu listener
- Detects target: clip element, track lane empty area, library card, etc.
- Builds appropriate menu items dynamically:
  - Clip: Cut, Copy, Duplicate, Delete, Split at Playhead, Assign Label > submenu, Show Properties
  - Empty timeline: Paste (if clipboard has content), Add Track, Zoom Fit
  - Library card: Add to Favorites, Drag Hint
- Menu floats at cursor, dismisses on outside click / Esc / item select
- Items can be disabled (greyed) when not applicable
- Uses existing commands.js commands (no new logic)

### Style
- Dark dropdown panel, 200px wide, item height 32px, hover highlight
- Submenus indicated with ▸

## Technical Constraints
- Pure ES modules
- All existing tests pass
- Mountable + idempotent

## Verification Commands
```bash
test -f runtime/web/src/context-menu.js
grep -q 'mountContextMenu' runtime/web/src/context-menu.js
grep -q 'contextmenu' runtime/web/src/context-menu.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
