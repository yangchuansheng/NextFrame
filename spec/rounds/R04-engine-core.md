# Task — R4: Engine core — renderAt + scene registry

## Goal
Build the frame-pure rendering core in `runtime/web/src/engine/` (JavaScript, ES modules, zero deps). Given a timeline JSON and a time `t`, it renders exactly one frame by dispatching to registered scenes.

## Requirements
- `runtime/web/src/engine/index.js` exports:
  - `const SCENES = new Map()` — registry
  - `export function registerScene(id, fn)` — fn signature `(t, params, ctx, globalT, W, H) => void`
  - `export function renderAt(ctx, timeline, t)` — clears canvas to timeline.background (default `#0b0b14`), iterates tracks top-to-bottom, for each clip where `t ∈ [clip.start, clip.start + clip.dur)` calls the scene function with `localT = t - clip.start` and `scene params`
  - `export function validateTimeline(timeline)` — returns `{ok, errors}`; checks schema: `{version, duration, tracks: [{id, kind, clips:[{id, start, dur, scene, params?}]}]}`
- `runtime/web/src/engine/easing.js` — exports `smoothstep`, `easeOutCubic`, `easeInOutCubic`, `clamp`
- `runtime/web/src/engine/math.js` — exports `lerp`, `remap`, `TAU`, `phi` (golden ratio)
- Engine is DPR-aware: `renderAt` trusts the caller to have set up transform; provides a `setupDPR(canvas)` helper that sizes the backing store to `width*dpr × height*dpr` and applies `ctx.scale(dpr, dpr)` once
- **Frame-pure invariant tests** in `runtime/web/src/engine/__tests__/invariant.test.js`:
  - Register a scene that draws a rect at `x = 100 + t*10`
  - Render at t=5, read pixel → expect at x=150
  - Render at t=2, then at t=5 → pixel at x=150 still
  - Render at t=5 directly → same pixel
  - Use `document.createElement('canvas')` and `ctx.getImageData` in a headless-compat way (we'll run these via node + `canvas` package in R27; this round just write them as `.test.js` with clear comments)
- **Hot tip for the executor**: the tests don't need to run in CI this round — they're specification. Verification only requires the files exist and parse.

## Technical Constraints
- Zero dependencies (no npm)
- Files must be valid ES modules (parseable by `node --input-type=module`)
- Must be readable by AI agents — every exported function has a JSDoc block with `@param`, `@returns`, and a 1-line description
- No frameworks, no TypeScript

## Code Structure
```
runtime/web/src/engine/
├── index.js            # registry + renderAt + validateTimeline + setupDPR
├── easing.js
├── math.js
└── __tests__/
    └── invariant.test.js
```

## Verification Commands
```bash
test -f runtime/web/src/engine/index.js
test -f runtime/web/src/engine/easing.js
test -f runtime/web/src/engine/math.js
test -f runtime/web/src/engine/__tests__/invariant.test.js
grep -q 'registerScene' runtime/web/src/engine/index.js
grep -q 'renderAt' runtime/web/src/engine/index.js
grep -q 'validateTimeline' runtime/web/src/engine/index.js
grep -q 'smoothstep' runtime/web/src/engine/easing.js
grep -q 'phi' runtime/web/src/engine/math.js
node --input-type=module -e "import('./runtime/web/src/engine/index.js').then(m => { console.log(typeof m.renderAt); process.exit(typeof m.renderAt === 'function' ? 0 : 1); })"
```

## Non-Goals
- NO scenes themselves (R5 + scene subagent provide them)
- NO audio
- NO UI chrome
