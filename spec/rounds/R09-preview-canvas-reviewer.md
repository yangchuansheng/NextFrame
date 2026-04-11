# Review Instructions — R9

Strict reviewer.

## Review Steps
1. Run all verification commands.
2. Audit:
   - 4 preview modules exist
   - `setupDPR` used exactly once per canvas resize cycle (no double-scaling bug)
   - rAF loop has pause/play/stop controls
   - ResizeObserver wired and re-renders on resize
   - Letterbox correctly computes 16:9 inner rect
   - `store.js` extended additively (grep that existing keys still present if file existed)
3. Integration:
   - `mountPreview` called from index.html after DOMContentLoaded
   - No engine file modified
4. Non-regression:
   - R6 layout IDs intact
   - `cargo build --workspace` still clean
   - No new Rust dependency

## Scoring
- 10/10: all modules present, DPR correct, rAF loop right, resize handled
- <10: gaps

Write `review.json`. complete=true only at score=10.
