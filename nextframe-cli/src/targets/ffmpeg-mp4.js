// L1 render target — full timeline to MP4 via ffmpeg pipe.
// Adapted from POC H. Pipes raw RGBA frames into libx264.

import { spawn } from "node:child_process";
import { once } from "node:events";
import { guarded } from "../engine/_guard.js";
import { renderAt } from "../engine/render.js";
import { resolveTimeline } from "../engine/time.js";

function normalizeCrf(value) {
  if (value === undefined || value === null) return 20;
  const crf = Number(value);
  if (!Number.isInteger(crf) || crf < 0 || crf > 51) return null;
  return crf;
}

/**
 * Export a timeline to an MP4 file.
 * @param {object} timeline
 * @param {string} outputPath - absolute path
 * @param {{fps?: number, ffmpegPath?: string, onProgress?: (frameIdx, total) => void}} [opts]
 * @returns {Promise<{ok: true, value: object} | {ok: false, error: object}>}
 */
export async function exportMP4(timeline, outputPath, opts = {}) {
  const r = resolveTimeline(timeline);
  if (!r.ok) return guarded("exportMP4", { ok: false, error: r.error });
  const resolved = r.value;

  const fps = opts.fps || resolved.project?.fps || 30;
  const width = resolved.project?.width || 1920;
  const height = resolved.project?.height || 1080;
  const duration = resolved.duration;
  const totalFrames = Math.round(duration * fps);
  const ffmpegPath = opts.ffmpegPath || "ffmpeg";
  const crf = normalizeCrf(opts.crf);
  if (crf === null) {
    return guarded("exportMP4", { ok: false, error: { code: "BAD_CRF", hint: "0..51" } });
  }

  const ffmpegArgs = [
    "-y",
    "-f", "rawvideo",
    "-pix_fmt", "rgba",
    "-s", `${width}x${height}`,
    "-r", String(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", String(crf),
    "-preset", "fast",
    outputPath,
  ];

  let ffmpeg;
  try {
    ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ["pipe", "ignore", "pipe"] });
  } catch (err) {
    return guarded("exportMP4", { ok: false, error: { code: "FFMPEG_SPAWN", message: err.message } });
  }

  let stderr = "";
  ffmpeg.stderr.setEncoding("utf8");
  ffmpeg.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  let renderedFrames = 0;
  let firstError = null;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    const frame = renderAt(resolved, t, { width, height });
    if (!frame.ok) {
      firstError = frame.error;
      break;
    }
    const rgba = frame.canvas.data();
    if (!ffmpeg.stdin.write(rgba)) {
      await once(ffmpeg.stdin, "drain");
    }
    renderedFrames++;
    if (opts.onProgress && renderedFrames % 30 === 0) {
      opts.onProgress(renderedFrames, totalFrames);
    }
  }

  ffmpeg.stdin.end();
  const [exitCode] = await once(ffmpeg, "close");

  if (firstError) {
    return guarded("exportMP4", { ok: false, error: firstError, stderr });
  }
  if (exitCode !== 0) {
    return guarded("exportMP4", {
      ok: false,
      error: {
        code: "FFMPEG_FAILED",
        message: `ffmpeg exited ${exitCode}`,
        hint: stderr.split("\n").slice(-5).join("\n"),
      },
    });
  }

  return guarded("exportMP4", {
    ok: true,
    value: {
      outputPath,
      width,
      height,
      fps,
      duration,
      framesRendered: renderedFrames,
    },
  });
}

/**
 * Mux an external audio track into an MP4 file.
 * @param {string} videoPath
 * @param {string} audioPath
 * @param {string} outputPath
 * @param {{ffmpegPath?: string}} [opts]
 * @returns {Promise<{ok: true, value: object} | {ok: false, error: object}>}
 */
export async function muxMP4Audio(videoPath, audioPath, outputPath, opts = {}) {
  const ffmpegPath = opts.ffmpegPath || "ffmpeg";
  const ffmpegArgs = [
    "-y",
    "-i", videoPath,
    "-i", audioPath,
    "-c:v", "copy",
    "-c:a", "aac",
    "-shortest",
    outputPath,
  ];

  let ffmpeg;
  try {
    ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    return guarded("muxMP4Audio", {
      ok: false,
      error: { code: "MUX_FAIL", message: err.message, hint: `ffmpeg ${ffmpegArgs.join(" ")}` },
    });
  }

  let stderr = "";
  ffmpeg.stderr.setEncoding("utf8");
  ffmpeg.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const [exitCode] = await once(ffmpeg, "close");
  if (exitCode !== 0) {
    return guarded("muxMP4Audio", {
      ok: false,
      error: {
        code: "MUX_FAIL",
        message: `ffmpeg exited ${exitCode}`,
        hint: stderr.split("\n").slice(-5).join("\n"),
      },
    });
  }

  return guarded("muxMP4Audio", { ok: true, value: { outputPath, videoPath, audioPath } });
}
