# Review Instructions — R3

You are a strict reviewer for a Rust IPC layer that will be used by AI agents. Any issue = reject.

## Review Steps
1. Read task above. Understand: this is the AI-operation surface of NextFrame. Correctness matters more than speed.
2. Run ALL verification commands.
3. Code audit:
   - `bridge/src/lib.rs` — is `dispatch()` exhaustively matching all 9 methods? Are errors proper Results, not panics? Is the path sandbox enforced BEFORE reading/writing?
   - `grep -c 'unwrap' bridge/src/lib.rs shell/src/main.rs` — should be 0 or heavily justified
   - Unit tests — run `cargo test -p bridge`. Are there tests for EACH method, both happy path and error path?
4. Security check:
   - Try reading test code: does it cover `fs.read("../../../etc/passwd")` rejection? `fs.write("/etc/hosts", ...)` rejection?
5. AI interface doc:
   - Read `bridge/README.md`. Is every command documented with full JSON schema (params + result)?
   - Could an LLM with ONLY this doc successfully build a video timeline? Imagine prompting Claude "load project at ~/Desktop/foo.nfproj, add a text clip, save it" — are the commands sufficient?
6. JS side:
   - `runtime/web/src/bridge.js` — correct promise-based wrapper? Handles errors? Clears pending map entries?
   - `index.html` — demonstrates bridge working on load?

## Scoring
- 10/10: all verification passes, security sandbox correct, tests comprehensive, AI interface complete, JS bridge clean
- <10: ANY gap. Especially reject if sandbox is missing, tests are absent, or AI doc is hand-wavy.

Write `review.json` with standard fields. complete=true only when score=10.
