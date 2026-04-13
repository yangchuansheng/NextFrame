# L-multi-track Report

## Result

- Canvas backend: `@napi-rs/canvas`
- Frame time tested: `t=2.5`
- Resolution: `1920x1080`
- Outputs: `frame_so.png`, `frame_screen.png`, `frame_multiply.png`, `frame_overlay.png`
- Active clips at `t=2.5`: background `auroraGradient` on track `v1` and overlay `centerCircle` on track `v2`

## Blend Mode Findings

- All four blend modes rendered without errors in `@napi-rs/canvas`.
- Blend modes that matched the intended "bright white circle on top of aurora" result: `source-over`, `screen`
- Blend modes that composited but did not keep the center near-white: `multiply`, `overlay`
- `multiply` is the main gotcha for this content: multiplying with a white source mostly preserves the darker destination, so the center sample is effectively indistinguishable from the background-only frame.

### source-over
- Render + PNG encode: `393.581 ms`
- Corner sample `(40, 40)`: `2, 2, 6, 255`, luminance `2.29`
- Center sample `(960, 540)`: `255, 255, 255, 255`, luminance `255`
- Background dark check: `true`
- Center near-white check: `true`
- Z-order check: `true`

### screen
- Render + PNG encode: `400.267 ms`
- Corner sample `(40, 40)`: `2, 2, 6, 255`, luminance `2.29`
- Center sample `(960, 540)`: `255, 255, 255, 255`, luminance `255`
- Background dark check: `true`
- Center near-white check: `true`
- Z-order check: `true`

### multiply
- Render + PNG encode: `393.951 ms`
- Corner sample `(40, 40)`: `2, 2, 6, 255`, luminance `2.29`
- Center sample `(960, 540)`: `100, 35, 117, 255`, luminance `54.74`
- Background dark check: `true`
- Center near-white check: `false`
- Z-order check: `false`

### overlay
- Render + PNG encode: `398.354 ms`
- Corner sample `(40, 40)`: `2, 2, 6, 255`, luminance `2.29`
- Center sample `(960, 540)`: `200, 70, 234, 255`, luminance `109.48`
- Background dark check: `true`
- Center near-white check: `false`
- Z-order check: `true`

## Z-ordering

- Track order is correct when clips are composited in timeline order `v1 -> v2`.
- The center sample is much brighter than the corner sample for the working modes, which shows the circle is landing on top of the aurora instead of being hidden behind it.
- Track-level blend modes must be applied when compositing each clip canvas into the master canvas, not by mutating the scene's own `ctx.globalCompositeOperation`. The aurora scene changes its own blend mode internally, so drawing scenes directly into one shared canvas would make per-track blend modes unreliable.

## Timing

- `source-over`: `393.581 ms`
- `screen`: `400.267 ms`
- `multiply`: `393.951 ms`
- `overlay`: `398.354 ms`

## LOC

- Total LOC in this POC: `383`

## Setup

```bash
npm install
node index.js
```

## Gotchas

- Clip activation is timeline-based; both clips are active at `t=2.5`, but each scene receives its own local clip time, so the circle pulse uses `1.5s` while the aurora uses `2.5s`.
- Saving PNGs and sampling pixels from the composed canvas is enough to validate ordering and visibility without opening a window.
- If you need strict visual assertions across blend modes, validate against sampled pixels or luminance deltas. Visual intuition is not enough for modes like `multiply`.
