# Review Instructions — R26

## Review Steps
1. Run verification commands.
2. Audit: filter_complex construction correct for N audio sources with adelay + amix, graceful no-audio path, ffmpeg detection.
3. Non-regression.

## Scoring
- 10/10: correct filter graph, graceful fallbacks, tests
- <10: gaps

Write review.json. complete=true only at score=10.
