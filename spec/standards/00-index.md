# NextFrame Standards

Two layers: **general** (any Rust/JS project) + **project** (NextFrame specific).
Plus a scorecard for automated quality audits.

## General Standards（通用，任何项目适用）

| # | File | Scope |
|---|------|-------|
| G1 | general/code-standards.md | Code quality + comments + naming + lint rules |
| G2 | general/architecture.md | Module layering + dependencies + file size + contracts |
| G3 | general/testing.md | Test pyramid + coverage + AI-friendly testing |
| G4 | general/agent-experience.md | AI self-description + self-validation + self-repair + CLAUDE.md/AGENTS.md + readability |
| G5 | general/release.md | Versioning + changelog + build + distribution |
| G6 | general/spec-structure.md | Documentation hierarchy + ADR + BDD + lifecycle |

## Project Standards（NextFrame 特有）

| # | File | Scope |
|---|------|-------|
| P1 | project/data-contract.md | Timeline JSON schema + version compat + migration |
| P2 | project/module-interface.md | 31 IPC methods + Shell HTTP API + error format |
| P3 | project/component-contract.md | Scene component interface + params + describe() |
| P4 | project/visual-language.md | Color tokens + typography + spacing + animation |
| P5 | project/performance.md | Frame render / IPC / startup time budgets |

## Quality Scorecard

| File | Purpose |
|------|---------|
| scorecard.md | 15-dimension audit framework + report template |
