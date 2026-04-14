# Task — R27: BDD test suite for Top 20 critical scenarios

## Goal
Produce a runnable BDD test suite that verifies the top 20 critical BDD scenarios from `spec/bdd-scenarios.md`. Uses a minimal headless HTML runner (no Playwright/Puppeteer). Tests exercise the JS modules directly by mounting them into a jsdom-like environment OR by shelling out to `node` with the ES module imports.

## Requirements

### Test runner (`runtime/web/test/bdd/`)
- `test/bdd/runner.js` — a minimal vitest-free runner:
  - Describes suites via `describe(name, fn)` and cases via `it(name, fn)`
  - `expect(actual).toBe(expected)`, `.toEqual`, `.toBeTruthy`, `.toBeGreaterThan`
  - Top-level `run()` executes all suites and prints pass/fail + exit code
- `test/bdd/index.js` — aggregates all test files

### Test cases (at least these 10 scenarios from the top 20)
- `test/bdd/engine.test.js`
  - TL-01: fresh timeline has 3 tracks (skip if not implemented)
  - TL-05: zoom changes pxPerSecond  — import timeline/zoom.js, call setZoom, verify pxPerSecond scales
  - CLIP-01: addClip on empty track creates clip at right start — import store.js, call store.addClip, assert state.timeline has clip
  - CLIP-02: moveClip updates start — dispatch moveClipCommand, assert new start
  - CLIP-05: splitClip produces two clips (if R15 merged — else skip)
  - SCRUB-01: store.playhead change re-renders — subscribe + mutate + check listener called
  - SCRUB-03: renderAt(t=5) and renderAt(t=2 then t=5) produce same pixels — mock canvas context, record calls, compare
  - UNDO-01: dispatch then undo restores state — assert
  - FILE-03: validateTimeline rejects malformed + accepts valid
  - INS-02: SCENE_MANIFEST has 5 scenes with params schema
- Each test uses plain assertions, fails loudly with descriptive message

### NPM-free runner
- `runtime/web/test/bdd/run.mjs` — entry point: imports runner + all test files, calls run(), process.exit(code)
- Run via: `node runtime/web/test/bdd/run.mjs`
- Exit 0 = all pass, non-zero = failures

### Reporting
- Print summary: `✓ 10 passed, 0 failed` or `✗ 2 failed, 8 passed`
- For failures, print expected vs actual

## Technical Constraints
- Zero deps (no vitest, no jest, no jsdom)
- Uses native node ESM
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings` still pass

## Verification Commands
```bash
test -f runtime/web/test/bdd/runner.js
test -f runtime/web/test/bdd/engine.test.js
test -f runtime/web/test/bdd/run.mjs
node runtime/web/test/bdd/run.mjs
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
```

## Non-Goals
- NO browser-based Puppeteer tests (too fragile for overnight build)
- NO end-to-end recorder spawn
