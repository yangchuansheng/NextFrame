# Task — R60: Final overnight verification + summary

## Goal
Run all checks one final time. Update verify-report.md with final numbers, total feature list, and a polished morning walkthrough script. This is the closing capstone.

## Requirements

### Update scripts/verify.sh
- Add at the end: count total scene files via `ls runtime/web/src/scenes/*.js | wc -l` and total bdd test files
- Add a "Quick Start" section in the report showing exact commands to launch

### Final report `spec/verify-report.md`
- Update Summary with current numbers
- Add a "Features Shipped" section enumerating all rounds (R1-R59) with one-line descriptions, grouped by phase:
  - Phase A: Architecture (R1-R5)
  - Phase B: UI Shell (R6-R12)
  - Phase C: Editing (R13-R19)
  - Phase D: Preview & Audio (R20-R23)
  - Phase E: Export (R24-R26)
  - Phase F: Quality (R27-R30)
  - Polish: R32-R59 (call out highlights)
- Add a "Try It Now" walkthrough:
  ```
  1. cd NextFrame
  2. cargo run -p shell
  3. The window opens, scenes auto-play
  4. Press Cmd+K to open command palette
  5. Press B for blade tool, click a clip to split
  6. Try View > Theme > Velvet for purple aesthetic
  7. File > Export > start to render MP4
  ```

### Final commit
- Commit verify-report.md with message celebrating completion

## Technical Constraints
- Bash only
- Don't break existing report fields

## Verification Commands
```bash
bash scripts/verify.sh
test -f spec/verify-report.md
grep -q 'Try It Now' spec/verify-report.md
grep -q 'Features Shipped' spec/verify-report.md
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
```
