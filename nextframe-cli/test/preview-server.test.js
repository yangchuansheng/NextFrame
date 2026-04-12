import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function startPreviewServer(workspaceRoot) {
  const previousRoot = process.env.NEXTFRAME_WORKSPACE_ROOT;
  process.env.NEXTFRAME_WORKSPACE_ROOT = workspaceRoot;
  const { server } = await import(new URL(`../preview/server.mjs?preview-test=${Date.now()}`, import.meta.url));

  try {
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  } catch (error) {
    restoreWorkspaceRoot(previousRoot);
    throw error;
  }

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise((resolveClose) => server.close(resolveClose));
      restoreWorkspaceRoot(previousRoot);
    },
  };
}

function restoreWorkspaceRoot(previousRoot) {
  if (previousRoot === undefined) {
    delete process.env.NEXTFRAME_WORKSPACE_ROOT;
    return;
  }
  process.env.NEXTFRAME_WORKSPACE_ROOT = previousRoot;
}

test("preview-1: /api/mp4 rejects paths outside the workspace root", async (t) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "nextframe-preview-"));
  const preview = await startPreviewServer(workspaceRoot);

  t.after(async () => {
    await preview.close();
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  const response = await fetch(`${preview.baseUrl}/api/mp4?path=${encodeURIComponent("/etc/hosts")}`);
  assert.equal(response.status, 403);

  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.match(payload.error.message, /path outside workspace/);
});

test("preview-2: /api/gantt returns the rendered ASCII gantt view", async (t) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "nextframe-preview-"));
  const timelinePath = join(workspaceRoot, "timeline.json");
  writeFileSync(timelinePath, JSON.stringify({
    schema: "nextframe/v0.1",
    duration: 4,
    background: "#000000",
    project: { width: 320, height: 180, fps: 30, aspectRatio: 16 / 9 },
    chapters: [],
    markers: [],
    tracks: [
      {
        id: "v1",
        kind: "video",
        clips: [{ id: "auroraGradient-1", start: 0, dur: 4, scene: "auroraGradient", params: {} }],
      },
    ],
    assets: [],
  }, null, 2));

  const preview = await startPreviewServer(workspaceRoot);
  t.after(async () => {
    await preview.close();
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  const response = await fetch(`${preview.baseUrl}/api/gantt?path=${encodeURIComponent("timeline.json")}`);
  assert.equal(response.status, 200);
  const chart = await response.text();
  assert.doesNotMatch(chart, /\(gantt view missing\)/);
  assert.match(chart, /auroraGradient/);
});
