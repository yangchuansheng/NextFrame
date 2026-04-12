import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { assertSceneContract, SceneContractError } from "../src/scenes/_contract.js";
import { REGISTRY } from "../src/scenes/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CLI = resolve(ROOT, "bin/nextframe.js");

test("scene contract helper throws SceneContractError on invalid entry", () => {
  assert.throws(() => assertSceneContract("broken", {}), SceneContractError);
});

test("vignette is registered and renders end-to-end through CLI frame", () => {
  const entry = REGISTRY.get("vignette");
  assert.ok(entry, "vignette must be registered");
  const timelinePath = "/tmp/nextframe-vignette.timeline.json";
  const pngPath = "/tmp/nextframe-vignette.png";
  writeFileSync(timelinePath, JSON.stringify({
    schema: "nextframe/v0.1",
    duration: 2,
    background: "#101010",
    project: { width: 640, height: 360, aspectRatio: 16 / 9, fps: 30 },
    tracks: [
      { id: "v1", kind: "video", clips: [{ id: "bg", start: 0, dur: 2, scene: "auroraGradient", params: {} }] },
      { id: "v2", kind: "video", clips: [{ id: "fx", start: 0, dur: 2, scene: "vignette", params: { intensity: 0.75, hue: 240, radius: 0.8 } }] },
    ],
  }, null, 2));
  const run = spawnSync("node", [CLI, "frame", timelinePath, "1.0", pngPath], { cwd: ROOT, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(pngPath), "expected frame png");
  if (existsSync(pngPath)) unlinkSync(pngPath);
  unlinkSync(timelinePath);
});
