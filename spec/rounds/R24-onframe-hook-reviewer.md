# Review Instructions — R24

## Review Steps
1. Run all verification commands.
2. Audit:
   - `installOnFrame` attaches `window.__onFrame` synchronously
   - `__onFrame(t, fps)` deterministically renders a specific frame
   - `setRecordingMode(true)` pauses rAF loop
   - README documents contract clearly for an external subprocess
3. Non-regression: R11 autoplay still works

## Scoring
- 10/10: contract installable, renders at arbitrary t, no regression
- <10: gaps

Write `review.json`. complete=true only at score=10.
