# 08 · Contract-First Architecture

**Status:** v0.1.4 lint-phase design · executable, not aspirational.

Every module in nextframe-cli has a **machine-checked contract**. If your code doesn't match the contract, `node --test` fails and CI blocks the commit. This doc lists the contracts, the extension points, and the tests that enforce them.

## Why contract-first

We have 21 scenes, 9 CLI subcommands, 6 safety gates, N future render targets, and multiple AI entry points. Without contracts, every new addition is a minefield — the scene you write today silently violates an invariant that breaks the renderer tomorrow. **Contracts turn implicit assumptions into explicit tests.**

Principles:

1. **Source of truth = code + test, not prose.** `.md` docs reflect the contract but the `test/architecture.test.js` is the law.
2. **Fail at startup, not at runtime.** Scene registry validates every scene on import — missing `describe` crashes load, not render.
3. **Add = extend, never patch.** New scene / target / AI tool = drop a file in the right directory, get auto-discovered by the registry. No editing of unrelated files.
4. **Layers are enforced, not convention.** `src/scenes/` cannot import from `src/cli/`. Checked by test.
5. **Every public function returns `{ok, value, error, hints?}`.** Enforced by type check + runtime assertions in core paths.

## Module contract table

Each row = one module. `Public API` is machine-checked (JSDoc @typedef + runtime schema). `Invariants` are checked by `test/architecture.test.js`. `Extends by` = how to add a new instance.

| Module | Public API | Invariants | Extends by |
|---|---|---|---|
| `src/engine/time.js` | `resolveTimeline(tl) → {ok,value}`, `resolveExpression(expr, lookup, dur) → {ok,value}` | never throws; quantizes to GRID_SIZE=0.1; detects cycles; rejects dangling refs with hint | — (closed) |
| `src/engine/validate.js` | `validateTimeline(tl, opts) → {ok, errors[], warnings[], hints[], resolved?}` | never throws; runs all 6 gates; returns structured errors | — (closed) |
| `src/engine/render.js` | `renderAt(tl, t, opts) → {ok, canvas, value}` | frame-pure (no Math.random/Date.now at module level); multi-track compositing via lighten by default; per-clip blend override | — (closed) |
| `src/engine/describe.js` | `describeAt(tl, t, viewport) → {ok, value}` | returns `{t, chapter?, active_clips:[{clipId, sceneId, trackId, localT, phase, progress, visible, params, elements, boundingBox}]}` | — (closed) |
| `src/scenes/*.js` | `export function <id>(t, params, ctx, globalT)` | frame-pure; no top-level state; uses only ctx methods; must have META entry in registry | **add a scene**: new file + add id to `META_TABLE` and `RENDER_FNS` in `src/scenes/index.js` |
| `src/scenes/index.js` | `REGISTRY: Map<id, {id, render, describe, META}>`, `getScene(id)`, `listScenes()`, `SCENE_IDS: string[]` | each entry has render + describe + META; META has id/category/description/duration_hint/params[] with name/type/default | — (registry only) |
| `src/timeline/ops.js` | `addClip/removeClip/moveClip/resizeClip/setParam/findClips/getClip` → `{ok, value}` or `{ok:false, error, hints?}` | pure functions (no mutation of input); every op validates result before returning | — (closed) |
| `src/targets/napi-canvas.js` | `renderFrame(tl, t, opts) → {ok, value:Buffer}` (PNG bytes) | wraps engine.renderAt; encodes PNG | — (closed) |
| `src/targets/ffmpeg-mp4.js` | `exportMP4(tl, outPath, opts) → {ok, value}` | streams raw RGBA to ffmpeg libx264; reports progress via opts.onProgress | — (closed) |
| `src/targets/<new>.js` | `renderFrame` or `exportVideo` following target contract | must declare `export const TARGET = {id, kind:'frame'|'video', outputType}` | **add a target**: new file + register in `src/targets/index.js` |
| `src/cli/*.js` | `export async function run(argv, ctx) → number` (exit code) | uses `_io.js` helpers; never throws; always calls emit(); returns 0/1/2/3 | **add a verb**: new file + register in `bin/nextframe.js` SUBCOMMANDS |
| `src/ai/tools.js` | `export const TOOLS: {[name]: (args, ctx) => {ok,value}}` | each tool has JSDoc schema; never mutates input timeline | **add a tool**: add entry to TOOLS map + JSDoc schema |
| `src/views/gantt.js` | `gantt(tl, opts) → string` (ASCII) | pure render; width-respecting | — (closed) |
| `src/views/ascii.js` | `asciiFromCanvas(canvas, opts) → string` | pure; honors width/ramp | — (closed) |

## Scene contract (hard rules)

Every scene file in `src/scenes/` except `index.js` and `_*.js` must satisfy:

1. **Export one function** matching the file basename: `export function <id>(t, params, ctx, globalT) { ... }`
2. **No top-level state**: no `let counter`, no `const cache = new Map()`, no module-level `new Image()`. Determinism is everything.
3. **No forbidden globals in render**: `Math.random`, `Date.now`, `performance.now`, `crypto.getRandomValues`, `new Image()` (except via `_image-cache.js`), `fetch`.
4. **Must appear in `META_TABLE`** in `src/scenes/index.js` with:
   - `category: string`
   - `description: string`
   - `duration_hint: number`
   - `params: Array<{name, type, default, range?, options?, semantic?}>`
   - optional `ai_prompt_example: string`
5. **Must appear in `RENDER_FNS`** in `src/scenes/index.js` with same id.

**Runtime check** (`src/scenes/index.js` at import): iterate REGISTRY, for each entry assert `typeof render === 'function'` and `META.params` shape. If anything is wrong, throw `SceneContractError` — process crashes before first frame. Fail fast beats fail mysterious.

**Static check** (`test/architecture.test.js`): grep each scene file for forbidden tokens (`Math.random`, `Date.now`, `performance.now`, top-level `let`, top-level `new Map` etc.). Fails the build if found.

## Layer dependency contract

Strict unidirectional graph. Higher layers can import from lower layers but NOT the other way.

```
L5 preview/         (HTTP server + UI)
        ↓
L4 bin/ + src/cli/  (CLI dispatch)
        ↓
L3 src/timeline/    (ops) + src/ai/ (tools)
        ↓
L2 src/engine/      (time, validate, render, describe)
        ↓
L1 src/scenes/      (leaf) + src/targets/ (leaf)
```

**Rules (enforced by `test/architecture.test.js`):**

- `src/scenes/*` may import ONLY `@napi-rs/canvas` and other `src/scenes/_*.js` helpers (no engine, no cli).
- `src/targets/*` may import ONLY `@napi-rs/canvas`, `node:` stdlib, and `src/engine/`.
- `src/engine/*` may import ONLY `@napi-rs/canvas`, `node:` stdlib, `src/scenes/index.js`, and other `src/engine/*` files.
- `src/timeline/*` may import ONLY `src/engine/*`.
- `src/ai/*` may import ONLY `src/engine/*`, `src/timeline/*`, `src/scenes/*`, `src/views/*`.
- `src/cli/*` may import ONLY everything BELOW L4.
- `src/views/*` may import ONLY `node:` stdlib and `src/engine/*` for type references.
- `preview/*` may import ONLY src/ files and `node:` stdlib.

**The test walks `src/**/*.js`, parses each `import` statement, and asserts the source→target edge is allowed.** Violations dump the file + offending import + which rule broke.

## Error contract

Every public function in L2, L3, L4 returns one of these shapes. Never throws for expected errors.

```js
// success
{ ok: true, value: <any> }

// failure
{
  ok: false,
  error: {
    code: "UPPER_SNAKE",   // machine-readable
    message: "...",         // human English
    ref?: "clip-x",         // optional: what object failed
    hint?: "..."            // optional: how to fix
  },
  hints?: [{ msg: "..." }]  // optional: multiple hints
}
```

**Rules:**

- `code` is REQUIRED on error, must be `UPPER_SNAKE` or scoped like `TIME_REF_NOT_FOUND`.
- `message` is REQUIRED, English, ≤ 120 chars.
- Throwing is OK for **programmer errors** (type mismatch, unreachable code) but NOT for runtime validation failures.
- CLI `run()` never throws — it catches any leak and returns exit code 2.

**Enforcement**: `test/error-contract.test.js` calls each public function with bad input, asserts the returned shape matches.

## Extension points (how to add stuff)

### Add a new scene

1. Create `src/scenes/<newId>.js`:
   ```js
   export function newId(t, params, ctx, globalT) {
     // ... draw using ctx only ...
   }
   ```
2. Add import + registry entries to `src/scenes/index.js`:
   - `import { newId } from "./newId.js";`
   - Add `newId` to `META_TABLE` with params spec
   - Add `newId` to `RENDER_FNS`
3. Run `node --test test/scene-contract.test.js` — should pass for the new scene automatically.

**No other files edited.** Adding a scene is a one-file-plus-registry operation.

### Add a new render target

1. Create `src/targets/<id>.js` exporting either:
   - `renderFrame(tl, t, opts) → {ok, value: Buffer}` (still-frame targets), OR
   - `exportVideo(tl, outPath, opts) → {ok, value}` (streaming targets)
2. Add `export const TARGET = { id, kind, outputType }` at top.
3. Register in `src/targets/index.js`.
4. Add a CLI flag `--target <id>` to `src/cli/render.js`.

### Add a new CLI subcommand

1. Create `src/cli/<verb>.js`:
   ```js
   import { parseFlags, emit } from "./_io.js";
   export async function run(argv, ctx) { ... return 0; }
   ```
2. Register in `bin/nextframe.js` SUBCOMMANDS map.
3. Add BDD scenarios to `spec/cockpit-app/bdd/cli-<verb>/` (5 files per module convention).

### Add a new AI tool

1. Add entry to `src/ai/tools.js` TOOLS map:
   ```js
   export const TOOLS = {
     ...
     my_tool: {
       schema: { name, description, params: [{name, type, required, semantic}] },
       handler: (args, ctx) => { return { ok: true, value: ... }; },
     },
   };
   ```
2. `test/ai-tools.test.js` automatically picks it up and validates schema.

### Add a new safety gate

1. Edit `src/engine/validate.js` gate list.
2. Add BDD scenario to `spec/cockpit-app/bdd/safety-gates/bdd.json`.
3. Add unit test to `test/safety-gates.test.js`.

## Architecture tests

`test/architecture.test.js` runs these assertions (all must pass):

### arch-1: layer dependency graph

Walk every `.js` file under `src/` and `preview/`. Parse each `import`/`from` statement. Assert the source→target edge matches the allowed rules table above. On violation: print file, import line, rule that broke.

### arch-2: scene contract

For every file in `src/scenes/` except `index.js` and `_*.js`:
- Assert export name matches basename
- Assert `src/scenes/index.js` imports the same name
- Assert `META_TABLE` has an entry with required fields
- Grep for forbidden tokens (`Math.random(`, `Date.now(`, `performance.now(`, `^let `, `^const .* = new Map`)

### arch-3: error contract

For each public function listed in the module contract table, call it with invalid input and assert the return shape matches `{ok: false, error: {code, message}}`.

### arch-4: extension point registry

Assert `REGISTRY` in `src/scenes/index.js` has all 21 scenes.
Assert `SUBCOMMANDS` in `bin/nextframe.js` has all documented subcommands.
Assert `TOOLS` in `src/ai/tools.js` is non-empty and each entry has a schema.

### arch-5: file size cap

No file under `src/` or `preview/` may exceed 400 lines (comment-stripped). Rationale: AI context windows. Files over 300 warn.

### arch-6: error-contract runtime

For a sample of timeline ops, inject malformed data and confirm `{ok:false}` shape, not throw.

## v0.1.4 lint phase task list

Eight concrete deliverables. Each is its own commit. Each has a single verification command.

### T1 — `test/architecture.test.js`

Implements arch-1 through arch-6 above. Uses `node --test`. Reads `.js` files via `node:fs`, parses imports with regex (no external deps). Should add ~250-350 lines.

**Verify:** `node --test test/architecture.test.js` → 6/6 pass.

### T2 — Scene contract runtime guard

Add `src/scenes/_contract.js` exporting `assertSceneContract(id, entry)` and `SceneContractError`. Called from `src/scenes/index.js` after building each `REGISTRY` entry. On violation: throw with `${id}: missing X`.

**Verify:** deliberately break a scene, assert `node -e 'import("./src/scenes/index.js")'` crashes with `SceneContractError`.

### T3 — Error contract runtime assertions

Add `src/engine/_guard.js` with `guarded(fn, name)` wrapper that asserts return shape. Wrap hot paths: `validateTimeline`, `resolveTimeline`, `renderAt`, `exportMP4`. Only active when `NEXTFRAME_GUARD=1` env var is set (no prod perf cost).

**Verify:** `NEXTFRAME_GUARD=1 node bin/nextframe.js render examples/minimal.timeline.json /tmp/x.mp4` runs without guard errors.

### T4 — JSDoc typedefs

Add `src/types.d.ts` (pure JSDoc `@typedef` — no TS compile step). Defines: `Timeline`, `Track`, `Clip`, `TimeValue`, `TimeExpression`, `Result<T>`, `Error`, `SceneMeta`, `ParamSpec`, `ClipDescription`, `ValidationReport`. Reference from JSDoc comments in engine files.

**Verify:** `node --check` on each src/engine/*.js passes; editor shows types on hover.

### T5 — Scene extension example

Add a 22nd scene to prove the extension protocol works end-to-end. Simple: `src/scenes/vignette.js` — darkens corners, 3 params (intensity, hue, radius). Adds entry to index.js. Auto-discovered by tests.

**Verify:** `node --test test/scene-contract.test.js` → vignette found + valid.

### T6 — Remaining BDD modules

Create 5 bdd/{module}/ directories with 5 files each:
- `scene-contract` — scene loading + META shape + forbidden tokens
- `safety-gates` — each of the 6 gates in isolation
- `ai-tools` — 7 tool functions
- `cli-assets` — (placeholder for v0.1.5; structure only)
- `cli-export` — render + audio mux (placeholder for v0.2)

**Verify:** `ls spec/cockpit-app/bdd/ | wc -l` = 7.

### T7 — Smoke test upgrade

Add architecture tests + scene contract runtime crash test + error contract test to `test/smoke.test.js`. Old 7 + new 6 = 13 tests minimum.

**Verify:** `node --test test/` → 13/13 pass in < 60s.

### T8 — CONTRIBUTING.md in nextframe-cli/

Short doc linking the 3 extension points (scene / target / tool) to this file's sections. 1 page max.

**Verify:** file exists, linked from README.

## Remaining 5 BDD modules — outline

Each follows the 5-file template (bdd.json, ai_ops.json, design.json, ai_verify.json, prototype.html).

### scene-contract (v0.1.4 lint)
Scenarios: scene loads with valid META · scene without describe() fails · scene with Math.random fails grep · META params schema check · new scene auto-discovered · duplicate scene id fails · missing category fails. 7 scenarios.

### safety-gates (v0.1.4 lint)
Scenarios: schema gate (bad schema / missing duration / missing tracks) · symbolic time gate (cycle / dangling ref / range overflow) · asset gate (missing file) · scene ref gate (unknown scene) · clip overlap warning · id uniqueness. 6 scenarios, one per gate.

### ai-tools (v0.1.4 lint)
Scenarios: list_scenes returns 21 · get_scene_meta valid/invalid · suggest_clip_at(timeline, t) · resolve_time_expression · validate_timeline_patch · describe_frame · gantt_ascii. 7 scenarios, one per tool.

### cli-assets (v0.1.5 future)
Placeholder: import-image · import-audio · list-assets · remove-asset. 4 scenarios.

### cli-export (v0.1.5 future)
Placeholder: render with --audio · render with --target puppeteer · render with --crf · probe post-export. 4 scenarios.

## What this closes

After v0.1.4:
- Every module has a machine-checked contract. Adding a scene wrong = immediate test fail, not mysterious runtime crash.
- Every public function returns `{ok, value, error}` — uniform error handling.
- Layer violations blocked by test.
- Scene contract violations blocked at module import.
- New scenes / targets / tools have documented single-file add paths.
- 7 BDD modules exist (5 more added to the 2 existing).
- `node --test test/` is the single gate.

Walking skeleton stays (already works). This layer wraps it in discipline so v0.1.5 implement phase has guard rails.

## Not in scope

- Adding TypeScript. JSDoc is enough; the compile step is a tax.
- `eslint` — Node's built-in test is already doing the job.
- Breaking the existing CLI surface — all tests additive.
- Extending scene count — T5 adds exactly one to prove extension; more come in v0.1.5 implement.
