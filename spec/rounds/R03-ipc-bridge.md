# Task — R3: JS ↔ Rust IPC bridge

## Goal
Wire a bidirectional JSON-RPC-style bridge between the wry WebView and the Rust shell, exposing a concrete set of commands the JS side (and by extension AI agents) can call: `fs.read`, `fs.write`, `fs.listDir`, `fs.dialogOpen`, `fs.dialogSave`, `log`, `scene.list`, `timeline.load`, `timeline.save`.

## Requirements

### Rust side
- `bridge/src/lib.rs` defines:
  - `Request { id: String, method: String, params: serde_json::Value }`
  - `Response { id: String, ok: bool, result: serde_json::Value, error: Option<String> }`
  - A `dispatch(req: Request) -> Response` function with a match on `method`
  - Handlers for: `fs.read(path)`, `fs.write(path, contents)`, `fs.listDir(path)`, `log(level, msg)`, `scene.list() -> [{id,name,category}]`, `timeline.load(path)`, `timeline.save(path, json)`
  - `fs.dialogOpen(filters)` and `fs.dialogSave(default_name)` can return stub `{"status":"unimplemented"}` this round — R7 wires actual native dialogs
  - `scene.list()` returns a hardcoded stub list of 5 items this round: `gradientBg`, `text`, `shape`, `image`, `counter` — R5 swaps in the real registry
  - All handlers return `Response` — no panics, errors become `ok: false` with error string
  - Paths are sandboxed: reject any path containing `..` or starting with `/` unless inside `std::env::temp_dir()` or user's home — this is a safety requirement
- `shell/src/main.rs` hooks `wry::WebViewBuilder::with_ipc_handler` to:
  - Parse incoming string as `Request`
  - Call `bridge::dispatch(req)`
  - Serialize `Response` and inject back to JS via `webview.evaluate_script(format!("window.__ipc.resolve({response_json})"))`
- Add `serde = {version="1", features=["derive"]}` and `serde_json` deps to `bridge` and `shell`

### JS side
- `runtime/web/src/bridge.js` (new module):
  - `export function call(method, params)` returns a Promise
  - Generates unique id, sends via `window.ipc.postMessage(JSON.stringify(request))` (wry ipc bridge injects `window.ipc.postMessage`)
  - Resolves when Rust calls `window.__ipc.resolve(response)`
  - Maintains a pending-requests map
- `runtime/web/index.html` updated to load `src/bridge.js` as module and demo on load:
  - `await bridge.call('scene.list', {})` — display results as chips
  - `await bridge.call('log', {level:'info', msg:'hello from webview'})`
  - Status area shows ✅ IPC READY or ❌ error
- `runtime/web/index.html` layout: still dark splash but now shows "Bridge wired" + scene chips

### AI operation interface (critical)
- Document in `bridge/README.md`: the full command list with JSON schema per method. This doc is how an AI agent (or MCP server) learns what it can do. Each command: `method`, `params schema`, `result schema`, `example`.
- Commands must be **orthogonal and complete for a video-editor AI**: an AI with only these commands + scene.list should be able to load a project, modify its timeline JSON, and save it back.

## Technical Constraints
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo build --workspace` all pass
- `bridge/src/lib.rs` has unit tests for `dispatch()` on each method (at least happy path + error path)
- `cargo test -p bridge` passes
- No `unwrap()` in bridge; use `?` + descriptive errors
- Path sandbox enforced and tested

## Code Structure
```
bridge/
├── Cargo.toml       # +serde, +serde_json
├── README.md        # AI operation interface doc
└── src/lib.rs       # Request/Response + dispatch + handlers + tests
shell/
├── Cargo.toml       # +serde, +serde_json
└── src/main.rs      # ipc handler wired
runtime/web/
├── index.html       # updated
└── src/bridge.js    # new
```

## Verification Commands
```bash
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
cargo test -p bridge
test -f bridge/README.md
grep -q 'scene.list' bridge/README.md
grep -q 'fs.read' bridge/README.md
grep -q 'timeline.load' bridge/README.md
test -f runtime/web/src/bridge.js
grep -q 'window.ipc.postMessage' runtime/web/src/bridge.js
grep -q 'with_ipc_handler' shell/src/main.rs
```

## Non-Goals
- NO actual file dialog (stub "unimplemented" is fine — R7)
- NO real scene registry (stub list — R5)
- NO UI panels — R6+ builds the chrome
