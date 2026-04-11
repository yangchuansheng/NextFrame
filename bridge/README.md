# Bridge Command Interface

This bridge exposes a JSON-RPC-style envelope between the web runtime and the Rust shell.

Every request sent from JavaScript to Rust uses:

```json
{
  "id": "req-123",
  "method": "timeline.load",
  "params": {}
}
```

Every response sent from Rust back to JavaScript uses:

```json
{
  "id": "req-123",
  "ok": true,
  "result": {},
  "error": null
}
```

If a handler fails, `ok` is `false`, `result` is `null`, and `error` contains a descriptive string.

## Safety Rules

- Paths are sandboxed.
- Any path containing `..` is rejected.
- Absolute paths are rejected unless they are inside the current user's home directory or `std::env::temp_dir()`.
- Relative paths are resolved relative to the shell process working directory.

## Agent Workflow

An AI agent can:

1. Discover available scene blocks with `scene.list`.
2. Load a project timeline JSON with `timeline.load`.
3. Read or write supporting files with `fs.read`, `fs.write`, and `fs.listDir`.
4. Persist the edited timeline with `timeline.save`.

## Commands

### `fs.read`

- `method`: `"fs.read"`
- `params schema`:

```json
{
  "path": "string"
}
```

- `result schema`:

```json
{
  "path": "string",
  "contents": "string"
}
```

- `example`:

```json
{
  "id": "read-1",
  "method": "fs.read",
  "params": {
    "path": "./projects/demo/timeline.json"
  }
}
```

### `fs.write`

- `method`: `"fs.write"`
- `params schema`:

```json
{
  "path": "string",
  "contents": "string"
}
```

- `result schema`:

```json
{
  "path": "string",
  "bytesWritten": 128
}
```

- `example`:

```json
{
  "id": "write-1",
  "method": "fs.write",
  "params": {
    "path": "./notes/agent-log.txt",
    "contents": "updated by agent"
  }
}
```

### `fs.listDir`

- `method`: `"fs.listDir"`
- `params schema`:

```json
{
  "path": "string"
}
```

- `result schema`:

```json
{
  "path": "string",
  "entries": [
    {
      "name": "string",
      "path": "string",
      "isDir": true
    }
  ]
}
```

- `example`:

```json
{
  "id": "dir-1",
  "method": "fs.listDir",
  "params": {
    "path": "./projects"
  }
}
```

### `fs.dialogOpen`

- `method`: `"fs.dialogOpen"`
- `params schema`:

```json
{
  "filters": [
    {
      "name": "string",
      "extensions": ["string"]
    }
  ]
}
```

- `result schema`:

```json
{
  "status": "unimplemented",
  "filters": []
}
```

- `example`:

```json
{
  "id": "open-1",
  "method": "fs.dialogOpen",
  "params": {
    "filters": [
      {
        "name": "Timeline JSON",
        "extensions": ["json"]
      }
    ]
  }
}
```

### `fs.dialogSave`

- `method`: `"fs.dialogSave"`
- `params schema`:

```json
{
  "default_name": "string"
}
```

- `result schema`:

```json
{
  "status": "unimplemented",
  "default_name": "string"
}
```

- `example`:

```json
{
  "id": "save-dialog-1",
  "method": "fs.dialogSave",
  "params": {
    "default_name": "my-edit.json"
  }
}
```

### `log`

- `method`: `"log"`
- `params schema`:

```json
{
  "level": "string",
  "msg": "string"
}
```

- `result schema`:

```json
{
  "logged": true,
  "level": "string"
}
```

- `example`:

```json
{
  "id": "log-1",
  "method": "log",
  "params": {
    "level": "info",
    "msg": "timeline loaded"
  }
}
```

### `scene.list`

- `method`: `"scene.list"`
- `params schema`:

```json
{}
```

- `result schema`:

```json
[
  {
    "id": "string",
    "name": "string",
    "category": "string"
  }
]
```

- `example`:

```json
{
  "id": "scenes-1",
  "method": "scene.list",
  "params": {}
}
```

### `timeline.load`

- `method`: `"timeline.load"`
- `params schema`:

```json
{
  "path": "string"
}
```

- `result schema`:

```json
{
  "version": 1,
  "tracks": []
}
```

- `example`:

```json
{
  "id": "timeline-load-1",
  "method": "timeline.load",
  "params": {
    "path": "./projects/demo/timeline.json"
  }
}
```

### `timeline.save`

- `method`: `"timeline.save"`
- `params schema`:

```json
{
  "path": "string",
  "json": {}
}
```

- `result schema`:

```json
{
  "path": "string",
  "bytesWritten": 512
}
```

- `example`:

```json
{
  "id": "timeline-save-1",
  "method": "timeline.save",
  "params": {
    "path": "./projects/demo/timeline.json",
    "json": {
      "version": 1,
      "tracks": [
        {
          "id": "track-1",
          "clips": []
        }
      ]
    }
  }
}
```
