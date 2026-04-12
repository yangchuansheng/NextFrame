# P-subtitles Report

## Outputs

- Generated: `frame_t2.png`, `frame_t5.5.png`, `frame_t8.png`
- Cue texts differ across requested timestamps: `true`
- Repeat render at `t=2` kept same text: `true`
- Repeat render at `t=2` kept identical PNG hash: `true`

## Performance

- First SRT read + parse: `0.295 ms`
- SRT read only: `0.123 ms`
- SRT parse only: `0.172 ms`
- Cached render lookup overhead on repeat: `0.002 ms`
- Render + PNG encode at `t=2`: `39.249 ms`
- Render + PNG encode at `t=5.5`: `37.510 ms`
- Render + PNG encode at `t=8`: `36.477 ms`

## Frame-Pure Preservation

- Verdict: `true`
- Reason: the scene depends on `(t, params.srt, params.style)`, loads and parses the SRT once into an immutable in-process cache keyed by resolved path, and then performs a pure cue lookup for each frame.
- Evidence: `t=2` returned `"Frame pure subtitles start here."` on both renders and produced SHA1 `e9e9d1658ecc39e8b5606ed2370f0e1d7f4dc767`.

## LOC

- Total LOC in `index.js`, `sub.srt`, and `package.json`: `348`
- LOC counting overhead: `0.305 ms`

## Setup

```bash
npm install
node index.js
```

Single-frame mode for the shared spec shape:

```bash
node index.js 5.0
```

## Gotchas

- SRT timing uses inclusive start and exclusive end, so cue boundaries are deterministic and do not double-render on the same timestamp.
- The parse cache preserves frame purity only if callers treat the SRT file as static during a render session; mutating the file mid-process would change later frames because the external input changed.
- Text metrics come from the host font fallback for `sans-serif`, so exact glyph rasterization can vary across machines even though cue selection stays deterministic.
