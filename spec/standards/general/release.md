# G5 — Release

## Version Number

`v{major}.{minor}.{patch}`

- major: incompatible data format changes, architecture rewrite
- minor: new features, new components, new API methods
- patch: bug fixes, performance improvements

## Pre-Release Checklist

```bash
cargo check --workspace           # compile
cargo test --workspace            # tests
cargo clippy --workspace -- -D warnings  # lint
bash scripts/lint-all.sh          # full quality gate
```

All exit 0. No exceptions.

## Changelog

Each version: `spec/CHANGELOG.md`

```markdown
## v0.X.Y — YYYY-MM-DD

### Added
- New feature description

### Changed  
- Change description

### Fixed
- Bug fix description
```

## Build Artifacts

| Artifact | Format | Command |
|----------|--------|---------|
| Desktop app | .app (macOS) | `cargo build --release -p nf-shell` |
| Recorder | binary | `cargo build --release -p nf-recorder` |
| TTS | binary | `cargo build --release -p nf-tts` |
| Publisher | binary | `cargo build --release -p nf-publish` |
| CLI | npm package | `npm pack` in src/nf-cli |

## Hotfix

1. Branch from main → hotfix
2. Fix + test
3. Merge to main
4. Bump patch version
5. Rebuild + release
