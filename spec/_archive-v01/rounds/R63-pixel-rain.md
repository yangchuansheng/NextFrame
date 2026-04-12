# Task — R63: pixelRain Matrix-style scene

## Goal
Cascading pixel rain like a Matrix code shower. Falling characters with hue shift, deterministic positions.

## Requirements

### Scene (`runtime/web/src/scenes/pixelRain.js`)
- Frame-pure `(t, params, ctx, globalT)`:
  - Params: `{columns, hueStart, hueEnd, speed, density, charSize, glyphPalette}`
  - Defaults: `columns=48, hueStart=140, hueEnd=200, speed=180, density=1.2, charSize=18, glyphPalette='01ABCDEF'`
  - For each column index 0..columns:
    - Column X = i * (W/columns)
    - For drops (density per column = floor(density * 6)):
      - Drop start time `birth = hash(i, drop) * 4`
      - Y position = ((t - birth + hash(i, drop+'y')) * speed) mod (H + 100) - 100
      - Char index = floor((t * 5 + i) % glyphPalette.length)
      - Hue: lerp(hueStart, hueEnd, (Y/H + i/columns) * 0.5)
      - Alpha: max(0, 1 - Y/H)
    - draw `glyphPalette[charIndex]` at (X, Y)
- Use monospace font for characters
- All positions deterministic via hash + t

### Registration
- Add to scenes/index.js, 17 scenes total

## Technical Constraints
- Pure ES modules
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/scenes/pixelRain.js
grep -q 'pixelRain' runtime/web/src/scenes/index.js
node --input-type=module -e "import('./runtime/web/src/scenes/index.js').then(m => process.exit(m.SCENE_MANIFEST.length === 17 ? 0 : 1))"
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
