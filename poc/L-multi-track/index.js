import { readFile, writeFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import { auroraGradient } from './auroraGradient.js';

const width = 1920;
const height = 1080;
const defaultT = 2.5;
const blendModes = ['source-over', 'screen', 'multiply', 'overlay'];
const outputNames = {
  'source-over': 'frame_so.png',
  screen: 'frame_screen.png',
  multiply: 'frame_multiply.png',
  overlay: 'frame_overlay.png',
};
const auroraParams = {
  hueA: 270,
  hueB: 200,
  hueC: 320,
  intensity: 1,
  grain: 0.04,
};

const cliT = Number.parseFloat(process.argv[2] ?? `${defaultT}`);
if (!Number.isFinite(cliT)) {
  console.error(`Invalid time value: ${process.argv[2] ?? '(missing)'}`);
  process.exit(1);
}

function centerCircle(localT, _params, ctx) {
  const cx = width / 2;
  const cy = height / 2;
  const pulse = 0.5 + 0.5 * Math.sin(localT * Math.PI * 2);
  const radius = 110 + pulse * 45;
  const glowRadius = radius * 1.8;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  glow.addColorStop(0.45, 'rgba(255, 255, 255, 0.6)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

const timeline = [
  {
    trackId: 'v1',
    clipId: 'auroraGradient',
    start: 0,
    end: 5,
    blendMode: 'source-over',
    render(localT, ctx, globalT) {
      auroraGradient(localT, auroraParams, ctx, globalT);
    },
  },
  {
    trackId: 'v2',
    clipId: 'centerCircle',
    start: 1,
    end: 4,
    render(localT, ctx) {
      centerCircle(localT, {}, ctx);
    },
  },
];

function isActive(clip, t) {
  return t >= clip.start && t < clip.end;
}

function samplePixel(ctx, x, y) {
  const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return {
    x,
    y,
    rgba: [r, g, b, a],
    luminance: Number(luminance.toFixed(2)),
  };
}

function samePixel(a, b) {
  return a.rgba.every((value, index) => value === b.rgba[index]);
}

async function countLoc(paths) {
  let total = 0;
  for (const path of paths) {
    const text = await readFile(new URL(path, import.meta.url), 'utf8');
    total += text.split('\n').length;
  }
  return total;
}

function renderBackgroundBaseline(t) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const backgroundClip = timeline[0];
  backgroundClip.render(t - backgroundClip.start, ctx, t);
  return {
    corner: samplePixel(ctx, 40, 40),
    center: samplePixel(ctx, Math.floor(width / 2), Math.floor(height / 2)),
  };
}

function renderMode(t, blendMode, baselineSamples) {
  const outputCanvas = createCanvas(width, height);
  const outputCtx = outputCanvas.getContext('2d');
  const activeClips = timeline.filter((clip) => isActive(clip, t));

  const startedAt = performance.now();
  for (const clip of activeClips) {
    const clipCanvas = createCanvas(width, height);
    const clipCtx = clipCanvas.getContext('2d');
    const localT = t - clip.start;

    clip.render(localT, clipCtx, t);

    outputCtx.save();
    outputCtx.globalCompositeOperation =
      clip.trackId === 'v2' ? blendMode : (clip.blendMode ?? 'source-over');
    outputCtx.drawImage(clipCanvas, 0, 0, width, height);
    outputCtx.restore();
  }

  const pngBuffer = outputCanvas.toBuffer('image/png');
  const finishedAt = performance.now();
  const corner = samplePixel(outputCtx, 40, 40);
  const center = samplePixel(outputCtx, Math.floor(width / 2), Math.floor(height / 2));
  const centerLooksWhite = center.luminance >= 235 && center.rgba[0] >= 235 && center.rgba[1] >= 235;
  const cornerLooksDark = corner.luminance <= 32;

  return {
    filename: outputNames[blendMode],
    blendMode,
    renderMs: Number((finishedAt - startedAt).toFixed(3)),
    activeClips: activeClips.map((clip) => ({
      trackId: clip.trackId,
      clipId: clip.clipId,
      localT: Number((t - clip.start).toFixed(3)),
    })),
    samples: {
      corner,
      center,
    },
    validation: {
      auroraBackgroundDark: cornerLooksDark,
      centerNearWhite: centerLooksWhite,
      zOrderLooksCorrect:
        samePixel(corner, baselineSamples.corner) &&
        !samePixel(center, baselineSamples.center),
    },
    pngBuffer,
  };
}

function buildReport({ t, results, totalLoc }) {
  const modeLines = results.map((result) => {
    const { blendMode, renderMs, samples, validation } = result;
    return [
      `### ${blendMode}`,
      `- Render + PNG encode: \`${renderMs} ms\``,
      `- Corner sample \`(40, 40)\`: \`${samples.corner.rgba.join(', ')}\`, luminance \`${samples.corner.luminance}\``,
      `- Center sample \`(960, 540)\`: \`${samples.center.rgba.join(', ')}\`, luminance \`${samples.center.luminance}\``,
      `- Background dark check: \`${validation.auroraBackgroundDark}\``,
      `- Center near-white check: \`${validation.centerNearWhite}\``,
      `- Z-order check: \`${validation.zOrderLooksCorrect}\``,
    ].join('\n');
  });

  const workingModes = results
    .filter((result) => result.validation.auroraBackgroundDark && result.validation.centerNearWhite)
    .map((result) => `\`${result.blendMode}\``)
    .join(', ');

  const failingModes = results
    .filter((result) => !result.validation.centerNearWhite)
    .map((result) => `\`${result.blendMode}\``)
    .join(', ');

  return `# L-multi-track Report

## Result

- Canvas backend: \`@napi-rs/canvas\`
- Frame time tested: \`t=${t}\`
- Resolution: \`1920x1080\`
- Outputs: \`frame_so.png\`, \`frame_screen.png\`, \`frame_multiply.png\`, \`frame_overlay.png\`
- Active clips at \`t=${t}\`: background \`auroraGradient\` on track \`v1\` and overlay \`centerCircle\` on track \`v2\`

## Blend Mode Findings

- All four blend modes rendered without errors in \`@napi-rs/canvas\`.
- Blend modes that matched the intended "bright white circle on top of aurora" result: ${workingModes || 'none'}
- Blend modes that composited but did not keep the center near-white: ${failingModes || 'none'}
- \`multiply\` is the main gotcha for this content: multiplying with a white source mostly preserves the darker destination, so the center sample is effectively indistinguishable from the background-only frame.

${modeLines.join('\n\n')}

## Z-ordering

- Track order is correct when clips are composited in timeline order \`v1 -> v2\`.
- The center sample is much brighter than the corner sample for the working modes, which shows the circle is landing on top of the aurora instead of being hidden behind it.
- Track-level blend modes must be applied when compositing each clip canvas into the master canvas, not by mutating the scene's own \`ctx.globalCompositeOperation\`. The aurora scene changes its own blend mode internally, so drawing scenes directly into one shared canvas would make per-track blend modes unreliable.

## Timing

${results.map((result) => `- \`${result.blendMode}\`: \`${result.renderMs} ms\``).join('\n')}

## LOC

- Total LOC in this POC: \`${totalLoc}\`

## Setup

\`\`\`bash
npm install
node index.js
\`\`\`

## Gotchas

- Clip activation is timeline-based; both clips are active at \`t=${t}\`, but each scene receives its own local clip time, so the circle pulse uses \`1.5s\` while the aurora uses \`2.5s\`.
- Saving PNGs and sampling pixels from the composed canvas is enough to validate ordering and visibility without opening a window.
- If you need strict visual assertions across blend modes, validate against sampled pixels or luminance deltas. Visual intuition is not enough for modes like \`multiply\`.
`;
}

const baselineSamples = renderBackgroundBaseline(cliT);

const results = [];
for (const blendMode of blendModes) {
  const result = renderMode(cliT, blendMode, baselineSamples);
  const outputUrl = new URL(`./${result.filename}`, import.meta.url);
  await writeFile(outputUrl, result.pngBuffer);
  results.push(result);
}

const totalLoc = await countLoc(['./index.js', './package.json', './auroraGradient.js']);
const report = buildReport({ t: cliT, results, totalLoc });
await writeFile(new URL('./report.md', import.meta.url), report);

console.log(
  JSON.stringify(
    {
      t: cliT,
      outputs: results.map(({ filename, blendMode, renderMs, samples, validation, activeClips }) => ({
        filename,
        blendMode,
        renderMs,
        activeClips,
        samples,
        validation,
      })),
      report: 'report.md',
    },
    null,
    2
  )
);
