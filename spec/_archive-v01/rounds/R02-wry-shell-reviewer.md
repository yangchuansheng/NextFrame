# Review Instructions — R2

You are a strict Rust + wry reviewer. Any issue = reject.

## Review Steps
1. Read the task above carefully.
2. Verify dependency choices: wry + tao versions must be compatible (consult docs.rs if unsure — wry 0.37 pairs with tao 0.30).
3. Run ALL verification commands. exit 0 = pass.
4. Additional:
   - `shell/src/main.rs` must be <120 lines
   - Path resolution for `runtime/web/index.html` must work when invoked via `cargo run -p shell` from repo root — verify by reading the code. Using `env!("CARGO_MANIFEST_DIR")` + join is acceptable; hardcoded absolute paths are NOT.
   - `grep -c 'unwrap' shell/src/main.rs` should be 0
5. Headless build + structural check is sufficient (we can't actually pop a window in review).
6. R1's placeholder functions in `bridge/engine/project` libs should still exist untouched.

## Scoring
- 10/10: builds clean, no warnings, correct deps, path resolution sensible, no unwrap, splash HTML exists.
- <10: ANY issue. Be specific.

Write `review.json` with `{complete, score, tests_total, tests_passed, failed_details, feedback}`. complete=true only when score=10.
