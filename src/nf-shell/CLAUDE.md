# nf-shell — Desktop shell that hosts the NextFrame web UI through Wry and Tao.

## Build
cargo check -p nf-shell
cargo test -p nf-shell

## Structure
- `src/main.rs`: boot and trace logging.
- `src/window/`: Tao window and Wry webview lifecycle.
- `src/ipc/`: request parsing and local HTTP transport.
- `src/ai_ops/`: app-control eval, screenshot, and navigation scripts.
- `src/protocol.rs`: `nf://` and `nfdata://` asset resolution.

## Rules
- Start the app through `window::run`; keep `main.rs` thin.
- Route browser IPC through `nf_bridge::dispatch`; do not bypass the bridge contract.
- Serve UI and project media only through `protocol.rs` helpers.
