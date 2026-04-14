# Review Instructions — R22

## Review Steps
1. Run all verification commands.
2. Audit:
   - 4 audio modules exist with expected exports
   - Mixer schedules via `source.start(audioContext.currentTime + ...)` (sample-accurate)
   - Waveform peaks computation handles mono+stereo
   - AudioContext is lazy + user-gesture gated (no `new AudioContext()` at module load)
3. Non-regression

## Scoring
- 10/10: all modules, working scheduling pattern, no regression
- <10: gaps

Write `review.json`. complete=true only at score=10.
