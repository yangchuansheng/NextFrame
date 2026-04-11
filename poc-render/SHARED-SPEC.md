# NextFrame POC — Shared Spec

**Core thesis to validate:** `(scene_function, t_seconds) → frame.png`

## Input (identical for all 5 POCs)

- `auroraGradient.js` (frame-pure JS function, copied to `poc-render/auroraGradient.js`)
  - signature: `auroraGradient(t, params, ctx, globalT)`
  - draws to a 2D Canvas-style context
  - deterministic: same `t` + same `params` → same pixels

- Test harness must call:
  ```
  auroraGradient(5.0, { hueA: 270, hueB: 200, hueC: 320, intensity: 1, grain: 0.04 }, ctx)
  ```
  on a 1920×1080 canvas.

## Required output

- A single PNG file `frame_t5.png` saved in your POC dir
- File must:
  - Be a valid 1920×1080 PNG
  - Be visually NON-trivial (not blank, not solid color)
  - Match what the scene draws: dark base + drifting aurora blobs in purple/blue/pink
- A `report.md` with:
  - How long the render took (ms)
  - Total LOC of your solution
  - Any setup steps (npm install, cargo deps, etc.)
  - Honest gotchas

## Required CLI invocation

After your POC is built, the user must be able to:
```
cd poc-render/{your-dir}
{your-build-command-or-script} 5.0
```
And get `frame_t5.png` next to your code.

## Constraints

- **Headless** — no real window opens, no human interaction
- **No accumulated state** — must work for ANY t, not just t=5
- **Single file output** — no intermediate frames, no MP4
- **Self-contained** — your POC dir + node_modules/Cargo.lock is enough; no MediaAgentTeam recorder, no NextFrame shell
