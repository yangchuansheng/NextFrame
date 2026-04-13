# POC V Report

## Approach

I used geometric hit-testing, not an id-map buffer.

- The editor imports `runtime/web/src/scenes/lowerThirdVelvet.js` when the module is reachable.
- Because a static server rooted at `poc-render/V-interactive-edit` cannot serve `../../runtime/...` over HTTP, the page falls back to a mirrored in-page renderer and shows `Source Mirror Mode`.
- The editable model exposes four selectable elements: `bar`, `dot`, `title`, and `subtitle`.
- Each element has position and scale params. Click selects by bounding-box hit-test, drag mutates offsets, and corner handles mutate scale.

## Feel

- Timeline scrubbing, param edits, drag, and resize all happen in a real browser on a live 1920x1080 canvas.
- The interaction path is effectively next-frame. In synthetic headless Chrome runs, JS render cost rounded to `0.00ms`; in practice this means the visible feel is refresh-bound, roughly one frame of latency.
- Realistic expectation: about `8-16ms` perceived lag on a 60-120Hz display, assuming the scene stays this simple.
- The feel is promising for overlays and typography. Selecting text and moving it directly is the right direction.

## Missing For Production

- Scene-native editable trees. Right now the editor mirrors `lowerThirdVelvet` draw logic because the runtime scene API does not expose selectable nodes.
- Stable source importing. Serving from the POC folder over HTTP cannot directly import sibling runtime files outside the server root.
- True visual parity guarantees. A mirrored renderer will drift from the source scene unless both stay in lockstep.
- Better hit proxies. Bounding boxes are fine here, but more complex scenes will need either an id-map pass or authored pick geometry.
- Undo/redo, snapping, guides, constraints, multi-select, keyboard nudging, and persistent presets.
- Param schema for editor affordances. Production needs metadata for which params map to position, scale, anchors, and handles.

## Killer Feature?

Potentially yes, but not yet by itself.

The core interaction is strong: click the thing, drag it, resize it, scrub time, export state. That already feels closer to a killer feature than parameter-only editing. But the current POC still relies on an editor-side mirror of scene geometry. NextFrame becomes a real category-defining tool when scenes themselves expose an editable element graph so this interaction works for any authored scene, not just for hand-adapted overlays like this one.
