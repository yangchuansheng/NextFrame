# G1 — Code Standards

## Rust

### Clippy Deny (compile-time red lines)
```toml
[workspace.lints.clippy]
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
unreachable = "deny"
todo = "deny"
wildcard_imports = "deny"
```
All crates inherit: `[lints] workspace = true`.

### Visibility
- Default `pub(crate)`. Upgrade to `pub` only for cross-crate use.
- mod.rs = module contract. Only re-export what external code needs.

### Error Handling
- IPC boundary: `Result<T, String>` with format: `"failed to {action}: {reason}. Fix: {suggestion}"`
- Internal: custom Error enum or anyhow.
- FFI/unsafe in dedicated files, not scattered in business logic.
- Every unsafe block has `// SAFETY: <specific invariant>`.

## JS

- Zero `var` — all `let`/`const`, prefer `const`.
- Zero `console.log` in production (bridge IPC `[bridge]` prefix logs excepted).
- Zero `TODO`/`FIXME`/`HACK`/`XXX` — fix it or delete it.
- Zero commented-out code — git has history.
- Global state in `state.js` only. Modules communicate via events, not direct calls.

## Comments

- **English only.**
- Comment **why**, not what. Code already says what.
- Module header: every `.rs` file starts with `//!`, every `.js` file starts with `//`.
- Density: ~1 comment per 15-20 lines (Rust), ~1 per 20-25 (JS). Too many = noise.
- Synonyms on key types: `/// Project — also known as: workspace, collection, show.`

## Naming

| Object | Convention | Example |
|--------|-----------|---------|
| Crate | nf-kebab-case | nf-bridge |
| Rust file | snake_case.rs | export_runner.rs |
| Rust type | CamelCase | ExportTask |
| Rust fn | snake_case | handle_export_start |
| JS component | camelCase.js | headline.js |
| JS module | kebab-case.js | dom-preview.js |
| CSS class | kebab-case | pl-atom-card |
| IPC method | domain.camelCase | export.muxAudio |
| CLI command | kebab-case | project-new |

**No duplicate filenames** (except mod.rs/index.js). AI wastes context reading multiple same-name files.

## File Size

| Type | Limit |
|------|-------|
| Production code | ≤ 500 lines |
| Test code | ≤ 800 lines |
| Single module total | ≤ 10,000 lines |
| Single crate total | ≤ 15,000 lines |

Exceed = must split. No exceptions.
