import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CLI = resolve(ROOT, "bin/nextframe.js");
const AUDIO_FIXTURE = resolve(ROOT, "examples/cc-e01-slide01/slide01-audio.mp3");

function runCli(args, opts = {}) {
  return spawnSync("node", [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
    ...opts,
  });
}

function tinyTimeline() {
  return {
    schema: "nextframe/v0.1",
    duration: 2,
    background: "#101010",
    project: { width: 160, height: 90, aspectRatio: 16 / 9, fps: 12 },
    tracks: [
      {
        id: "v1",
        kind: "video",
        clips: [{ id: "bg", start: 0, dur: 2, scene: "auroraGradient", params: {} }],
      },
      {
        id: "v2",
        kind: "video",
        clips: [{ id: "title", start: 0.25, dur: 1.25, scene: "textOverlay", params: { text: "CLI EXPORT" } }],
      },
    ],
  };
}

function uniquePath(label, ext) {
  return join(tmpdir(), `${label}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`);
}

function writeTimeline(label) {
  const path = uniquePath(label, "timeline.json");
  writeFileSync(path, JSON.stringify(tinyTimeline()));
  return path;
}

function cleanup(...paths) {
  for (const path of paths) {
    if (path && existsSync(path)) unlinkSync(path);
  }
}

function ffprobeJson(path) {
  const probe = spawnSync("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_streams",
    path,
  ], {
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(probe.status, 0, probe.stderr);
  return JSON.parse(probe.stdout);
}

test("cli-export-1: render --audio muxes video and audio streams", () => {
  const tlPath = writeTimeline("cli-export-1");
  const outPath = uniquePath("cli-export-1", "mp4");
  try {
    const run = runCli(["render", tlPath, outPath, `--audio=${AUDIO_FIXTURE}`, "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const out = JSON.parse(run.stdout);
    assert.equal(out.ok, true);

    const parsed = ffprobeJson(outPath);
    const videoStreams = (parsed.streams || []).filter((stream) => stream.codec_type === "video");
    const audioStreams = (parsed.streams || []).filter((stream) => stream.codec_type === "audio");
    assert.equal(videoStreams.length, 1);
    assert.equal(audioStreams.length, 1);
    assert.equal(videoStreams[0].codec_name, "h264");
    assert.equal(audioStreams[0].codec_name, "aac");
  } finally {
    cleanup(tlPath, outPath);
  }
});

test("cli-export-2: render --target accepts ffmpeg and rejects unknown targets", () => {
  const tlPath = writeTimeline("cli-export-2");
  const okOutPath = uniquePath("cli-export-2-ok", "mp4");
  const badOutPath = uniquePath("cli-export-2-bad", "mp4");
  try {
    const okRun = runCli(["render", tlPath, okOutPath, "--target=ffmpeg", "--json"]);
    assert.equal(okRun.status, 0, okRun.stderr);
    assert.equal(JSON.parse(okRun.stdout).ok, true);
    assert.ok(existsSync(okOutPath));

    const badRun = runCli(["render", tlPath, badOutPath, "--target=bogus", "--json"]);
    assert.notEqual(badRun.status, 0);
    const badOut = JSON.parse(badRun.stdout);
    assert.equal(badOut.ok, false);
    assert.equal(badOut.error.code, "UNKNOWN_TARGET");
    assert.equal(badOut.error.hint, "supported: ffmpeg");
    assert.ok(!existsSync(badOutPath));
  } finally {
    cleanup(tlPath, okOutPath, badOutPath);
  }
});

test("cli-export-3: render --crf validates and still writes output", () => {
  const tlPath = writeTimeline("cli-export-3");
  const okOutPath = uniquePath("cli-export-3-ok", "mp4");
  const badOutPath = uniquePath("cli-export-3-bad", "mp4");
  try {
    const okRun = runCli(["render", tlPath, okOutPath, "--crf=28", "--json"]);
    assert.equal(okRun.status, 0, okRun.stderr);
    assert.equal(JSON.parse(okRun.stdout).ok, true);
    assert.ok(existsSync(okOutPath));
    assert.ok(statSync(okOutPath).size > 0);

    const badRun = runCli(["render", tlPath, badOutPath, "--crf=99", "--json"]);
    assert.notEqual(badRun.status, 0);
    const badOut = JSON.parse(badRun.stdout);
    assert.equal(badOut.ok, false);
    assert.equal(badOut.error.code, "BAD_CRF");
    assert.equal(badOut.error.hint, "0..51");
    assert.ok(!existsSync(badOutPath));
  } finally {
    cleanup(tlPath, okOutPath, badOutPath);
  }
});

test("cli-export-4: probe returns structured metadata and missing files fail cleanly", () => {
  const tlPath = writeTimeline("cli-export-4");
  const outPath = uniquePath("cli-export-4", "mp4");
  const missingPath = uniquePath("cli-export-4-missing", "mp4");
  try {
    const render = runCli(["render", tlPath, outPath, "--json"]);
    assert.equal(render.status, 0, render.stderr);

    const probe = runCli(["probe", outPath, "--json"]);
    assert.equal(probe.status, 0, probe.stderr);
    const probeOut = JSON.parse(probe.stdout);
    assert.equal(probeOut.ok, true);
    assert.equal(probeOut.value.video.codec, "h264");
    assert.ok(probeOut.value.streams >= 1);

    const missing = runCli(["probe", missingPath, "--json"]);
    assert.notEqual(missing.status, 0);
    const missingOut = JSON.parse(missing.stdout);
    assert.equal(missingOut.ok, false);
    assert.equal(missingOut.error.code, "NOT_FOUND");
  } finally {
    cleanup(tlPath, outPath);
  }
});
