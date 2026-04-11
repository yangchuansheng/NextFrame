# Review Instructions — R14

## Review Steps
1. Run all verification commands.
2. Audit:
   - attachClipInteractions exported, handles body + edges separately
   - Min-duration 0.1s enforced
   - Overlap detection rejects mutations
   - Undo stack integrated via commands.js
   - Body/edge cursors correct
3. Non-regression: R13 drag-drop still works; R8 timeline still renders clips

## Scoring
- 10/10: clean interaction, overlap check, undo works, no regression
- <10: gaps

Write `review.json`. complete=true only at score=10.
