# nf-shell — Desktop shell that hosts the NextFrame web UI through Wry/Tao.

## Build
`cargo check -p nf-shell`

## Core Constraints
- Start the app through `window::run`; keep `main.rs` thin.
- Route browser IPC through `nf_bridge::dispatch`; do not bypass the bridge contract.
- Serve UI/media only through `nf://` and `nfdata://` helpers in `protocol.rs`.
- Keep app-control HTTP endpoints in `ai_ops/`; browser eval replies come back via `appctl.result`.

## Module Structure
- `main.rs`: boot + trace logging
- `window/`: Tao window + Wry webview lifecycle
- `ipc/`: request parsing and local HTTP transport
- `ai_ops/`: app-control eval, screenshot, navigation scripts
- `protocol.rs`: asset and project-media protocol resolution
