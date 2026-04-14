// nf-core scene registry — auto-discovers scenes from {ratio}/{category}/{name}/index.js
// Used by CLI (via scene-registry.js) and engine.

import { readdir } from "fs/promises";
import { resolve, join } from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";

const SCENES_DIR = new URL(".", import.meta.url).pathname;
const RATIO_DIRS = ["16x9", "9x16", "4x3"];
const RATIO_MAP = { "16x9": "16:9", "9x16": "9:16", "4x3": "4:3" };

const _registry = new Map();
let _loaded = false;

async function discover() {
  if (_loaded) return;
  for (const ratioDir of RATIO_DIRS) {
    const ratioPath = resolve(SCENES_DIR, ratioDir);
    if (!existsSync(ratioPath)) continue;

    const categories = await readdir(ratioPath, { withFileTypes: true });
    for (const cat of categories) {
      if (!cat.isDirectory()) continue;
      const catPath = join(ratioPath, cat.name);
      const scenes = await readdir(catPath, { withFileTypes: true });

      for (const sc of scenes) {
        if (!sc.isDirectory()) continue;
        const indexPath = join(catPath, sc.name, "index.js");
        if (!existsSync(indexPath)) continue;

        try {
          const mod = await import(pathToFileURL(indexPath).href);
          if (!mod.meta || !mod.render) continue;
          const entry = {
            id: mod.meta.id,
            render: mod.render,
            screenshots: mod.screenshots,
            lint: mod.lint,
            META: mod.meta,
            path: join(ratioDir, cat.name, sc.name),
          };
          _registry.set(mod.meta.id, entry);
        } catch (e) {
          // skip broken scenes silently
        }
      }
    }
  }
  _loaded = true;
}

export async function getScene(id) {
  await discover();
  return _registry.get(id) || null;
}

export async function listScenes() {
  await discover();
  return [..._registry.values()].map((s) => s.META);
}

export async function listScenesForRatio(ratioId) {
  await discover();
  return [..._registry.values()]
    .filter((s) => s.META.ratio === ratioId)
    .map((s) => s.META);
}

export async function getRegistry() {
  await discover();
  return _registry;
}

// Sync access after first discover (for backwards compat)
export const REGISTRY = _registry;
