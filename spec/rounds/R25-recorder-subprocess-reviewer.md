# Review Instructions — R25

## Review Steps
1. Run all verification commands.
2. Audit:
   - bridge spawn args are correctly constructed
   - graceful handling when recorder binary not found
   - pid tracked in a HashMap behind a Mutex
   - no blocking calls in the bridge dispatch path (spawn is async or happens in its own thread)
   - dialog.js modal is HTML-only, no libraries
3. Non-regression

## Scoring
- 10/10: all methods, clean error paths, dialog renders, no regression
- <10: gaps

Write `review.json`. complete=true only at score=10.
