# NextFrame

**AI-native video engine.** JSON in, video out. No timeline editors, no drag-and-drop — just structured data and pure functions.

NextFrame turns structured information into videos. Feed it a JSON timeline and scene components, and it produces playable HTML or MP4. Interview clips with bilingual subtitles, code tutorials with syntax highlighting, product demos with motion graphics — if it can be described as data, NextFrame can render it.

## Why

Existing video tools are built for humans clicking buttons. NextFrame is built for AI agents writing JSON. Every operation is a CLI command. Every visual element is a pure function `f(t) → frame`. Every design decision lives in a shared token system, not scattered across files.

The result: an AI model (even a less capable one) can walk a state machine, build scene components, assemble timelines, and produce broadcast-quality video — without human intervention.

## Quick Start

```bash
# Clone and install
git clone https://github.com/anthropics/NextFrame.git
cd NextFrame

# List all 40+ scene components
node src/nf-cli/bin/nextframe.js scenes

# Inspect a specific scene contract (params, types, defaults)
node src/nf-cli/bin/nextframe.js scenes interviewChrome

# Create a new timeline
node src/nf-cli/bin/nextframe.js new -o timeline.json --ratio=9:16 --duration=60

# Add layers
node src/nf-cli/bin/nextframe.js layer-add timeline.json --scene=interviewChrome --start=0 --dur=60
node src/nf-cli/bin/nextframe.js layer-add timeline.json --scene=interviewBiSub --start=0 --dur=60

# Validate (6 gates: format, scenes, params, overlap, audio, ratio)
node src/nf-cli/bin/nextframe.js validate timeline.json

# Build to single-file HTML
node src/nf-cli/bin/nextframe.js build timeline.json -o output.html

# Preview with screenshots for verification
node src/nf-cli/bin/nextframe.js preview timeline.json

# Record to MP4 (requires macOS + Rust toolchain)
cargo run --release --features cli --bin nextframe-recorder -- slide output.html \
  --out output.mp4 --width 1080 --height 1920 --fps 30 --dpr 2
```

## Architecture

Two languages, clear boundary:

```
JSON Timeline ──→ JS Engine (nf-core) ──→ Single-file HTML ──→ Rust Recorder ──→ MP4
                      │                                              │
                 Scene components                           WKWebView + VideoToolbox
                 (pure functions)                           (parallel frame capture)
```

**JavaScript side:**
- `nf-core/` — Engine core: timeline, animation, scenes, build, validation
- `nf-cli/` — 50+ CLI commands (timeline CRUD, scene dev, pipeline, source library)
- `nf-runtime/` — Browser playback runtime

**Rust side (12 crates):**
- `nf-recorder` — WKWebView parallel recording → VideoToolbox → MP4
- `nf-bridge` — JSON IPC between desktop shell and engine
- `nf-shell-mac` — Native macOS app (objc2 + AppKit + WebKit)
- `nf-tts` — TTS with Edge and Volcengine backends
- `nf-publish` — Multi-platform publisher
- `nf-source` — Source pipeline: download → transcribe → align → cut → translate
- `nf-guide` — State machine prompts for AI-driven production

## CLI Reference

### Timeline

| Command | Description |
|---------|-------------|
| `new` | Create an empty timeline JSON |
| `validate` | Run 6-gate validation with fix hints |
| `build` | Bundle timeline into single-file playable HTML |
| `preview` | Render screenshots at key times for AI verification |
| `frame` | Render a single frame PNG at any time t |
| `render` | Record to MP4 via recorder backend |

### Layer CRUD

| Command | Description |
|---------|-------------|
| `layer-add` | Add a layer with scene, timing, and params |
| `layer-move` | Move a layer to a new start time |
| `layer-resize` | Change layer duration |
| `layer-set` | Set arbitrary properties (params, animation, layout) |
| `layer-remove` | Remove a layer |
| `layer-list` | List all layers with timing info |

### Scene Development

| Command | Description |
|---------|-------------|
| `scenes` | List all scenes or inspect one scene's contract |
| `scene-new` | Create a new scene skeleton |
| `scene-preview` | Live preview with Play/Pause + scrubber |
| `scene-validate` | Validate against ADR-008 contract (16 checks) |

### Source Pipeline

| Command | Description |
|---------|-------------|
| `source-download` | Download source video |
| `source-transcribe` | Run ASR transcription |
| `source-align` | Align SRT against source |
| `source-cut` | Cut clips from source |
| `source-translate` | Translate transcripts |
| `source-list` | List sources with status |

### Project Management

| Command | Description |
|---------|-------------|
| `project-new` | Create project directory |
| `episode-new` | Create episode with pipeline |
| `segment-new` | Create segment timeline |
| `pipeline-get` | Read pipeline state |
| `audio-synth` | Generate TTS audio + subtitles |

Run any command with `--help` for params, examples, and constraints.

## Design System

All visual decisions live in `src/nf-core/scenes/shared/design.js`:

```javascript
import { getPreset } from "../shared/design.js";
const { colors, layout, type } = getPreset("interview-dark");
// colors.primary, layout.video.top, type.title.size — all from one source
```

Two presets ship today:
- **interview-dark** — 9:16 portrait, gold/orange palette, 1080x1920
- **lecture-warm** — 16:9 landscape, warm gold palette, 1920x1080

Adding a new visual style = adding a new preset. No code changes to scenes.

## Scene Components

Scenes are pure functions — no side effects, no state, no DOM manipulation:

```javascript
export const meta = {
  id: "interviewBiSub",
  name: "Bilingual Subtitles",
  ratio: "9:16",
  params: {
    segments: { type: "array", required: true, description: "fine.json segments" }
  }
};

export function render(t, params, vp) {
  const sub = findActiveSub(params.segments, t);
  // returns HTML string — pure function of time
  return `<div>...</div>`;
}
```

8 scene components ship today across 7 categories (backgrounds, typography, data, shapes, overlays, media, browser).

## AI-Driven Production

NextFrame includes `nf-guide`, a state machine that walks AI agents through video production step by step:

```bash
# Get the production guide
nf-guide produce

# Get a specific step
nf-guide produce ratio     # Step 0: choose aspect ratio
nf-guide produce scene     # Step 2: build missing components
nf-guide produce timeline  # Step 3: assemble timeline JSON
nf-guide produce pitfalls  # Known issues + fixes
```

The state machine enforces ordering: ratio → check → scene → timeline → validate → build → record. Each step outputs exactly what the AI needs to proceed. Known pitfalls are documented inline so the AI doesn't repeat mistakes.

## Build & Test

```bash
# Rust
cargo check --workspace           # Compilation check (12 crates)
cargo test --workspace            # Run all tests
cargo clippy --workspace -- -D warnings

# Full lint (10 gates)
bash scripts/lint-all.sh
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Rust + JavaScript |
| Frontend | HTML + CSS (zero frameworks) |
| Desktop | objc2 + AppKit + WebKit (native macOS) |
| Recording | WKWebView + VideoToolbox hardware encoding |
| Serialization | serde + JSON |
| TTS | Edge + Volcengine backends |
| Architecture | Layered crates + trait isolation |
| Deployment | Single binary |

No React. No Electron. No Tauri. No frameworks. Just libraries and platform APIs.

## Project Stats

- **62,000+ lines** of code (Rust 35k, JS 19k, HTML 5k, CSS 3k)
- **1,067 commits**
- **12 Rust crates**
- **50+ CLI commands**
- **100% AI-authored**

## License

MIT
