# G3 — Testing

## Test Pyramid

```
        / Screenshot  \       ← few, verify visuals
       / Integration    \     ← every public API method
      / Unit tests        \   ← core logic
     / Compile checks       \  ← type system + clippy
```

## Requirements by Layer

| Layer | What | When |
|-------|------|------|
| Compile | `cargo check` + `cargo clippy -D warnings` | Every commit |
| Unit | Core logic: parsers, encoders, formatters | Every core module |
| Integration | Every IPC/API method: happy path + error path | Every public interface |
| Screenshot | Visual components at key timepoints | UI changes |

## AI-Friendly Testing

- **Single-module test**: `cargo test -p nf-xxx` — don't force full suite for one file change.
- **Test name = behavior**: `fn timeline_save_rejects_symlink_escape()` — AI reads the name, knows what it tests.
- **Actionable failure messages**: assert messages include expected vs actual values.
- **Every AI-introduced bug → regression test**: same bug never appears twice.

## Test File Rules

- File name: `*_tests.rs` (Rust), `*.test.js` (JS).
- Single file ≤ 800 lines.
- No mocking filesystem — use real temp directories.
- No flaky tests — if it fails intermittently, fix or delete.

## CI Gate

```bash
cargo check --workspace
cargo test --workspace
cargo clippy --workspace -- -D warnings
bash scripts/lint-all.sh
```

All exit 0 to merge.
