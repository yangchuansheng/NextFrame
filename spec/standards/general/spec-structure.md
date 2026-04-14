# G6 — Spec & Documentation Structure

## Directory Layout

```
spec/
├── standards/          ← rules (the law — append-only, deprecate don't delete)
│   ├── general/        ← universal (reusable across projects)
│   ├── project/        ← project-specific
│   └── scorecard.md    ← quality audit framework
├── design/             ← visual language (the look — evolves with brand)
│   ├── DESIGN.md       ← tokens, colors, typography, spacing
│   └── components.html ← component showcase
├── architecture/       ← technical design (the how — evolves with code)
│   └── module-design.md
├── cockpit-app/        ← project control center (the what)
│   ├── bdd/{module}/   ← 5 files per feature module
│   ├── data/           ← roadmap, versions, issues, ADRs
│   ├── prototypes/     ← interactive HTML prototypes
│   └── analysis/       ← competitive analysis, research
├── prototypes/         ← version-level prototype archive
├── _archive/           ← all superseded documents
└── VISION.md           ← product vision (the why)
```

## Final vs Process Documents

| Type | Where | Rule |
|------|-------|------|
| **Final** (current truth) | In its proper directory above | Only one version. Update in place. |
| **Process** (superseded) | `_archive/` | Move here when replaced. Never delete. |

When a document is rewritten (e.g. module-design v1 → v2):
1. Move old version to `_archive/`
2. Write new version in the proper directory
3. **No version numbers in filenames** — the file in the directory IS the latest

## Document Types

| Type | Location | Mutability | Content |
|------|----------|-----------|---------|
| Standards | standards/ | Append-only | Rules + check commands |
| Design | design/ | Evolving | Visual tokens, components |
| Architecture | architecture/ | Evolving | Module design, layer diagram |
| ADR | data/dev/adrs.json | Append-only | Decisions with context + alternatives |
| BDD | bdd/{module}/ | Controlled | 5 files per feature module |
| Roadmap | data/plan/ | Evolving | Features, milestones |
| Prototypes | cockpit-app/prototypes/ | Versioned | Interactive HTML |
| Vision | VISION.md | Rare changes | Product direction |
| Archive | _archive/ | Read-only | Superseded documents |

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
