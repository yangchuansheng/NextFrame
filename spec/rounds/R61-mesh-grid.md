# Task — R61: meshGrid frame-pure scene

## Goal
A morphing 3D-feel mesh grid that ripples and rotates. Adds aesthetic variety to the scene library.

## Requirements

### Scene (`runtime/web/src/scenes/meshGrid.js`)
- Frame-pure `(t, params, ctx, globalT)`:
  - Params: `{cols, rows, hueA, hueB, waveSpeed, waveAmp, perspective, lineWidth}`
  - Defaults: `cols=20, rows=14, hueA=200, hueB=320, waveSpeed=0.7, waveAmp=0.18, perspective=0.45, lineWidth=1.4`
  - Build a 2D grid of points; warp each Y by `sin(x*0.5 + t*waveSpeed) * waveAmp * H`
  - Apply pseudo-3D perspective: y *= 1 - perspective + perspective * (gridY/rows)
  - Draw horizontal + vertical lines connecting points
  - Color via lerp(hueA, hueB, gridY/rows)
  - Subtle glow via line drawn 3px wide at 0.2 alpha behind sharp 1.4px line
  - Background: dark vignette gradient

### Registration
- Add to scenes/index.js, 15 scenes total

## Technical Constraints
- Pure ES modules
- All existing tests pass

## Verification Commands
```bash
test -f runtime/web/src/scenes/meshGrid.js
grep -q 'meshGrid' runtime/web/src/scenes/index.js
node --input-type=module -e "import('./runtime/web/src/scenes/index.js').then(m => process.exit(m.SCENE_MANIFEST.length === 15 ? 0 : 1))"
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
