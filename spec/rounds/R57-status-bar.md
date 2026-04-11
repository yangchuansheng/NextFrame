# Task — R57: Bottom-of-window status bar

## Goal
A thin status bar at the very bottom of the window showing: cursor time, selected clip count, current tool, autosave status, and a clickable "GitHub" link placeholder.

## Requirements

### JS (`runtime/web/src/status-bar.js`)
- `export function mountStatusBar(container, store)` injects a status bar div
- Subscribes to store, displays:
  - Left: `00:12.45` (current cursor/playhead time)
  - Center-left: `2 clips selected` or empty
  - Center: `Move tool` or `Blade tool` (current timeline tool)
  - Right: autosave status `Saved 12s ago` or `Unsaved changes`
  - Far right: `NextFrame v0.1`
- Inserted at very bottom of #app (below stats bar)
- Updates 1Hz for autosave timestamp
- Style: 22px tall, monospace, dim text, subtle border-top

## Technical Constraints
- Pure ES modules
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/status-bar.js
grep -q 'mountStatusBar' runtime/web/src/status-bar.js
grep -q 'mountStatusBar' runtime/web/index.html
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
