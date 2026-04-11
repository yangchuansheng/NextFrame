# Review Instructions — R13

Strict reviewer.

## Review Steps
1. Run all verification commands.
2. Audit:
   - 3 dnd modules exist, correct exports
   - Payload uses custom MIME `application/nextframe+json` (not plain text — real apps treat custom MIME correctly)
   - Drop target computes time from X correctly (accounts for pxPerSecond + scroll offset + track header width)
   - Overlap detection: reject if new clip range intersects any existing clip on same track
   - Auto-select new clip after drop
3. Store:
   - `addClip` is a pure function (returns new timeline, doesn't mutate in place)
   - `selectClip` updates `selectedClipId`
4. Non-regression:
   - R10 library still renders
   - R8 timeline still renders clips from store
   - cargo build clean

## Scoring
- 10/10: drag-drop works conceptually, overlap rejection correct, store mutations pure
- <10: missing overlap check, non-pure store, missing files

Write `review.json`. complete=true only at score=10.
