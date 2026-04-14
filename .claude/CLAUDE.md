# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is NextFrame

AI 视频引擎 — 把结构化信息变成视频。输入是 JSON，输出是可播放的 HTML 或 MP4。不限于自媒体，任何需要"让信息更容易理解"的场景都是它的用武之地：教育、产品演示、数据报告、内部培训、开源项目介绍。

技术栈：JSON timeline → 多层 HTML（scene 组件渲染）→ 浏览器播放 → WKWebView 并行录制 → MP4。核心原则：一个视觉元素 = 一个 layer。Frame-pure 渲染：任意时刻 t 可独立计算 f(t) → frame。

## Build & Test

```bash
cargo check --workspace          # Rust compilation check (11 crates)
cargo test --workspace           # Rust tests
cargo clippy --workspace -- -D warnings  # Clippy with zero warnings
bash scripts/lint-all.sh         # Full 10-gate lint (check + test + clippy + file size + JS lint)
```

Single crate test: `cargo test -p nf-bridge`

## CLI (primary interface)

```bash
node src/nf-cli/bin/nextframe.js --help      # Full usage guide (workflow, timeline format, layers, animations)
node src/nf-cli/bin/nextframe.js scenes      # List all 40+ scene components with metadata
node src/nf-cli/bin/nextframe.js scenes <id> # Inspect one component (params, types, ranges, defaults)
node src/nf-cli/bin/nextframe.js validate <timeline.json>  # 6 gates + overlap check
node src/nf-cli/bin/nextframe.js build <timeline.json>     # → single-file HTML
node src/nf-cli/bin/nextframe.js preview <timeline.json>   # Screenshots at key times
```

Recording (separate binary): `nextframe-recorder slide <html> --out <mp4> --width 1920 --height 1080 --fps 30 --parallel 8`

## Architecture (two languages, clear boundary)

**JS side:**
- `src/nf-core/` — engine core (timeline, animation, scenes, filters). Scene components are pure functions: `(ctx, t, params) → canvas draws`.
- `src/nf-cli/` — thin CLI shell (commands only, imports from nf-core)
- `src/nf-runtime/` — browser runtime (web-v2/)

**Rust side:**
- `src/nf-shell-mac/` — macOS desktop shell (objc2 + AppKit + WebKit)
- `src/nf-bridge/` — JSON IPC for project, timeline, storage, export
- `src/nf-recorder/` — WKWebView parallel recording → VideoToolbox → MP4
- `src/nf-tts/` — TTS CLI (Edge + Volcengine backends)
- `src/nf-publish/` — multi-platform publisher (WKWebView tabs)
- `src/nf-source/` — source pipeline: download → transcribe → align → cut

**Data flow**: CLI writes JSON timeline → nf-core build bundles into HTML → recorder opens HTML in WKWebView → captures frames → VideoToolbox encodes MP4.

## Before You Write Code (mandatory)

1. **Read the relevant standard**: `cat spec/standards/00-index.md` → find the standard for your task → read it
2. **Read the ADR**: `cat spec/cockpit-app/data/dev/adrs.json` → check if there's a locked decision about what you're changing
3. **Read the BDD**: if working on a feature module, `cat spec/cockpit-app/bdd/{module}/bdd.json` → know the expected behavior
4. **Read the crate CLAUDE.md**: `cat src/nf-xxx/CLAUDE.md` → know the local rules

**Skipping these = writing code that may violate locked design decisions. If you don't find a relevant standard, say so — don't guess.**

## Core Rules

- Do not add `unwrap`/`expect`/`panic`; workspace lints deny them. Use `#[allow(...)]` with comment on specific FFI functions only.
- Route all browser/native behavior through `nf-bridge`; no parallel IPC paths.
- Check scene contracts with `nextframe scenes <id>` before guessing timeline params.
- Prod files ≤ 500 lines, test files ≤ 800 lines.
- No `var` in JS (const/let only), no `console.log` in runtime code.
- No TODO/FIXME/HACK/XXX in production code.
- Scenes must not cross-import from modules/ directory.

## Key Paths

- Engine core: `src/nf-core/engine/` (timeline, build, validate, keyframes)
- Animation: `src/nf-core/animation/` (effects/ + transitions/)
- Scene components: `src/nf-core/scenes/` (7 categories + meta.js + index.js)
- CLI commands: `src/nf-cli/src/commands/` (timeline/, render/, project/, pipeline/, app/)
- Source pipeline: `src/nf-source/` (core/, download/, transcribe/, align/, cut/, source/)
- IPC dispatch: `src/nf-bridge/src/lib.rs` → `dispatch` / `dispatch_inner`
- Standards: `spec/standards/00-index.md`
- ADRs: `spec/cockpit-app/data/dev/adrs.json` (5 decisions)
- Competitor research: `spec/cockpit-app/analysis/competitors/` (11 dimensions, 300+ tools)
- Vision & analysis: `spec/cockpit-app/analysis/`
