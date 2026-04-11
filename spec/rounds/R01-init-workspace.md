# Task — R1: Init Cargo workspace + 4-crate skeleton

## Goal
Create a Rust Cargo workspace for NextFrame with four empty crates (shell, bridge, engine, project) and a `runtime/web/` directory stub, all building cleanly.

## Requirements
- Top-level `Cargo.toml` declaring a workspace with members: `shell`, `bridge`, `engine`, `project`
- Each member crate has its own `Cargo.toml` + `src/lib.rs` (or `src/main.rs` for `shell`)
- `shell` is a binary crate (`bin = [{ name = "nextframe" }]` or default `src/main.rs`)
- `bridge`, `engine`, `project` are library crates
- Each lib crate exposes one placeholder `pub fn hello() -> &'static str { "nextframe-{crate}" }`
- `shell/src/main.rs` calls the placeholder functions from all three libs and prints them, then exits 0
- `runtime/web/index.html` exists with a minimal `<h1>NextFrame</h1>` stub (to be filled in R6)
- `.gitignore` in repo root with `target/`, `.DS_Store`, `*.log`, `.worktrees/`, `.ally/`
- Workspace `Cargo.toml` has `[workspace.package]` with `edition = "2021"`, `rust-version = "1.75"`, and `[profile.release]` with `lto = "thin"`

## Technical Constraints
- Rust stable (`rustc --version` ≥ 1.75)
- **Zero external dependencies** in any Cargo.toml for this round — just workspace plumbing
- `cargo fmt --check` must pass
- `cargo clippy --workspace --all-targets -- -D warnings` must pass
- `cargo build --workspace` must succeed
- `cargo run -p shell` must print all four crate names and exit 0

## Code Structure
```
NextFrame/
├── Cargo.toml            # workspace manifest
├── .gitignore
├── shell/
│   ├── Cargo.toml
│   └── src/main.rs
├── bridge/
│   ├── Cargo.toml
│   └── src/lib.rs
├── engine/
│   ├── Cargo.toml
│   └── src/lib.rs
├── project/
│   ├── Cargo.toml
│   └── src/lib.rs
└── runtime/web/
    └── index.html
```

## Verification Commands
```bash
test -f Cargo.toml && grep -q 'members' Cargo.toml
test -f shell/Cargo.toml && test -f shell/src/main.rs
test -f bridge/Cargo.toml && test -f bridge/src/lib.rs
test -f engine/Cargo.toml && test -f engine/src/lib.rs
test -f project/Cargo.toml && test -f project/src/lib.rs
test -f runtime/web/index.html
test -f .gitignore && grep -q 'target/' .gitignore
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
cargo run -p shell | grep -q nextframe-bridge
cargo run -p shell | grep -q nextframe-engine
cargo run -p shell | grep -q nextframe-project
```

## Non-Goals (do NOT do this round)
- DO NOT add `wry`, `tao`, `serde`, `tokio`, or any other dependency
- DO NOT implement IPC, rendering, or any real logic — placeholders only
- DO NOT create any directories beyond what's listed in Code Structure
- DO NOT touch `docs/`, `design/`, `snippets/`, `poc/`, `projects/`, `tauri/` (existing Phase 0 content — leave alone)
