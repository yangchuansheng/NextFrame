# Task — R40: Project title bar with dirty indicator

## Goal
Show the current project filename in the top menu area with a dirty-state indicator (●). Untitled projects show "Untitled". Window title syncs.

## Requirements

### JS (`runtime/web/src/title-bar.js`)
- `export function mountTitleBar(container, store)` inserts a title element into the top-menu area (after brand)
- Reads `store.state.filePath` — displays basename only (no full path)
- If `dirty`, prepend "● "
- If `filePath == null`, show "Untitled"
- Subscribes to store; re-renders on filePath/dirty change
- Also updates `document.title` to `{filename}{dirty ? ' •' : ''} — NextFrame`

### Integration
- `runtime/web/index.html` — add `<div id="project-title"></div>` in top menu area, mount via `mountTitleBar(el, store)`
- Style: small monospace text, subtle color, clickable-looking to hint at rename (rename not implemented in this round)

### Reveal-in-Finder
- Add `View menu → Reveal Project in Finder` that calls `bridge.call('fs.reveal', {path: store.state.filePath})` if filePath exists

## Technical Constraints
- Pure ES modules
- No Rust changes
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/title-bar.js
grep -q 'mountTitleBar' runtime/web/src/title-bar.js
grep -q 'mountTitleBar\|project-title' runtime/web/index.html
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
