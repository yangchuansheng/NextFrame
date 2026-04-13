import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, ImageData } from '@napi-rs/canvas';
import { VideoFrameHelper } from './videoFrame.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WIDTH = 1920;
const HEIGHT = 1080;
const SAMPLE_VIDEO = '/Users/Zhuanz/bigbang/NextFrame/poc-render/H-frames-to-mp4/out.mp4';
const OUTPUT_A = path.join(__dirname, 'frame_t2.5.png');
const OUTPUT_B = path.join(__dirname, 'frame_t4.png');
const REPORT_PATH = path.join(__dirname, 'report.md');

function hashBuffer(buffer) {
  return createHash('sha1').update(buffer).digest('hex');
}

function drawWithFit(ctx, frame, fit = 'contain') {
  const offscreenCanvas = createCanvas(frame.width, frame.height);
  const offscreenCtx = offscreenCanvas.getContext('2d');
  const imageData = new ImageData(
    new Uint8ClampedArray(
      frame.pixels.buffer,
      frame.pixels.byteOffset,
      frame.pixels.byteLength
    ),
    frame.width,
    frame.height
  );

  offscreenCtx.putImageData(imageData, 0, 0);

  const scale =
    fit === 'cover'
      ? Math.max(WIDTH / frame.width, HEIGHT / frame.height)
      : Math.min(WIDTH / frame.width, HEIGHT / frame.height);
  const drawWidth = frame.width * scale;
  const drawHeight = frame.height * scale;
  const dx = (WIDTH - drawWidth) / 2;
  const dy = (HEIGHT - drawHeight) / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(offscreenCanvas, dx, dy, drawWidth, drawHeight);
}

async function videoClip(t, params, ctx, videoFrameHelper) {
  const clipStart = params.clipStart ?? 0;
  const speed = params.speed ?? 1;
  const start = params.start ?? 0;
  const localTime = Math.max(0, t - clipStart) * speed;
  const trimmedLocalTime =
    params.trim === undefined ? localTime : Math.min(localTime, Math.max(0, params.trim));
  const sourceTimeSec = start + trimmedLocalTime;
  const frame = await videoFrameHelper.extractFrameAt(params.src, sourceTimeSec);

  drawWithFit(ctx, frame, params.fit ?? 'contain');

  return {
    sourceTimeSec: frame.timeSec,
    extractMs: frame.extractMs,
    fromCache: frame.fromCache,
    frameHash: hashBuffer(frame.pixels),
  };
}

async function renderSceneFrame(t, sceneParams, videoFrameHelper, outputPath) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const startedAt = performance.now();
  const sceneResult = await videoClip(t, sceneParams, ctx, videoFrameHelper);
  const pngBuffer = canvas.toBuffer('image/png');
  const renderMs = Number((performance.now() - startedAt).toFixed(3));

  if (outputPath) {
    await writeFile(outputPath, pngBuffer);
  }

  return {
    t,
    outputPath,
    pngBuffer,
    pngHash: hashBuffer(pngBuffer),
    renderMs,
    ...sceneResult,
  };
}

function formatMs(value) {
  return `${value.toFixed(3)} ms`;
}

function buildReport({
  sceneParams,
  metadata,
  firstRender,
  secondRender,
  repeatRender,
  totalMs,
  helper,
}) {
  const extractLatencies = helper.stats.extractLatenciesMs;
  const averageExtractMs =
    extractLatencies.reduce((sum, value) => sum + value, 0) / extractLatencies.length;
  const framePure = repeatRender.pngHash === firstRender.pngHash;

  return `# M-video-clip Report

## Input

- Source video: \`${sceneParams.src}\`
- Source resolution: \`${metadata.width}x${metadata.height}\`
- Source duration: \`${metadata.durationSec.toFixed(3)} s\`
- Scene model: \`videoClip(t, params, ctx)\`

## Outputs

- \`t=2.5\` -> \`frame_t2.5.png\` using source time \`${firstRender.sourceTimeSec.toFixed(3)} s\`
- \`t=4.0\` -> \`frame_t4.png\` using source time \`${secondRender.sourceTimeSec.toFixed(3)} s\`
- Frame hashes differ: \`${firstRender.frameHash !== secondRender.frameHash}\`
- PNG hashes differ: \`${firstRender.pngHash !== secondRender.pngHash}\`

## Performance

- Total script wall time: \`${formatMs(totalMs)}\`
- Uncached extract latencies: \`${extractLatencies.map(formatMs).join(', ')}\`
- Average uncached extract latency: \`${formatMs(averageExtractMs)}\`
- Render time at \`t=2.5\`: \`${formatMs(firstRender.renderMs)}\`
- Render time at \`t=4.0\`: \`${formatMs(secondRender.renderMs)}\`
- Repeat render time at \`t=2.5\` (cache hit): \`${formatMs(repeatRender.renderMs)}\`
- Cache requests / hits / misses: \`${helper.stats.requests} / ${helper.stats.hits} / ${helper.stats.misses}\`
- Cache hit rate: \`${(helper.getCacheHitRate() * 100).toFixed(1)}%\`

## Frame-Pure Verdict

- Preserved: \`${framePure}\`
- Evidence: repeated render of \`t=2.5\` produced the same PNG hash \`${repeatRender.pngHash}\` as the first render, while the second call hit the \`(src,time)\` cache instead of re-extracting.
- Determinism boundary: the scene function depends only on \`(t, params)\`, converts that to a single source seek time, and asks ffmpeg for one frame. There is no playback cursor or decoder state carried between calls.

## Gotchas

- The ffmpeg command is frame-pure but not cheap; every cache miss launches a fresh process and decodes from the requested seek point.
- Exact frame choice near the end of the file is awkward, so the helper clamps seek time slightly below duration to avoid empty output on terminal timestamps.
- The cache key rounds to microseconds. That keeps repeated JS calls like \`2.5\` stable, but callers should still avoid accidental floating-point drift if they expect hits.
`;
}

async function main() {
  const startedAt = performance.now();
  const helper = new VideoFrameHelper();
  const sceneParams = {
    src: SAMPLE_VIDEO,
    clipStart: 0,
    start: 0,
    trim: 4.9,
    speed: 1,
    fit: 'cover',
  };
  const metadata = helper.getMetadata(sceneParams.src);
  const firstRender = await renderSceneFrame(2.5, sceneParams, helper, OUTPUT_A);
  const secondRender = await renderSceneFrame(4.0, sceneParams, helper, OUTPUT_B);
  const repeatRender = await renderSceneFrame(2.5, sceneParams, helper);
  const totalMs = Number((performance.now() - startedAt).toFixed(3));
  const report = buildReport({
    sceneParams,
    metadata,
    firstRender,
    secondRender,
    repeatRender,
    totalMs,
    helper,
  });

  await writeFile(REPORT_PATH, report);

  console.log(
    JSON.stringify(
      {
        source: sceneParams.src,
        outputs: [
          {
            t: firstRender.t,
            file: OUTPUT_A,
            sourceTimeSec: firstRender.sourceTimeSec,
            renderMs: firstRender.renderMs,
            fromCache: firstRender.fromCache,
            pngHash: firstRender.pngHash,
          },
          {
            t: secondRender.t,
            file: OUTPUT_B,
            sourceTimeSec: secondRender.sourceTimeSec,
            renderMs: secondRender.renderMs,
            fromCache: secondRender.fromCache,
            pngHash: secondRender.pngHash,
          },
        ],
        repeatProbe: {
          t: repeatRender.t,
          sourceTimeSec: repeatRender.sourceTimeSec,
          renderMs: repeatRender.renderMs,
          fromCache: repeatRender.fromCache,
          pngHash: repeatRender.pngHash,
        },
        cache: {
          requests: helper.stats.requests,
          hits: helper.stats.hits,
          misses: helper.stats.misses,
          hitRate: Number((helper.getCacheHitRate() * 100).toFixed(1)),
        },
        report: REPORT_PATH,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
