# NextFrame POC Summary

All experiments exploring rendering technologies, pipeline capabilities, AI integration, and editor architecture for NextFrame — an AI-native video editor.

---

## 1. Rendering Technologies

Benchmark scene: `auroraGradient` at 1920×1080. All candidates rendered the same frame for direct comparison.

| POC | Tech | Render time | Notes | Verdict |
|-----|------|-------------|-------|---------|
| A | wry + WKWebView snapshot (Rust) | 658 ms | Accessory-window workaround for headless WebKit; Retina doubles resolution | Rejected (too slow) |
| B | node-canvas | 403 ms | Grain pass (230k fillRect calls) is the bottleneck | Adopted for dev pipeline |
| C | Puppeteer / headless Chromium | 883 ms | Heavyweight; local Chromium download needed | Rejected |
| D | @napi-rs/canvas (Skia-backed) | 377 ms warm | Same bottleneck as B; native but not faster for this scene | Adopted (same tier as B) |
| E | Rust + tiny-skia (CPU) | 51 ms | Direct math port; no JS dependency | Adopted as CPU reference |
| Q | wgpu (GPU, Rust) | 0.038 ms GPU / 3.7 ms end-to-end | ~14× faster than tiny-skia on GPU pass; readback is the real cost | **Winner — adopted for export** |
| S | Rust compiled to WASM (Node host) | 49 ms warm / 107 ms cold | Warm parity with native E; 28 KB binary; cold-start worse | Adopted for JS-hosted scene kernels |

**Decision:** Canvas (B/D) for preview/dev; wgpu (Q) for final export; WASM (S) for portable scene kernels.

---

## 2. Pipeline Capabilities

| POC | Capability | Key finding | Verdict |
|-----|-----------|-------------|---------|
| F | Hit-test via id-buffer | Double-buffer overhead is acceptable; awkward for bezier/text paths | Informed — geometric hit-test preferred |
| G | Element tree + geometric hit-test | 39 ms; 2.1× author LOC vs frame-pure but buys stable IDs, drag, and transforms | **Adopted — element tree is the scene model** |
| H | frames → MP4 (ffmpeg) | 150 unique frames, 5s @ 30fps, 3.4 MB, 38s sequential render | Adopted — ffmpeg mux path confirmed |
| I | Hot-reload dev server | 76.8 ms avg save-to-frame latency via fs.watch + WebSocket + JSON re-fetch | Adopted — sub-100ms dev loop |
| J | AI-authored timeline (manifest) | Manifest useful for demo prompting; not sufficient alone without schema + compositing rules | Informed — full schema required |
| K | Parallel render (worker_threads) | 3.76× speedup with 8 workers on 300 frames (vs 8× theoretical) | Adopted — parallel export pipeline |
| L | Multi-track compositing + blend modes | source-over and screen preserve center-white; multiply/overlay do not; per-track canvas required | **Adopted — per-track canvas compositing** |
| M | Video clip (ffmpeg seek) | 56 ms cold extract; frame-pure via `(src, time)` cache; cache key rounds to µs | Adopted — video clip model confirmed |
| N | Cross-resolution rendering | Same scene renders cleanly at 4K/1080p/9:16/1:1/720 with coordinate normalization | Adopted — scenes must use relative coordinates |
| O | Audio master clock | Sample-accurate video frame mapping; 44100/30 = exact integer boundary; A/V sync 0.000 s delta | **Adopted — audio is the master clock** |
| P | SRT subtitles | 0.3 ms parse; 39 ms render; frame-pure with path-keyed parse cache | Adopted — subtitle model confirmed |
| R | Scene hot-reload (ESM cache-bust) | 95 ms save-to-render; `?v=Date.now()` URL makes Node treat module as fresh | Adopted — ESM reload pattern |
| T | Video seek + speed + reverse | 62 ms cold extract; all 4 modes (normal/2×/0.5×/reverse) frame-pure and cache-stable | Adopted — speed/reverse model confirmed |
| U | Scene gallery (21 scenes) | All 21 render in 1.4 s; full-frame backgrounds best; overlay scenes weak without base | Adopted — gallery pipeline confirmed |

---

## 3. AI Integration

| POC | Capability | Key finding | Verdict |
|-----|-----------|-------------|---------|
| W1 | `scene.describe()` — semantic frame metadata | 156 LOC; returns phase, element positions, text; same math as render; text width approximate | **Adopted — every scene must implement describe()** |
| W2 | ASCII Gantt — timeline as text | 80-column fit; clip labels + chapter markers; dense tick strategy; complex 6-track timelines readable | **Adopted — standard AI timeline view** |
| W3 | ASCII screenshot — frame as text | 80×24 grid, ~2 KB; gradient and text survive downscale; black frame → empty (detectable) | Adopted — free "vision" for any frame |
| W4 | Symbolic time resolver | `{ after: "clip-x", gap: 0.5 }` → resolved seconds; cycle detection; 9/9 tests pass | **Adopted — AI never writes raw seconds** |
| W5 | AI tool surface (7 functions) | `find_clips / get_clip / describe_frame / apply_patch / assert_at / render_ascii / ascii_gantt`; THINK→SEARCH→PATCH→ASSERT→RENDER rhythm | **Adopted — canonical AI edit loop** |
| W7 | Real vision LLM as fallback | Metadata covers ~95% of verification; vision needed only for aesthetic quality, contrast, unexpected layout breaks | Adopted — vision is a fallback, not primary |

---

## 4. Editor & Architecture

| POC | What it is | Key finding | Verdict |
|-----|-----------|-------------|---------|
| V | Interactive editor (single HTML) | Click/drag/resize/scrub on real canvas; geometric hit-test; promising feel; requires scene-native element graph for production | Informed — confirms direction, not production-ready |
| Z | Hybrid rendering (Canvas + DOM + SVG + CSS) | All four rendering technologies coexist in one frame; per-track compositing required | **Adopted — hybrid per-track model** |
| X | ScreenCaptureKit → IOSurface → AVAssetWriter | Zero-copy SCStream → CMSampleBuffer → H.264; needs Screen Recording permission | Explored — too many permissions |
| Y | CALayer.contents → IOSurface zero-copy | Direct IOSurface read from WKWebView layer tree; no extra permissions needed | **Adopted — zero-copy capture path** |
| 11 | IOSurface A/B benchmark | CALayer.render (CPU rasterize) vs IOSurface direct read; baseline CPU path won on this test | Informed — baseline wins at current scale |
| 01 | Frame-pure animation demo | 10-minute pure-function animation proof-of-concept | Informed — validated frame-pure model |
| 02 | Multi-track engine + library + JSON timeline | Engine + scene library + JSON timeline integration demo | Informed — architecture validated |
| 03 | Editor mockup (PRISM, 3 iterations) | Desktop editor UI prototypes; 3 versions exploring interaction models | Informed — UX direction |
| 04 | DOM atoms showcase | 8 atom effects × 6 presets; animation separated from content | Adopted — atoms pattern |
| 05 | Top-tier scene showcase | 5 production-quality scenes (product reveal, dashboard, WebGL, morphing text, particles) | Reference — sets visual bar |
| 06 | Whiteboard / animation styles | Duo-owl, WeChat animation proofs | Explored |
| 07 | Fourier engine | Fourier-based animation engine exploration | Explored |
| 10 | DOM atoms demo | DOM-driven atoms with CSS animation isolation | Adopted — DOM atoms confirmed |
| 12 | Preview engine (direct render) | Replaced iframe preview with `createEngine(stageEl, timeline, registry)` called from editor document; solves cross-origin, drag selection, and screenshot issues | **Adopted — engine renders directly into editor DOM** |

---

## 5. Decisions Made

| Decision | Adopted from |
|----------|-------------|
| **Frame-pure render model** — `scene(t, params, ctx)` is the only API | E, G, M, P, T |
| **Element tree as scene model** — stable IDs, geometric hit-test, declarative animation | G |
| **Per-track canvas compositing** — each track renders to its own canvas, then blended onto master | L, Z |
| **Audio is the master clock** — video frame times derived from sample position, not floats | O |
| **wgpu for export** — GPU render pass at 0.038 ms, ~14× faster than CPU skia | Q |
| **Canvas (node-canvas / napi-canvas) for preview** — fast enough, JS-native | B, D |
| **WASM for portable scene kernels** — warm parity with native, 28 KB, JS-hosted | S |
| **ASCII Gantt + describe() + ASCII screenshot** — AI observes the timeline without vision | W1, W2, W3 |
| **Symbolic time** — AI authors timelines with `{ after: "clip-x", gap: 0.5 }` | W4 |
| **AI edit loop: THINK→SEARCH→PATCH→ASSERT→RENDER** | W5 |
| **Vision LLM as fallback** — for aesthetic/contrast checks only | W7 |
| **Direct engine render** — editor calls engine directly, no iframe | 12 |
| **DOM atoms pattern** — animation separated from content structure | 04, 10 |
| **Scenes must use relative coordinates** — adapt to any resolution | N |
| **ESM cache-bust hot-reload** — `?v=Date.now()` URL for sub-100ms dev loop | I, R |
