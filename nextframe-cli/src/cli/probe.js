import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { emit, parseFlags } from "./_io.js";

function parseFps(spec) {
  if (!spec || typeof spec !== "string") return 0;
  const [numText, denText = "1"] = spec.split("/");
  const num = Number(numText);
  const den = Number(denText);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  return num / den;
}

export async function run(argv) {
  const { positional, flags } = parseFlags(argv);
  const [path] = positional;
  if (!path) {
    emit({ ok: false, error: { code: "USAGE", message: "usage: nextframe probe <file.mp4>" } }, flags);
    return 3;
  }
  if (!existsSync(path)) {
    emit({ ok: false, error: { code: "NOT_FOUND", message: `no such file: ${path}` } }, flags);
    return 2;
  }

  const r = spawnSync("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    path,
  ], { encoding: "utf8" });

  if (r.status !== 0) {
    emit({
      ok: false,
      error: {
        code: "FFPROBE_FAIL",
        message: r.stderr || "ffprobe failed",
      },
    }, flags);
    return 2;
  }

  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch (err) {
    emit({
      ok: false,
      error: {
        code: "FFPROBE_FAIL",
        message: err.message,
      },
    }, flags);
    return 2;
  }

  const streams = parsed.streams || [];
  const video = streams.find((stream) => stream.codec_type === "video");
  const audio = streams.find((stream) => stream.codec_type === "audio");
  const value = {
    path,
    format: parsed.format?.format_name,
    duration: Number(parsed.format?.duration || 0),
    size: Number(parsed.format?.size || 0),
    video: video ? {
      codec: video.codec_name,
      width: video.width,
      height: video.height,
      fps: parseFps(video.r_frame_rate),
    } : null,
    audio: audio ? {
      codec: audio.codec_name,
      sample_rate: Number(audio.sample_rate || 0),
      channels: audio.channels,
    } : null,
    streams: streams.length,
  };

  if (flags.json) {
    process.stdout.write(JSON.stringify({ ok: true, value }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `${path}: ${value.video?.codec || "?"} ${value.video?.width || "?"}x${value.video?.height || "?"} ${value.duration.toFixed(2)}s ${value.streams} streams\n`,
    );
  }
  return 0;
}
