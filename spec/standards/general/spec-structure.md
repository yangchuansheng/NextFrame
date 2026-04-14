# G6 — Spec & Documentation Structure

## Directory Layout

```
spec/
├── standards/
│   ├── general/        ← universal rules (any project)
│   ├── project/        ← project-specific rules
│   └── scorecard.md    ← quality audit framework
├── architecture/       ← module design, dependency graphs
├── cockpit-app/        ← BDD + data + prototypes
│   ├── bdd/{module}/   ← 5 files per feature module
│   ├── data/           ← roadmap, versions, issues, ADRs
│   └── prototypes/     ← interactive HTML prototypes
└── prototypes/         ← version-level prototype archive
```

## Document Types

| Type | Location | Mutability | Rule |
|------|----------|-----------|------|
| Standards | standards/ | Append-only | Deprecate, don't delete |
| ADR | data/dev/adrs.json | Append-only | Supersede, don't delete |
| BDD | bdd/{module}/ | status/verify fields controlled | Only implement changes status |
| Architecture | architecture/ | Evolving | Update when code changes |
| Prototypes | prototypes/ | Archived | Old versions in _archive/ |
| Roadmap | data/plan/ | Evolving | Update per milestone |

## ADR (Architecture Decision Record)

```json
{
  "id": "ADR-001",
  "title": "Use WKWebView for rendering",
  "status": "accepted",
  "date": "2026-03-15",
  "context": "Why this decision was needed",
  "decision": "What we chose",
  "consequences": "What follows from this choice",
  "alternatives": ["What we considered and rejected"]
}
```

Rules: append-only, superseded ADRs point to replacement, every decision has context + alternatives.

## BDD Module (5 files per feature)

```
bdd/{module}/
├── prototype.html     ← interactive prototype
├── ai_ops.json        ← CLI interface definition
├── design.json        ← visual spec + data model
├── bdd.json           ← Given/When/Then scenarios
└── ai_verify.json     ← AI verification stories
```

## Standard Change Protocol

1. Update the standard document
2. Run scorecard audit against updated rules
3. Fix all new violations
4. Commit standard + fixes together
