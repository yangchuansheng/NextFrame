import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CLI = resolve(ROOT, "bin/nextframe.js");

function runCli(args) {
  return spawnSync("node", [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });
}

test("cli-validate-1: validate resolves relative assets from the timeline directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "nextframe-validate-"));
  const assetPath = join(dir, "hero.png");
  const timelinePath = join(dir, "timeline.json");

  try {
    writeFileSync(assetPath, "not-an-image-but-it-exists\n");
    writeFileSync(timelinePath, JSON.stringify({
      schema: "nextframe/v0.1",
      duration: 2,
      background: "#000000",
      project: { width: 320, height: 180, fps: 30, aspectRatio: 16 / 9 },
      chapters: [],
      markers: [],
      tracks: [
        {
          id: "v1",
          kind: "video",
          clips: [{ id: "auroraGradient-1", start: 0, dur: 2, scene: "auroraGradient", params: {} }],
        },
      ],
      assets: [{ id: "img-hero-1", kind: "image", path: "./hero.png" }],
    }, null, 2));

    const run = runCli(["validate", timelinePath, "--json"]);
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const result = JSON.parse(run.stdout);
    assert.equal(result.ok, true);
    assert.deepEqual(result.warnings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
