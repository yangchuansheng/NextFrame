# Review Instructions — R27

## Review Steps
1. Run `node runtime/web/test/bdd/run.mjs` — MUST exit 0
2. Audit test cases: each tests real behavior (not tautologies)
3. Zero deps confirmed

## Scoring
10/10: runner runs, ≥10 tests pass, real assertions, exit 0
<10: gaps

Write review.json. complete=true only at score=10 AND node runner exits 0.
