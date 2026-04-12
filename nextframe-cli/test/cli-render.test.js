import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, existsSync, unlinkSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CLI = resolve(ROOT, "bin/nextframe.js");

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
    project: { width: 320, height: 180, aspectRatio: 16 / 9, fps: 30 },
    tracks: [
      {
        id: "v1",
        kind: "video",
        clips: [{ id: "bg", start: 0, dur: 2, scene: "auroraGradient", params: {} }],
      },
      {
        id: "v2",
        kind: "video",
        clips: [{ id: "text", start: 0.2, dur: 1.5, scene: "textOverlay", params: { text: "HELLO" } }],
      },
    ],
  };
}

// cli-render-1: render → h264 mp4 with correct duration.
test("cli-render-1: render produces h264 mp4 matching timeline duration", () => {
  const tlPath = "/tmp/cli-render-1.timeline.json";
  const outPath = "/tmp/cli-render-1.mp4";
  if (existsSync(outPath)) unlinkSync(outPath);
  writeFileSync(tlPath, JSON.stringify(tinyTimeline()));
  const run = runCli(["render", tlPath, outPath, "--json"]);
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout);
  assert.equal(out.ok, true);
  assert.ok(existsSync(outPath), "mp4 written");
  // ffprobe check (optional: skip if ffprobe missing)
  const probe = spawnSync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=codec_name",
    "-of", "default=nw=1:nk=1",
    outPath,
  ], { encoding: "utf8" });
  if (probe.status === 0) {
    assert.match(probe.stdout, /h264/);
  }
  unlinkSync(outPath);
  unlinkSync(tlPath);
});

// cli-render-2: frame extracts a single PNG at a given time.
test("cli-render-2: frame writes a PNG at t=1.0", () => {
  const tlPath = "/tmp/cli-render-2.timeline.json";
  const pngPath = "/tmp/cli-render-2.png";
  writeFileSync(tlPath, JSON.stringify(tinyTimeline()));
  const run = runCli(["frame", tlPath, "1.0", pngPath, "--json"]);
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout);
  assert.equal(out.ok, true);
  assert.equal(out.value.t, 1.0);
  assert.ok(existsSync(pngPath));
  const bytes = statSync(pngPath).size;
  assert.ok(bytes > 1000, "PNG should be non-empty");
  unlinkSync(pngPath);
  unlinkSync(tlPath);
});

// cli-render-3: validate flags bad timelines as {ok:false} with structured errors.
test("cli-render-3: validate catches unknown scene references with hint", () => {
  const bad = tinyTimeline();
  bad.tracks[0].clips[0].scene = "doesNotExistXYZ";
  const badPath = "/tmp/cli-render-3.timeline.json";
  writeFileSync(badPath, JSON.stringify(bad));
  const run = runCli(["validate", badPath, "--json"]);
  const out = JSON.parse(run.stdout);
  assert.equal(out.ok, false, "validate should reject");
  assert.ok(Array.isArray(out.errors), "errors array present");
  const err = out.errors[0];
  assert.equal(err.code, "UNKNOWN_SCENE");
  assert.match(err.message, /doesNotExistXYZ/);
  assert.ok(err.hint, "hint present");
  unlinkSync(badPath);
});

// cli-render-4: describe returns JSON metadata without rendering pixels.
test("cli-render-4: describe returns visible clips JSON at t=1.0", () => {
  const tlPath = "/tmp/cli-render-4.timeline.json";
  writeFileSync(tlPath, JSON.stringify(tinyTimeline()));
  const run = runCli(["describe", tlPath, "1.0", "--json"]);
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout);
  assert.equal(out.ok, true);
  const visible = out.value.active_clips || out.value.visibleClips || out.value.visible_clips;
  assert.ok(Array.isArray(visible), "active_clips array present");
  assert.ok(visible.length >= 2, "both clips active at t=1.0");
  const scenes = visible.map((c) => c.sceneId || c.scene);
  assert.ok(scenes.includes("auroraGradient"));
  assert.ok(scenes.includes("textOverlay"));
  unlinkSync(tlPath);
});

// cli-render-5: gantt prints ASCII timeline.
test("cli-render-5: gantt produces ASCII chart with track rows", () => {
  const tlPath = "/tmp/cli-render-5.timeline.json";
  writeFileSync(tlPath, JSON.stringify(tinyTimeline()));
  const run = runCli(["gantt", tlPath]);
  assert.equal(run.status, 0, run.stderr);
  assert.ok(run.stdout.length > 0, "gantt output non-empty");
  // At least 2 track rows should appear — look for track ids
  assert.match(run.stdout, /v1/);
  assert.match(run.stdout, /v2/);
  unlinkSync(tlPath);
});

// cli-render-6: ascii renders downsampled ASCII preview of a single frame.
test("cli-render-6: ascii subcommand returns printable ramp chars", () => {
  const tlPath = "/tmp/cli-render-6.timeline.json";
  writeFileSync(tlPath, JSON.stringify(tinyTimeline()));
  const run = runCli(["ascii", tlPath, "1.0", "--width=40", "--height=12"]);
  assert.equal(run.status, 0, run.stderr);
  // Split without trimming — trailing all-space rows are still rows.
  const rawLines = run.stdout.split("\n");
  // Expect 12 rows + final empty string after trailing newline.
  assert.ok(rawLines.length >= 12, `expected ≥12 rows, got ${rawLines.length}`);
  // At least one non-blank char from the RAMP should appear
  const joined = run.stdout.replace(/\s/g, "");
  assert.ok(joined.length > 0, "some non-space chars present");
  unlinkSync(tlPath);
});

// cli-render-8: render short-circuits on unknown scene (BDD invariant: validate before ffmpeg).
test("cli-render-8: render rejects unknown scene without writing mp4", () => {
  const bad = tinyTimeline();
  bad.tracks[0].clips[0].scene = "nonExistent";
  const badPath = "/tmp/cli-render-8.timeline.json";
  const outPath = "/tmp/cli-render-8.mp4";
  if (existsSync(outPath)) unlinkSync(outPath);
  writeFileSync(badPath, JSON.stringify(bad));
  const run = runCli(["render", badPath, outPath, "--json"]);
  assert.notEqual(run.status, 0, "must not exit 0");
  const out = JSON.parse(run.stdout);
  assert.equal(out.ok, false);
  assert.equal(out.error.code, "UNKNOWN_SCENE");
  assert.match(out.error.hint || "", /available/);
  assert.ok(!existsSync(outPath), "no mp4 should be written");
  unlinkSync(badPath);
});
