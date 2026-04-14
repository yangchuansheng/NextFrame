# G4 — Agent Experience

AI is the primary developer. The codebase must be optimized for AI agents to read, write, and verify code.

## 1. Self-Describing Features

Every feature is a closed loop — AI reads the interface, not documentation.

| Property | Requirement |
|----------|------------|
| Discoverable | `--help` lists all commands. Unlisted = nonexistent. |
| Understandable | Params have schema with type/default/desc/example. |
| Operable | CLI command or API endpoint for every action. |
| Verifiable | validate/lint/describe to check results. |
| Repairable | Every error includes `Fix:` suggestion. |

**5/5 satisfied = feature complete. Missing any = not done.**

## 2. Three-Layer Defense

```
Layer 1: Compile-time interception (wrong code won't compile)
Layer 2: Runtime observability (see everything at any time)
Layer 3: Verification assertions (auto-check after every change)
```

### Layer 1: Compile-Time
- Clippy deny rules catch crashes before runtime.
- `pub(crate)` default prevents accidental exposure.
- Cargo workspace lint inheritance — new crate can't skip rules.
- Module boundaries enforced by Cargo dependency graph.

### Layer 2: Runtime Observability
- Structured logs: `{"ts":"...","module":"export","event":"start","data":{...}}`
- IPC call chain: every bridgeCall logged with method/params/ok/ms.
- DOM semantic tags: `data-nf-role`, `data-nf-clip-id`, `data-nf-track`.
- State snapshot via eval: AI queries current page/project/timeline anytime.
- Crash dump: `~/.nf-crash/crash-{ts}.json` with backtrace + last 10 logs.

### Layer 3: Verification
- `cargo check -p nf-xxx` for single-module verify (≤5s).
- `validate` for data correctness.
- `lint-scenes` for component compliance.
- `screenshot` for visual verify.
- `lint-all.sh` for full sweep (≤30s).

## 3. Project Documentation

### CLAUDE.md (for Claude Code)
- Root: `.claude/CLAUDE.md` ≤ 50 lines.
- Per crate: `src/nf-xxx/CLAUDE.md` ≤ 30 lines.
- Content: build command + core rules + module nav + "where to find info".
- **Progressive disclosure**: tell AI where to look, don't dump everything.

### AGENTS.md (for Codex)
- Root: `AGENTS.md` ≤ 30 lines.
- Content: setup + standards pointer + test command + key conventions.

### Gold Standard Files
- Mark one exemplar per file type: `//! Gold standard: new X should follow this pattern.`
- AI copies the pattern, doesn't invent from scratch.

### Rules for Both
- Every line must pass: "Would AI make a mistake without this?" No → delete it.
- Update when AI repeatedly makes the same mistake.
- Delete rules AI no longer violates — less noise = better compliance.

## 4. Iterative Improvement

```
AI makes mistake → analyze why → fix environment → verify fix
```

**Don't teach AI how to use your product. Make the product teach itself.**
