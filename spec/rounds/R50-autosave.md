# Task — R50: Auto-save timer

## Goal
Automatically save dirty projects every 30 seconds to `~/.nextframe/autosave/{project-id}.nfproj`. Notify via toast. Recoverable on next launch.

## Requirements

### Rust bridge (`bridge/src/lib.rs`)
- New methods:
  - `autosave.write({projectId, timeline})` — writes to `~/.nextframe/autosave/{projectId}.nfproj`, creates dir if missing
  - `autosave.list()` — returns all autosave entries `[{projectId, path, modified}]`
  - `autosave.clear({projectId})` — removes specific autosave file
  - `autosave.recover({projectId})` — reads autosave + returns timeline JSON
- All under home-dir sandbox
- projectId is derived from filePath or a generated UUID for Untitled

### JS (`runtime/web/src/autosave.js`)
- `export function startAutosave({store, bridge})` — sets up a 30s interval
- Only triggers if `store.state.dirty === true`
- Shows a toast `'Autosaved'` (info type, 2s duration) after each successful write
- Clears autosave on successful manual Save
- On app start, checks for existing autosaves and offers recovery dialog (modal: "Recover unsaved project?" with Yes/No/Dismiss)

### Store
- `state.autosaveTimer: null` (interval id)
- `state.autosaveId: null` (current project's autosave id)

### Integration
- Start autosave after store mount in index.html initApp

## Technical Constraints
- Pure ES modules + std Rust
- All existing tests pass
- Add unit tests for bridge autosave methods

## Verification Commands
```bash
grep -qE 'autosave.write|autosave.list' bridge/src/lib.rs
test -f runtime/web/src/autosave.js
grep -q 'startAutosave' runtime/web/src/autosave.js
grep -q 'startAutosave' runtime/web/index.html
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test -p bridge
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
