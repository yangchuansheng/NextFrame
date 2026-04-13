# W4 Symbolic Time Resolver Report

## Summary

- Resolver entrypoint: `resolveTimeline(timelineWithSymbols) -> { timeline, lookup }`
- Quantization grid: `0.1s`
- Test command: `node test.js`
- Current result: `All 9 tests passed.`

## Resolver LOC

- `resolver.js`: `489` lines via `wc -l resolver.js`

## Schema Used In This POC

```json
{
  "project": {
    "start": 0,
    "end": 12
  },
  "chapters": [
    { "id": "intro", "start": 0, "end": 2.4 }
  ],
  "markers": [
    { "id": "drum-1", "at": 3.2 }
  ],
  "clips": [
    { "id": "headline", "start": { "at": "project-start" }, "end": 1.0 }
  ]
}
```

Reference rules:

- `chapter-<id>` defaults to that chapter's `.start`
- `marker-<id>` defaults to that marker's `.at`
- `clip-<id>` defaults to that clip's `.start`
- `after: 'chapter-x'` and `after: 'clip-x'` resolve against `.end`
- Explicit suffixes like `.start`, `.end`, `.at` override the defaults
- `project.start`, `project.end`, `project-start`, and `project-end` are all supported

## Edge Cases Handled

- Dependency graph is built across project, chapter, marker, and clip timing fields before resolution.
- Cycles are rejected with a hard error instead of partially resolving.
- Invalid references are rejected during graph construction.
- Duplicate IDs inside chapters, markers, or clips are rejected.
- Malformed expressions are rejected if they contain multiple operators or unsupported keys.
- `project.start` defaults to `0`; `project.end` is required.
- Start/end ranges are validated after numeric resolution, before quantization.
- Values are quantized after resolution, so symbolic math uses raw floats and output uses stable `0.1s` numbers.
- Zero-duration results after quantization are allowed if the raw resolved range was valid.
- Marker bare IDs such as `sync: "subtitle-cue-3"` are supported as a convenience alias.

## LLM Authoring Assessment

The schema is close to intuitive enough for direct LLM authoring.

Why it works:

- The objects are short and regular.
- The symbol names are readable: `chapter-body`, `marker-drum-1`, `clip-headline`.
- The operator vocabulary is small: `at`, `after`, `before`, `sync`, `until`.

Where an LLM could still drift:

- `clip-<id>` defaults to `.start`, but `after: 'clip-x'` means `clip-x.end`. That rule is learnable, but it is not fully uniform.
- Bare marker aliases like `sync: "subtitle-cue-3"` are convenient, but category-prefixed refs are safer for generation.
- Requiring `project.end` is important; without it, `project-end` becomes ambiguous.

Recommendation:

- Keep the current schema, but bias prompting toward explicit refs for generated output:
  - `chapter-body.start`
  - `clip-headline.end`
  - `marker-drum-1.at`

That will reduce ambiguity while preserving the compact shorthand for hand-authored timelines.

## Sample Input

```json
{
  "project": { "end": 12 },
  "chapters": [
    { "id": "intro", "start": { "at": "project-start" }, "end": 2.4 },
    { "id": "body", "start": { "after": "chapter-intro" }, "end": 8.4 },
    { "id": "outro", "start": 9.2, "end": { "until": "project-end" } }
  ],
  "markers": [
    { "id": "drum-1", "at": 3.26 },
    { "id": "subtitle-cue-3", "at": 6.04 }
  ],
  "clips": [
    { "id": "headline", "start": { "at": "project-start" }, "end": 1.04 },
    { "id": "bumper", "start": { "after": "clip-headline" }, "end": 2.24 },
    { "id": "stinger", "start": { "after": "clip-headline", "gap": 0.5 }, "end": 2.64 },
    { "id": "main", "start": { "at": "chapter-body" }, "end": 5.19 },
    { "id": "accent", "start": { "at": "marker-drum-1" }, "end": 3.86 },
    { "id": "sync-bar", "start": { "sync": "subtitle-cue-3" }, "end": { "until": "chapter-outro.start" } },
    { "id": "pre-outro", "start": 7.3, "end": { "before": "chapter-outro", "gap": 1 } },
    { "id": "credits", "start": 10.7, "end": { "until": "project-end" } }
  ]
}
```

## Resolved Output

```json
{
  "project": { "end": 12, "start": 0 },
  "chapters": [
    { "id": "intro", "start": 0, "end": 2.4 },
    { "id": "body", "start": 2.4, "end": 8.4 },
    { "id": "outro", "start": 9.2, "end": 12 }
  ],
  "markers": [
    { "id": "drum-1", "at": 3.3 },
    { "id": "subtitle-cue-3", "at": 6 }
  ],
  "clips": [
    { "id": "headline", "start": 0, "end": 1 },
    { "id": "bumper", "start": 1, "end": 2.2 },
    { "id": "stinger", "start": 1.5, "end": 2.6 },
    { "id": "main", "start": 2.4, "end": 5.2 },
    { "id": "accent", "start": 3.3, "end": 3.9 },
    { "id": "sync-bar", "start": 6, "end": 9.2 },
    { "id": "pre-outro", "start": 7.3, "end": 8.2 },
    { "id": "credits", "start": 10.7, "end": 12 }
  ]
}
```

## Test Coverage Notes

- 5 fixture timelines with mixed symbolic references
- All requested expression forms covered:
  - `{ at: 'project-start' }`
  - `{ at: 'chapter-body' }`
  - `{ at: 'marker-drum-1' }`
  - `{ after: 'clip-headline' }`
  - `{ after: 'clip-headline', gap: 0.5 }`
  - `{ before: 'chapter-outro', gap: 1 }`
  - `{ sync: 'subtitle-cue-3' }`
  - `{ until: 'chapter-outro.start' }`
  - `{ until: 'project-end' }`
- Roundtrip stability test: serialize, resolve, edit non-timing metadata, serialize, resolve again
- Cycle detection test
- Invalid reference test
