# Task — R2: wry desktop shell (minimum viable)

## Goal
Make `cargo run -p shell` open a native macOS window via `wry` + `tao` that loads `runtime/web/index.html` and shows it. No IPC yet — just a WebView displaying a local file.

## Requirements
- `shell/Cargo.toml` adds dependencies: `wry = "0.37"` (or latest 0.x), `tao = "0.30"` (or latest matching wry)
- `shell/src/main.rs`:
  - Creates a `tao::event_loop::EventLoop`
  - Creates a `tao::window::Window` with title "NextFrame" and size 1440×900
  - Creates a `wry::WebViewBuilder` pointing at the absolute `file://` URL of `runtime/web/index.html` (compute path at runtime via `std::env::current_exe` or `CARGO_MANIFEST_DIR` — your choice, but path must resolve correctly when run via `cargo run -p shell` from repo root)
  - Runs the event loop; window closes on user close event → process exits 0
- `runtime/web/index.html` is rewritten to a visually distinct splash page proving the WebView works:
  - Dark background (#0b0b14), centered white text "NextFrame" in a large sans-serif
  - A `<div id="status">` showing `navigator.userAgent` (proves WebView is live)
  - Minimal inline CSS, no external assets
- `shell` crate's existing placeholder `hello()` calls (from R1) are removed — main.rs is now the wry shell, nothing more

## Technical Constraints
- macOS only is fine — don't bother with cross-platform guards
- `cargo fmt --check` passes
- `cargo clippy --workspace --all-targets -- -D warnings` passes
- No `unwrap()` in production paths — use `expect("...")` with descriptive message only where a failure is truly unrecoverable (window creation)
- No `panic!`, no `todo!`
- Do NOT touch `bridge/`, `engine/`, `project/` crates this round

## Code Structure
```
shell/
├── Cargo.toml           # adds wry + tao
└── src/main.rs          # tao window + wry webview pointing at runtime/web/index.html

runtime/web/
└── index.html           # splash page
```

## Verification Commands
```bash
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build -p shell
grep -q 'wry' shell/Cargo.toml
grep -q 'tao' shell/Cargo.toml
grep -q 'WebView' shell/src/main.rs
grep -q 'runtime/web/index.html' shell/src/main.rs
test -f runtime/web/index.html
grep -q 'NextFrame' runtime/web/index.html
# Headless check: build must succeed; we can't window-test in CI
```

## Non-Goals
- NO IPC, no fs API, no message passing — R3 handles that
- NO actual rendering engine integration
- NO menu bar / dialog
- NO content panels / timeline — R6+ handles UI
