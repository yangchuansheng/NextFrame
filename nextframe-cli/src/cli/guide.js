// nextframe guide — AI onboarding: conventions, workflow, naming, scene selection.
// This is the first thing an AI agent reads when entering the project.

export async function run(argv) {
  process.stdout.write(GUIDE);
  return 0;
}

const GUIDE = `
══════════════════════════════════════════════════════════════
  NEXTFRAME AI GUIDE — read this before making any video
══════════════════════════════════════════════════════════════

■ WHAT THIS IS
  A CLI video editor. You write a timeline.json, the engine
  renders it to mp4. No GUI needed. Every operation is a
  subcommand that reads/writes JSON.
  The AI helper layer exposes 12 tools for scene lookup,
  validation, patching, timing, and assertions.

■ YOUR WORKFLOW (5 steps, every time)

  1. THINK    — read the brief, decide structure
  2. SEARCH   — \`nextframe scenes\` to pick scenes
               \`nextframe gantt timeline.json\` to see current state
  3. PATCH    — \`nextframe add-clip\`, \`move-clip\`, \`set-param\`, etc.
               always use symbolic time, not raw seconds
  4. ASSERT   — \`nextframe describe timeline.json <t>\` to verify
               \`nextframe validate timeline.json\` to check safety
  5. RENDER   — \`nextframe frame timeline.json <t> probe.png\` for single frame
               \`nextframe render timeline.json out.mp4\` for full video

■ TIMELINE STRUCTURE

  {
    "schema": "nextframe/v0.1",
    "duration": 12,
    "project": { "width": 1920, "height": 1080, "fps": 30 },
    "chapters": [{ "id": "intro", "start": 0, "end": 4 }],
    "markers": [{ "id": "drop", "t": 5.0 }],
    "tracks": [
      { "id": "v1-bg", "kind": "video", "clips": [
        { "id": "bg-aurora", "start": 0, "dur": 12,
          "scene": "auroraGradient", "params": { "hueA": 270 } }
      ]}
    ],
    "assets": []
  }

■ NAMING CONVENTIONS

  track ids:   v1-bg, v2-content, v3-text, v4-overlay, a1-narration
  clip ids:    {scene}-{N}  e.g. auroraGradient-1, textOverlay-3
  marker ids:  marker-{name}  e.g. marker-drop, marker-chorus
  chapter ids: intro, body, outro, chapter-{N}
  asset ids:   img-{name}-{N}, audio-{name}-{N}

■ SYMBOLIC TIME (mandatory for AI)

  ❌ "start": 5.0
  ✅ "start": { "after": "auroraGradient-1", "gap": 0.5 }
  ✅ "start": { "at": "marker-drop" }
  ✅ "start": { "sync": "textOverlay-1" }

  The resolver expands these to numbers at validate/render time.
  You never need to calculate seconds manually.

■ SCENE TYPES

  33 scenes total across 7 render buckets.

  Canvas (26 scenes)  — procedural graphics via napi-canvas
    Backgrounds: auroraGradient, fluidBackground, starfield,
                 spotlightSweep, pixelRain, particleFlow, orbitRings
    Typography:  kineticHeadline, glitchText, countdown
    Shapes:      circleRipple, meshGrid, neonGrid, shapeBurst
    Data Viz:    barChartReveal, lineChart, dataPulse
    Overlays:    textOverlay, cornerBadge, lowerThirdVelvet, vignette
    Series:      ccFrame, ccBigNumber, ccPill, ccNote, ccDesc

  HTML (1 scene) — complex layouts via puppeteer
    htmlSlide    — any HTML+CSS string, rendered via Chrome

  SVG (1 scene) — vector graphics via puppeteer
    svgOverlay   — SVG markup string

  Markdown (1 scene) — docs/code as slides via puppeteer
    markdownSlide — markdown text with anthropic-warm theme

  Media (1 scene) — image files via napi-canvas
    imageHero    — hero image with ken-burns zoom and pan

  Video (2 scenes) — external video frames via ffmpeg
    videoClip    — full-frame video
    videoWindow  — video in macOS window chrome

  Lottie (1 scene) — After Effects animations
    lottieAnim   — Lottie JSON + lottie-web CDN

  Browser scenes need baking:
    nextframe bake-html <timeline.json>
    nextframe bake-browser <timeline.json>
    nextframe bake-video <timeline.json>

■ SCENE SELECTION GUIDE

  Product launch:  auroraGradient + kineticHeadline + lowerThirdVelvet
  Data report:     fluidBackground + barChartReveal + lineChart + dataPulse
  Code walkthrough: markdownSlide + htmlSlide (for code blocks)
  Retro/gaming:    pixelRain + glitchText + countdown + neonGrid
  Cosmic/space:    starfield + orbitRings + shapeBurst
  Clean/corporate: spotlightSweep + textOverlay + cornerBadge
  Tutorial/docs:   markdownSlide + svgOverlay + videoWindow

■ MULTI-TRACK COMPOSITING

  Track 0 (first): draws directly, owns the background
  Track 1+: offscreen canvas, composited with blend mode
    default blend: "lighten" (bright pixels win)
    override per clip: "blend": "source-over" (fully opaque)

  For browser-baked scenes (htmlSlide, svgOverlay, markdownSlide),
  always set "blend": "source-over" — otherwise dark backgrounds
  get eaten by lighten.

■ RENDER FLAGS

  --audio=path.mp3   mux audio track into mp4
  --crf=18           h264 quality (0=lossless, 51=worst, default 20)
  --fps=30           override frame rate
  --target=ffmpeg    render target (only ffmpeg supported in v0.1)
  --json             structured JSON output (always use this)

■ ERROR HANDLING

  All commands return { ok: true, value: ... } or
  { ok: false, error: { code, message, hint } }.
  Never throws. Read the hint — it tells you how to fix.

  Common codes:
    UNKNOWN_SCENE    — typo in scene id, hint lists available scenes
    CLIP_NOT_FOUND   — bad clipId
    TIME_CYCLE       — symbolic time creates a loop
    BAD_CRF          — crf not 0-51
    AUDIO_NOT_FOUND  — --audio path doesn't exist
    OUT_OF_RANGE     — clip exceeds timeline duration

■ SAFETY GATES (run automatically on validate + render)

  1. Schema — required fields present
  2. Time resolve — symbolic time resolves without cycles
  3. Assets — referenced files exist (warning, not error)
  4. Scene refs — all clip.scene ids in registry
  5. Overlap — same-track overlaps warned
  6. Duplicate ids — track/clip id collisions rejected

■ QUICK START

  nextframe new /tmp/my.json --duration=10
  nextframe add-clip /tmp/my.json --track=v1 --scene=auroraGradient --start=0 --duration=10
  nextframe add-clip /tmp/my.json --track=v2 --scene=kineticHeadline --start=1 --duration=5 --params='text=HELLO'
  nextframe validate /tmp/my.json --json
  nextframe gantt /tmp/my.json
  nextframe frame /tmp/my.json 3.0 /tmp/preview.png
  nextframe render /tmp/my.json /tmp/output.mp4 --json

══════════════════════════════════════════════════════════════
`;
