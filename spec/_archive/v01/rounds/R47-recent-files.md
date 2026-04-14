# Task — R47: Recent files list in File menu

## Goal
Track recently opened/saved .nfproj files and show them in File menu > Open Recent submenu. Persisted across sessions via a JSON file in user's home dir.

## Requirements

### Rust bridge (`bridge/src/lib.rs`)
- New method `recent.list() → [{path, name, lastOpened}]` — reads `~/.nextframe/recent.json` (create if missing)
- New method `recent.add({path})` — prepends to list, dedupes, caps at 10 most recent, saves
- New method `recent.clear()` — empties the list
- All paths sandboxed (home dir only)

### JS menu (`runtime/web/src/menu.js`)
- File menu gets a new submenu "Open Recent ▸" with:
  - Up to 10 recent entries showing filename (basename)
  - Click → calls `bridge.call('timeline.load', {path})` + updates store
  - Divider
  - "Clear Menu"
- Submenu state refreshed on menu open via `bridge.call('recent.list', {})`

### Integration
- When saving / opening via File menu, also call `bridge.call('recent.add', {path})`

## Technical Constraints
- Pure ES modules + std Rust
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test -p bridge`, `cargo build --workspace`, `node runtime/web/test/bdd/run.mjs` pass
- Add unit tests for recent.add dedupe + cap

## Verification Commands
```bash
grep -q 'recent.list\|recent.add' bridge/src/lib.rs
grep -q 'Open Recent' runtime/web/src/menu.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test -p bridge
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
