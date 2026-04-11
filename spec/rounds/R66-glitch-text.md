# Task — R66: glitchText cyberpunk title scene

## Goal
A glitchy chromatic-aberration text effect — RGB channels split horizontally with random offsets, scanlines, occasional displacement bursts.

## Requirements

### Scene (`runtime/web/src/scenes/glitchText.js`)
- Frame-pure `(t, params, ctx, globalT)`:
  - Params: `{text, fontSize, weight, baseHue, glitchAmount, scanlines, burstFreq}`
  - Defaults: `text="GLITCH", fontSize=140, weight="900", baseHue=320, glitchAmount=0.4, scanlines=true, burstFreq=2.5`
  - Center text on canvas
  - Burst: `burstActive = sin(t * burstFreq) > 0.6`
  - Layer 1: red channel offset by `(hash(floor(t*10), 'r')*2-1) * glitchAmount * 12`
  - Layer 2: cyan channel offset opposite
  - Layer 3: white core text
  - Each layer drawn with respective fill color
  - If scanlines, draw horizontal 2px lines across text region every 4px at 0.15 alpha
  - During burst, slice text into 3-4 horizontal bands and offset each band randomly
  - All "random" via deterministic hash

### Registration
- Add to scenes/index.js, 20 scenes total

## Technical Constraints
- Pure ES modules
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/scenes/glitchText.js
grep -q 'glitchText' runtime/web/src/scenes/index.js
node --input-type=module -e "import('./runtime/web/src/scenes/index.js').then(m => process.exit(m.SCENE_MANIFEST.length === 20 ? 0 : 1))"
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
