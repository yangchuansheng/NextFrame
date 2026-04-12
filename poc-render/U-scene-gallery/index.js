import { createCanvas, Image } from "@napi-rs/canvas";
import { promises as fs } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const WORKDIR = process.cwd();
const SCENES_DIR = "/Users/Zhuanz/bigbang/NextFrame/runtime/web/src/scenes";
const SCENES_INDEX_PATH = path.join(SCENES_DIR, "index.js");
const EXCLUDED_SCENE_FILES = new Set(["index.js", "_image-cache.js"]);
const EXPECTED_SCENE_IDS = [
  "auroraGradient",
  "kineticHeadline",
  "neonGrid",
  "barChartReveal",
  "lowerThirdVelvet",
  "starfield",
  "circleRipple",
  "countdown",
  "lineChart",
  "cornerBadge",
  "textOverlay",
  "imageHero",
  "shapeBurst",
  "fluidBackground",
  "meshGrid",
  "dataPulse",
  "pixelRain",
  "orbitRings",
  "spotlightSweep",
  "glitchText",
  "particleFlow",
];
const FULL_WIDTH = 1920;
const FULL_HEIGHT = 1080;
const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 270;
const RENDER_TIME_SECONDS = 2.5;
const CLIP_DURATION_SECONDS = 5;
const GALLERY_HTML_PATH = path.join(WORKDIR, "gallery.html");
const REPORT_PATH = path.join(WORKDIR, "report.md");
const CONTACT_SHEET_PNG_PATH = path.join(WORKDIR, "contact-sheet.png");

globalThis.Image = Image;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function getSceneRenderer(sceneModule, sceneId) {
  if (typeof sceneModule.default === "function") {
    return sceneModule.default;
  }

  if (typeof sceneModule[sceneId] === "function") {
    return sceneModule[sceneId];
  }

  const fallback = Object.values(sceneModule).find((value) => typeof value === "function");
  if (typeof fallback === "function") {
    return fallback;
  }

  throw new TypeError(`No render function export found for scene "${sceneId}"`);
}

function attachCanvasMetrics(canvas) {
  Object.defineProperties(canvas, {
    clientWidth: {
      configurable: true,
      value: canvas.width,
    },
    clientHeight: {
      configurable: true,
      value: canvas.height,
    },
    getBoundingClientRect: {
      configurable: true,
      value: () => ({
        width: canvas.width,
        height: canvas.height,
        top: 0,
        left: 0,
        right: canvas.width,
        bottom: canvas.height,
        x: 0,
        y: 0,
      }),
    },
  });
}

function drawRenderFailure(ctx, sceneId, error) {
  const { width, height } = ctx.canvas;
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#190a12");
  background.addColorStop(1, "#090307");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 120, 150, 0.28)";
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.fillStyle = "rgba(255, 236, 242, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '900 88px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText("RENDER ERROR", width / 2, height * 0.42);

  ctx.font = '700 42px -apple-system, "Segoe UI", sans-serif';
  ctx.fillText(sceneId, width / 2, height * 0.54);

  ctx.font = '500 30px Menlo, Monaco, monospace';
  const message = String(error?.message || error).slice(0, 80);
  ctx.fillText(message, width / 2, height * 0.64);
}

async function discoverSceneFiles() {
  const entries = await fs.readdir(SCENES_DIR, { withFileTypes: true });
  const sceneFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js") && !EXCLUDED_SCENE_FILES.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const sceneIds = sceneFiles.map((file) => path.basename(file, ".js"));
  if (sceneFiles.length !== 21) {
    throw new Error(`Expected 21 scene files, found ${sceneFiles.length}`);
  }

  const missingExpected = EXPECTED_SCENE_IDS.filter((sceneId) => !sceneIds.includes(sceneId));
  const unexpected = sceneIds.filter((sceneId) => !EXPECTED_SCENE_IDS.includes(sceneId));
  if (missingExpected.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Scene discovery mismatch. Missing: ${missingExpected.join(", ") || "none"}. Unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }

  return sceneFiles;
}

function buildHtml(items, totalSeconds) {
  const cards = items.map((item) => `        <article class="card">
          <img src="./${encodeURIComponent(item.fileName)}" alt="${escapeHtml(item.label)} preview" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}">
          <div class="meta">
            <h2>${escapeHtml(item.label)}</h2>
            <p>${escapeHtml(item.id)}</p>
          </div>
        </article>`).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>POC U Scene Gallery</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #05070c;
        --bg-alt: #0e1320;
        --card: rgba(15, 20, 31, 0.88);
        --border: rgba(255, 255, 255, 0.1);
        --text: #eef2ff;
        --muted: #9aa6c7;
        --accent: #7dd3fc;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background:
          radial-gradient(circle at top, rgba(46, 89, 179, 0.2), transparent 30%),
          linear-gradient(180deg, var(--bg-alt), var(--bg));
        color: var(--text);
        font-family: "Avenir Next", "Segoe UI", sans-serif;
      }

      main {
        padding: 28px;
      }

      header {
        margin-bottom: 24px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 32px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      header p {
        margin: 0;
        color: var(--muted);
        font-size: 15px;
      }

      .grid-shell {
        overflow-x: auto;
        padding-bottom: 8px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(7, 240px);
        gap: 14px;
        width: max-content;
      }

      .card {
        margin: 0;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
      }

      .card img {
        display: block;
        width: 240px;
        height: auto;
        background: #02040a;
      }

      .meta {
        padding: 10px 12px 12px;
      }

      .meta h2 {
        margin: 0 0 4px;
        font-size: 14px;
        line-height: 1.2;
      }

      .meta p {
        margin: 0;
        font-family: Menlo, Monaco, monospace;
        color: var(--accent);
        font-size: 11px;
      }

      @media (max-width: 700px) {
        main {
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>POC U Scene Gallery</h1>
        <p>21 scenes rendered at t=${RENDER_TIME_SECONDS}s from 1920x1080 and downscaled to 480x270. Total render time: ${totalSeconds.toFixed(2)}s.</p>
      </header>
      <div class="grid-shell">
        <section class="grid">
${cards}
        </section>
      </div>
    </main>
  </body>
</html>`;
}

async function writeContactSheet(items) {
  const columns = 3;
  const rows = Math.ceil(items.length / columns);
  const titleHeight = 120;
  const labelHeight = 52;
  const gap = 24;
  const sheetWidth = columns * PREVIEW_WIDTH + (columns + 1) * gap;
  const sheetHeight = titleHeight + rows * (PREVIEW_HEIGHT + labelHeight) + (rows + 1) * gap;
  const canvas = createCanvas(sheetWidth, sheetHeight);
  attachCanvasMetrics(canvas);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, 0, sheetHeight);
  background.addColorStop(0, "#0a1220");
  background.addColorStop(1, "#05070c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, sheetWidth, sheetHeight);

  ctx.fillStyle = "rgba(240, 244, 255, 0.95)";
  ctx.font = '900 54px "Avenir Next", "Segoe UI", sans-serif';
  ctx.fillText("POC U Scene Gallery", gap, 68);
  ctx.fillStyle = "rgba(154, 166, 199, 0.95)";
  ctx.font = '500 24px Menlo, Monaco, monospace';
  ctx.fillText(`21 scenes  |  t=${RENDER_TIME_SECONDS}s  |  480x270 previews`, gap, 100);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = gap + column * (PREVIEW_WIDTH + gap);
    const y = titleHeight + gap + row * (PREVIEW_HEIGHT + labelHeight);
    ctx.fillStyle = "rgba(10, 14, 22, 0.95)";
    ctx.fillRect(x - 1, y - 1, PREVIEW_WIDTH + 2, PREVIEW_HEIGHT + labelHeight + 2);
    ctx.drawImage(item.canvas, x, y, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    ctx.fillStyle = "rgba(240, 244, 255, 0.95)";
    ctx.font = '800 24px "Avenir Next", "Segoe UI", sans-serif';
    ctx.fillText(item.label, x, y + PREVIEW_HEIGHT + 28);
    ctx.fillStyle = "rgba(125, 211, 252, 0.9)";
    ctx.font = '500 18px Menlo, Monaco, monospace';
    ctx.fillText(item.id, x, y + PREVIEW_HEIGHT + 48);
  }

  await fs.writeFile(CONTACT_SHEET_PNG_PATH, canvas.toBuffer("image/png"));
}

async function main() {
  const startedAt = performance.now();
  const sceneFiles = await discoverSceneFiles();
  const { SCENE_MANIFEST } = await import(pathToFileURL(SCENES_INDEX_PATH).href);
  const manifestById = new Map(SCENE_MANIFEST.map((scene) => [scene.id, scene]));
  const orderedSceneIds = EXPECTED_SCENE_IDS.filter((sceneId) => sceneFiles.includes(`${sceneId}.js`));
  const results = [];
  const renderFailures = [];

  for (const sceneId of orderedSceneIds) {
    const manifestEntry = manifestById.get(sceneId);
    if (!manifestEntry) {
      throw new Error(`Missing manifest entry for scene "${sceneId}"`);
    }

    const scenePath = path.join(SCENES_DIR, `${sceneId}.js`);
    const sceneModule = await import(pathToFileURL(scenePath).href);
    const renderScene = getSceneRenderer(sceneModule, sceneId);
    const fullCanvas = createCanvas(FULL_WIDTH, FULL_HEIGHT);
    attachCanvasMetrics(fullCanvas);
    const fullCtx = fullCanvas.getContext("2d");

    try {
      renderScene(
        RENDER_TIME_SECONDS,
        structuredClone(manifestEntry.default_params || {}),
        fullCtx,
        RENDER_TIME_SECONDS,
        FULL_WIDTH,
        FULL_HEIGHT,
        CLIP_DURATION_SECONDS,
      );
    } catch (error) {
      renderFailures.push({ sceneId, error: String(error?.message || error) });
      drawRenderFailure(fullCtx, sceneId, error);
    }

    const previewCanvas = createCanvas(PREVIEW_WIDTH, PREVIEW_HEIGHT);
    attachCanvasMetrics(previewCanvas);
    const previewCtx = previewCanvas.getContext("2d");
    previewCtx.imageSmoothingEnabled = true;
    previewCtx.drawImage(fullCanvas, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

    const fileName = `frame_${sceneId}.png`;
    await fs.writeFile(path.join(WORKDIR, fileName), previewCanvas.toBuffer("image/png"));
    results.push({
      id: sceneId,
      label: manifestEntry.name,
      fileName,
      canvas: previewCanvas,
    });
  }

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  await fs.writeFile(GALLERY_HTML_PATH, buildHtml(results, elapsedSeconds));
  await writeContactSheet(results);

  const reportLines = [
    "# POC U Scene Gallery Report",
    "",
    `- Generated on: ${new Date().toISOString()}`,
    `- Scene source: \`${SCENES_DIR}\``,
    `- Scenes rendered: ${results.length}`,
    `- Render timestamp: t=${RENDER_TIME_SECONDS}s`,
    `- Output size per scene: ${PREVIEW_WIDTH}x${PREVIEW_HEIGHT} PNG preview rendered from ${FULL_WIDTH}x${FULL_HEIGHT}`,
    `- Gallery: \`gallery.html\``,
    `- Contact sheet: \`contact-sheet.png\``,
    `- Total time: ${elapsedSeconds.toFixed(2)}s`,
    "",
    "## Scene quality review",
    "",
    "_Pending visual review after render execution._",
  ];

  if (renderFailures.length > 0) {
    reportLines.push("");
    reportLines.push("## Render failures");
    reportLines.push("");
    for (const failure of renderFailures) {
      reportLines.push(`- ${failure.sceneId}: ${failure.error}`);
    }
  }

  await fs.writeFile(REPORT_PATH, `${reportLines.join("\n")}\n`);

  console.log(`Rendered ${results.length} scenes in ${elapsedSeconds.toFixed(2)}s`);
  console.log(`Gallery: ${GALLERY_HTML_PATH}`);
  console.log(`Contact sheet: ${CONTACT_SHEET_PNG_PATH}`);
}

await main();
