# nf-bridge — JSON IPC backend for NextFrame shell, storage, and export flows.

## Build
`cargo check -p nf-bridge`

## Core Constraints
- Public entrypoint is `dispatch(Request) -> Response`; add new IPC methods in `src/lib.rs`.
- Handlers return `Result<Value, String>` with actionable errors for the shell and agents.
- Validate params with `util::validation` and resolve paths through `storage::fs` helpers.
- Keep filesystem/project/timeline behavior covered by integration tests in `tests/integration/`.

## Module Structure
- `lib.rs`: request/response types, initialization, IPC dispatch table
- `domain/`: project, episode, segment, scene, timeline handlers
- `storage/`: fs, autosave, and recent-item persistence
- `export/` + `codec/`: recorder orchestration and ffmpeg helpers
- `util/`: validation, dialogs, logging, preview, path/time helpers
