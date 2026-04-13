import crypto from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

const WIDTH = 1920;
const HEIGHT = 1080;
const OUTPUTS = [
  { t: 2, name: 'frame_t2.png' },
  { t: 5.5, name: 'frame_t5.5.png' },
  { t: 8, name: 'frame_t8.png' },
];
const DEFAULT_STYLE = {
  fontSize: 54,
  fontFamily: 'sans-serif',
  fontWeight: '700',
  textColor: '#f7f7fb',
  strokeColor: 'rgba(0, 0, 0, 0.92)',
  strokeWidth: 6,
  paddingX: 28,
  paddingY: 18,
  lineGap: 12,
  bottomMargin: 80,
  maxWidth: WIDTH * 0.76,
  backdropColor: 'rgba(8, 8, 12, 0.82)',
  backdropRadius: 24,
};

const srtCache = new Map();

function parseTimestamp(value) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) {
    throw new Error(`Invalid SRT timestamp: ${value}`);
  }

  const [, hours, minutes, seconds, millis] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(millis) / 1000
  );
}

function parseSrt(raw) {
  const startedAt = performance.now();
  const normalized = raw.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return { cues: [], parseMs: performance.now() - startedAt };
  }

  const cues = normalized.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    let cursor = 0;

    if (/^\d+$/.test(lines[0]?.trim() ?? '')) {
      cursor += 1;
    }

    const timingLine = lines[cursor]?.trim();
    if (!timingLine) {
      throw new Error(`Missing timing line in cue block:\n${block}`);
    }

    const timingMatch = timingLine.match(
      /^(.+?)\s+-->\s+(.+?)(?:\s+.*)?$/
    );
    if (!timingMatch) {
      throw new Error(`Invalid timing line: ${timingLine}`);
    }

    const [, startRaw, endRaw] = timingMatch;
    const text = lines
      .slice(cursor + 1)
      .map((line) => line.trim())
      .join('\n')
      .trim();

    return {
      start: parseTimestamp(startRaw.trim()),
      end: parseTimestamp(endRaw.trim()),
      text,
    };
  });

  return { cues, parseMs: performance.now() - startedAt };
}

async function loadSrtCached(srtPath) {
  const resolvedPath = path.resolve(srtPath);
  const lookupStartedAt = performance.now();
  const cached = srtCache.get(resolvedPath);

  if (cached) {
    return {
      ...cached,
      cacheHit: true,
      totalLoadMs: performance.now() - lookupStartedAt,
    };
  }

  const readStartedAt = performance.now();
  const raw = await readFile(resolvedPath, 'utf8');
  const readMs = performance.now() - readStartedAt;
  const parsed = parseSrt(raw);
  const payload = {
    path: resolvedPath,
    cues: parsed.cues,
    parseMs: parsed.parseMs,
    readMs,
    totalLoadMs: readMs + parsed.parseMs,
  };

  srtCache.set(resolvedPath, payload);
  return { ...payload, cacheHit: false, cacheLookupMs: payload.totalLoadMs };
}

function getActiveCue(cues, t) {
  return cues.find((cue) => t >= cue.start && t < cue.end) ?? null;
}

function wrapText(ctx, text, maxWidth) {
  const explicitLines = text.split('\n');
  const wrapped = [];

  for (const explicitLine of explicitLines) {
    const words = explicitLine.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      wrapped.push('');
      continue;
    }

    let line = words[0];
    for (const word of words.slice(1)) {
      const nextLine = `${line} ${word}`;
      if (ctx.measureText(nextLine).width <= maxWidth) {
        line = nextLine;
        continue;
      }

      wrapped.push(line);
      line = word;
    }

    wrapped.push(line);
  }

  return wrapped;
}

async function subtitle(t, params, ctx) {
  const style = { ...DEFAULT_STYLE, ...(params.style ?? {}) };
  const parsed = await loadSrtCached(params.srt);
  const cue = getActiveCue(parsed.cues, t);

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  background.addColorStop(0, '#11131a');
  background.addColorStop(0.52, '#171b27');
  background.addColorStop(1, '#090a0e');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(110, 142, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(WIDTH * 0.22, HEIGHT * 0.28, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(70, 220, 196, 0.08)';
  ctx.beginPath();
  ctx.arc(WIDTH * 0.8, HEIGHT * 0.2, 180, 0, Math.PI * 2);
  ctx.fill();

  if (!cue) {
    return { cue: null, parsed };
  }

  ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';

  const lines = wrapText(ctx, cue.text, style.maxWidth);
  const lineHeight = style.fontSize + style.lineGap;
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const boxWidth = Math.min(style.maxWidth, textWidth) + style.paddingX * 2;
  const boxHeight = lines.length * style.fontSize + (lines.length - 1) * style.lineGap + style.paddingY * 2;
  const boxX = (WIDTH - boxWidth) / 2;
  const boxY = HEIGHT - style.bottomMargin - boxHeight;

  ctx.fillStyle = style.backdropColor;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, style.backdropRadius);
  ctx.fill();

  lines.forEach((line, index) => {
    const y = boxY + style.paddingY + index * lineHeight;
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.strokeText(line, WIDTH / 2, y);
    ctx.fillStyle = style.textColor;
    ctx.fillText(line, WIDTH / 2, y);
  });

  return { cue, parsed };
}

async function renderFrame(t, outputName, params) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const renderStartedAt = performance.now();
  const { cue, parsed } = await subtitle(t, params, ctx);
  const renderMs = performance.now() - renderStartedAt;
  const pngStartedAt = performance.now();
  const pngBuffer = canvas.toBuffer('image/png');
  const pngEncodeMs = performance.now() - pngStartedAt;
  if (outputName) {
    const outputPath = new URL(`./${outputName}`, import.meta.url);
    await writeFile(outputPath, pngBuffer);
  }

  return {
    t,
    outputName,
    cueText: cue?.text ?? null,
    renderMs,
    pngEncodeMs,
    parseMs: parsed.parseMs,
    srtReadMs: parsed.readMs,
    srtLoadMs: parsed.totalLoadMs,
    cacheHit: parsed.cacheHit,
    sha1: crypto.createHash('sha1').update(pngBuffer).digest('hex'),
  };
}

async function writeReport(results, repeatResult) {
  const locStartedAt = performance.now();
  const scriptPath = fileURLToPath(new URL('./index.js', import.meta.url));
  const srtPath = fileURLToPath(new URL('./sub.srt', import.meta.url));
  const packagePath = fileURLToPath(new URL('./package.json', import.meta.url));
  const contents = await Promise.all([
    readFile(scriptPath, 'utf8'),
    readFile(srtPath, 'utf8'),
    readFile(packagePath, 'utf8'),
  ]);
  const totalLoc = contents
    .flatMap((content) => content.split('\n'))
    .filter((line) => line.length > 0).length;
  const locMs = performance.now() - locStartedAt;
  const uniqueTexts = new Set(results.map((result) => result.cueText));
  const framePurePreserved =
    repeatResult.cueText === results[0].cueText && repeatResult.sha1 === results[0].sha1;
  const report = `# P-subtitles Report

## Outputs

- Generated: \`${results.map((result) => result.outputName).join('`, `')}\`
- Cue texts differ across requested timestamps: \`${uniqueTexts.size === results.length}\`
- Repeat render at \`t=${results[0].t}\` kept same text: \`${repeatResult.cueText === results[0].cueText}\`
- Repeat render at \`t=${results[0].t}\` kept identical PNG hash: \`${repeatResult.sha1 === results[0].sha1}\`

## Performance

- First SRT read + parse: \`${results[0].srtLoadMs.toFixed(3)} ms\`
- SRT read only: \`${results[0].srtReadMs.toFixed(3)} ms\`
- SRT parse only: \`${results[0].parseMs.toFixed(3)} ms\`
- Cached render lookup overhead on repeat: \`${repeatResult.srtLoadMs.toFixed(3)} ms\`
- Render + PNG encode at \`t=2\`: \`${(results[0].renderMs + results[0].pngEncodeMs).toFixed(3)} ms\`
- Render + PNG encode at \`t=5.5\`: \`${(results[1].renderMs + results[1].pngEncodeMs).toFixed(3)} ms\`
- Render + PNG encode at \`t=8\`: \`${(results[2].renderMs + results[2].pngEncodeMs).toFixed(3)} ms\`

## Frame-Pure Preservation

- Verdict: \`${framePurePreserved}\`
- Reason: the scene depends on \`(t, params.srt, params.style)\`, loads and parses the SRT once into an immutable in-process cache keyed by resolved path, and then performs a pure cue lookup for each frame.
- Evidence: \`t=${results[0].t}\` returned \`${JSON.stringify(results[0].cueText)}\` on both renders and produced SHA1 \`${results[0].sha1}\`.

## LOC

- Total LOC in \`index.js\`, \`sub.srt\`, and \`package.json\`: \`${totalLoc}\`
- LOC counting overhead: \`${locMs.toFixed(3)} ms\`

## Setup

\`\`\`bash
npm install
node index.js
\`\`\`

Single-frame mode for the shared spec shape:

\`\`\`bash
node index.js 5.0
\`\`\`

## Gotchas

- SRT timing uses inclusive start and exclusive end, so cue boundaries are deterministic and do not double-render on the same timestamp.
- The parse cache preserves frame purity only if callers treat the SRT file as static during a render session; mutating the file mid-process would change later frames because the external input changed.
- Text metrics come from the host font fallback for \`sans-serif\`, so exact glyph rasterization can vary across machines even though cue selection stays deterministic.
`;

  await writeFile(new URL('./report.md', import.meta.url), report);
}

async function main() {
  const tArg = process.argv[2];
  const style = {
    fontSize: 56,
    maxWidth: WIDTH * 0.72,
    bottomMargin: 70,
  };
  const params = {
    srt: fileURLToPath(new URL('./sub.srt', import.meta.url)),
    style,
  };

  if (tArg != null) {
    const t = Number.parseFloat(tArg);
    if (!Number.isFinite(t)) {
      console.error(`Invalid time value: ${tArg}`);
      process.exit(1);
    }

    const result = await renderFrame(t, 'frame_t5.png', params);
    console.log(
      JSON.stringify(
        {
          mode: 'single',
          t: result.t,
          output: result.outputName,
          cueText: result.cueText,
          renderMs: Number(result.renderMs.toFixed(3)),
          pngEncodeMs: Number(result.pngEncodeMs.toFixed(3)),
        },
        null,
        2
      )
    );
    return;
  }

  const results = [];
  for (const output of OUTPUTS) {
    results.push(await renderFrame(output.t, output.name, params));
  }

  const repeatResult = await renderFrame(results[0].t, null, params);
  await writeReport(results, repeatResult);

  console.log(
    JSON.stringify(
      {
        mode: 'batch',
        outputs: results.map((result) => ({
          t: result.t,
          output: result.outputName,
          cueText: result.cueText,
          sha1: result.sha1,
          cacheHit: result.cacheHit,
        })),
        repeatCheck: {
          t: repeatResult.t,
          output: repeatResult.outputName,
          cueText: repeatResult.cueText,
          sha1: repeatResult.sha1,
          matchesFirst: repeatResult.sha1 === results[0].sha1,
        },
        report: 'report.md',
      },
      null,
      2
    )
  );
}

await main();
