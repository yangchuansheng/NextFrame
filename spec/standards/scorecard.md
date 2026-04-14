# Quality Scorecard

AI auditor: read this file, run all checks, output a quality report.

## Dimensions (15, four categories)

### I. Code Quality (6)

| # | Dimension | A | F | Check | Standard |
|---|-----------|---|---|-------|----------|
| 1 | Build Health | 0 errors + 0 warnings | Won't compile | `cargo check && cargo clippy -- -D warnings` | G1 |
| 2 | File Granularity | 0 files >500 lines | 5+ over | `find src/ -name '*.rs' -o -name '*.js' \| xargs wc -l \| awk '$1>500'` | G1 |
| 3 | Naming | All nf- prefix + consistent | Mixed styles | `ls src/` | G1 |
| 4 | Code Hygiene | var=0 console=0 TODO=0 | Any >20 | `grep` counts | G1 |
| 5 | Safety | unsafe-no-SAFETY ≤3 | >50 | `grep unsafe \| grep -v SAFETY` | G1 |
| 6 | Test Coverage | All pass + all APIs covered | Has failures | `cargo test --workspace` | G3 |

### II. Architecture (3)

| # | Dimension | A | F | Check | Standard |
|---|-----------|---|---|-------|----------|
| 7 | Module Cohesion | Each ≤10k lines, clear purpose | 1 monolith | `wc -l` per module | G2 |
| 8 | Dependency Direction | Unidirectional, no cycles | Circular deps | `grep` reverse imports | G2 |
| 9 | Interface Contract | mod.rs is only window, minimal pub | pub everywhere | Manual review | G2 |

### III. Agent Experience (4)

| # | Dimension | A | F | Check | Standard |
|---|-----------|---|---|-------|----------|
| 10 | Understandability | Every crate has CLAUDE.md ≤30 lines | No CLAUDE.md | `ls src/*/CLAUDE.md` | G4 |
| 11 | Operability | CLI --help covers all features | Many features no CLI | `--help` review | G4 |
| 12 | Verifiability | lint-all.sh passes ≤30s | No automated checks | `bash scripts/lint-all.sh` | G4 |
| 13 | Debuggability | Errors have Fix suggestions | Opaque errors | `grep Err \| grep -v Fix` | G4 |

### IV. Documentation (2)

| # | Dimension | A | F | Check | Standard |
|---|-----------|---|---|-------|----------|
| 14 | Standards Coverage | 11+ standard files | <5 | `ls spec/standards/` | G6 |
| 15 | Comment Quality | English + module headers + why | No comments or mixed lang | `head -1` sample check | G1 |

## Scoring

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 10 | Fully compliant |
| B | 8 | Mostly compliant, 1-2 minor issues |
| C | 6 | Passing, clear room for improvement |
| D | 4 | Below standard, needs fixes |
| F | 0 | Severely non-compliant or missing |

**Overall = average of 15 dimensions, rounded to 1 decimal.**

## Report Template

```markdown
# Quality Report

Date: YYYY-MM-DD | Commit: {short hash} | Reviewer: {model}

## Score: X.X / 10 (Grade X)

| # | Dimension | Score | Grade | Evidence |
|---|-----------|-------|-------|----------|
| 1 | Build Health | 10 | A | 0 errors, 0 warnings |
| ... | ... | ... | ... | ... |

## Findings

### P0 — Blocks Release
- {file:line — issue}

### P1 — Must Fix
- {issue}

### P2 — Nice to Have
- {issue}

## Top 5 Recommendations
1. {highest impact fix}
2. ...

## Trend
Previous: X.X (date) | Delta: +/-X.X
```

## Audit Commands (copy-paste)

```bash
echo "=== 1. Build ===" && cargo check --workspace 2>&1 | tail -1 && cargo clippy --workspace -- -D warnings 2>&1 | tail -1
echo "=== 2. File Size ===" && find src/ -name '*.rs' -o -name '*.js' | grep -v target | grep -v node_modules | grep -v .ally | grep -v test | xargs wc -l 2>/dev/null | awk '$1>500{print}' | grep -v total
echo "=== 3. Naming ===" && ls src/
echo "=== 4. Hygiene ===" && echo "var=$(grep -rn '\bvar ' src/ --include='*.js' | grep -v node_modules | wc -l) console=$(grep -rn 'console.log' src/ --include='*.js' | grep -v node_modules | grep -v bridge | wc -l) todo=$(grep -rn 'TODO\|FIXME' src/ --include='*.rs' --include='*.js' | grep -v node_modules | wc -l)"
echo "=== 5. Safety ===" && grep -rn 'unsafe' src/ --include='*.rs' | grep -v target | grep -v test | grep -v '// SAFETY' | grep -v allow | grep -v unsafe_code | wc -l
echo "=== 6. Tests ===" && cargo test --workspace 2>&1 | grep 'test result'
echo "=== 10. CLAUDE.md ===" && ls src/*/CLAUDE.md .claude/CLAUDE.md AGENTS.md 2>/dev/null
echo "=== 14. Standards ===" && ls spec/standards/general/ spec/standards/project/ spec/standards/scorecard.md 2>/dev/null | wc -l
```
