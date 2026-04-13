# Review

## Findings

1. `runtime/web/src/app-bundle.js:242-245` breaks the required `.nf-layer > *` interaction target. For any scene root with children, `markSelectableElements()` sets `sceneRoot.style.pointerEvents = "none"` and only marks `sceneRoot.querySelectorAll("*")` as selectable. That means the direct `.nf-layer > *` element itself cannot be clicked, hovered, selected, or dragged, which fails the spec that explicitly targets `.nf-layer > *` and says every preview DOM element must be interactive.

## Verification

- `node --check runtime/web/src/app-bundle.js`
- `cargo check`

## Verdict

Incomplete. The interaction code exists and both verification commands pass, but the core selection target is wrong for multi-child scene roots.
