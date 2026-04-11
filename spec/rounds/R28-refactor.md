# Task — R28: Minimal architecture refactor + file size check

## Goal
Clean up obvious dead code, split any source file >500 lines, confirm module boundaries. Minimal changes — this is a safety pass, NOT a rewrite.

## Requirements

### File size check
- `scripts/file-size-check.sh` — bash script that lists any file in `runtime/web/src/**/*.js`, `bridge/src/**/*.rs`, `shell/src/**/*.rs`, `engine/src/**/*.rs`, `project/src/**/*.rs` over 500 lines
- Emit warning with file path + line count
- Exit 0 (report-only)

### Dead code scan
- Run `cargo clippy --workspace --all-targets -- -D dead_code -D unused` to catch dead items
- Fix any real dead items (remove, not suppress)

### Module exports audit
- Each crate's `lib.rs` should re-export its public API cleanly
- `bridge/src/lib.rs` — check that all exported types are actually used externally
- Add `pub use` re-exports where appropriate so consumers can import from crate root

### Conservative changes only
- Do NOT rename public APIs
- Do NOT move files between modules
- Do NOT rewrite any algorithm
- Do NOT change Cargo.toml beyond adding lint levels

## Verification Commands
```bash
test -f scripts/file-size-check.sh
bash scripts/file-size-check.sh
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
node runtime/web/test/bdd/run.mjs
```

## Non-Goals
- NO file moves / renames
- NO new features
- NO API changes
