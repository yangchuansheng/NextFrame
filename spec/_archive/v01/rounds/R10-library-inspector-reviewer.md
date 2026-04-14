# Review Instructions — R10

Strict reviewer.

## Review Steps
1. Run all verification commands.
2. Audit:
   - Library mounts correctly, 3 tabs visible, empty state logic
   - Inspector shows empty state when no selection, field list when selected
   - Schema-driven: inspector uses `SCENE_MANIFEST[id].params` to render inputs dynamically
   - Store extension is additive, `selectedClipId` defaults to null
3. Integration:
   - Library + inspector both mounted from index.html module script
   - No engine file or R8 timeline files modified
4. Non-regression:
   - All previous verification commands from R6/R7/R8/R9 still pass
   - cargo build clean

## Scoring
- 10/10: all 6 files, working mounts, schema-driven inspector, empty state, no regression
- <10: gaps

Write `review.json`. complete=true only at score=10.
