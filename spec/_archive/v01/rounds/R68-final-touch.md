# Task — R68: Update demo timeline + add scene picker integration

## Goal
Refresh the demo-timeline.json to showcase the newer scenes (fluidBackground, glitchText, orbitRings, etc.) instead of just the original 5. Make it a 60-second showcase.

## Requirements

### `runtime/web/src/demo-timeline.json` — REPLACE with showcase
- Duration: 60 seconds
- Background: #0b0b14
- Tracks:
  - V1 (background layer): fluidBackground 0-30s, particleFlow 30-60s
  - V2 (mid layer): orbitRings 5-25s, meshGrid 30-50s
  - V3 (text/overlay): glitchText 8-14s ("NEXTFRAME"), kineticHeadline 18-26s, lowerThirdVelvet 50-60s, countdown 14-18s, textOverlay 26-32s ("FRAME-PURE · AI-NATIVE")
  - V4 (accent): shapeBurst 12-16s, dataPulse 32-44s, pixelRain 44-50s, spotlightSweep 35-47s
- Each scene's params should look great (use sensible defaults from manifest)
- Audio: keep existing demo-audio.wav references but extend timing across 60s

### Validation
- Must pass engine.validateTimeline (no overlaps within a track, durations valid)
- Must reference only scenes that exist in SCENE_MANIFEST
- Total ≥18 clips

## Technical Constraints
- Pure JSON edit + validation
- All existing tests pass

## Verification Commands
```bash
python3 -c "import json; d = json.load(open('runtime/web/src/demo-timeline.json')); assert d['duration'] == 60; total_clips = sum(len(t['clips']) for t in d['tracks']); print('clips:', total_clips); assert total_clips >= 18"
node --input-type=module -e "
import { validateTimeline } from './runtime/web/src/engine/index.js';
import fs from 'fs';
const d = JSON.parse(fs.readFileSync('runtime/web/src/demo-timeline.json', 'utf8'));
const v = validateTimeline(d);
if (!v.ok) { console.error(v.errors); process.exit(1); }
console.log('valid');
"
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
