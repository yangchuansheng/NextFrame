# G2 — Architecture

## Module Layering

Dependencies flow one direction only: **app → core → shared → runtime**.

| Layer | Contains | Depends On |
|-------|----------|-----------|
| Application | CLI, desktop shell, publishers | Core, Shared |
| Core | Business logic, engines | Shared |
| Runtime | UI loaded by app/core | Shared only |
| Shared | Libraries, types, utils | Stdlib + third-party only |

Reverse dependency = Cargo.toml rejects it = compile error.

## Module Contract

- `mod.rs` / `index.js` = the only public interface.
- Internal files use `pub(super)` or `pub(crate)`, never `pub`.
- Change mod.rs re-exports = change the contract. Change internal files = no external impact.
- Before changing a signature, `grep` all call sites and update together.

## Crate Structure (Rust)

```
src/nf-xxx/
├── CLAUDE.md           ← ≤30 lines
├── Cargo.toml          ← [lints] workspace = true
└── src/
    ├── lib.rs / main.rs
    ├── feature_a/
    │   └── mod.rs      ← contract
    └── feature_b/
        └── mod.rs
```

## External Dependencies

**Default: build it yourself.** Use a library only when ALL three:
1. Standard functionality (not custom)
2. Library capability ceiling is sufficient
3. Does not lock your architecture

**Banned:** Frameworks (Tauri, Electron, React, Vue, Bevy, Actix-web).
**Allowed:** Libraries (tokio, wry, objc2, serde, clap, png, hyper).

## Technology Choices

- Use boring tech — AI understands mature tools better than cutting-edge ones.
- Don't mix tech stacks — one responsibility, one technology.
- Use design patterns AI knows (Builder, Adapter, Registry) — AI infers intent without reading code.
