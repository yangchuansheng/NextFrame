# NextFrame

AI-native video editor. Rust + JS, macOS.

## Setup
cargo check --workspace
node src/nf-cli/bin/nextframe.js --help

## Standards
Read `spec/standards/00-index.md` first, then the relevant file in `spec/standards/`.

## Testing
cargo test --workspace
bash scripts/lint-all.sh

## Key Conventions
- All crate names start with `nf-`.
- IPC methods use `domain.camelCase`; add them in `src/nf-bridge/src/lib.rs`.
- Errors returned to users or agents include a `Fix:` suggestion.
- No `unwrap`/`expect`/`panic` in production code.
- Check scene contracts with `node src/nf-cli/bin/nextframe.js scenes`.
