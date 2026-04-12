import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const WEB_ROOT = resolve(REPO_ROOT, "runtime/web/src");
const SCENES_DIR = resolve(WEB_ROOT, "scenes");
const ENGINE_DIR = resolve(WEB_ROOT, "engine");

function toModuleId(filePath) {
  return relative(REPO_ROOT, filePath).split("\\").join("/");
}

function fromModuleId(moduleId) {
  return resolve(REPO_ROOT, moduleId);
}

function escapeScriptContent(value) {
  return String(value)
    .replace(/<\/script/gi, "<\\/script")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function serializeForScript(value) {
  return escapeScriptContent(JSON.stringify(value).replace(/</g, "\\u003C"));
}

function listModuleIds(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .sort()
    .map((name) => toModuleId(resolve(dir, name)));
}

function resolveImportId(fromModuleIdValue, specifier) {
  return toModuleId(resolve(dirname(fromModuleId(fromModuleIdValue)), specifier));
}

function collectDependencies(source, moduleId) {
  const dependencies = [];
  const importPattern = /^\s*import\s+\{[^}]+\}\s+from\s+["']([^"']+)["'];?\s*$/gm;
  const reExportPattern = /^\s*export\s+\{[^}]+\}\s+from\s+["']([^"']+)["'];?\s*$/gm;

  for (const pattern of [importPattern, reExportPattern]) {
    for (const match of source.matchAll(pattern)) {
      dependencies.push(resolveImportId(moduleId, match[1]));
    }
  }

  return dependencies;
}

function transformModuleSource(source, moduleId) {
  const exportNames = [];
  const lines = [];

  for (const line of source.split("\n")) {
    const importMatch = line.match(/^\s*import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?\s*$/);
    if (importMatch) {
      const specifiers = importMatch[1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .join(", ");
      const dependencyId = resolveImportId(moduleId, importMatch[2]);
      lines.push(`const { ${specifiers} } = __nfImport(${JSON.stringify(dependencyId)});`);
      continue;
    }

    const reExportMatch = line.match(/^\s*export\s+\{([^}]+)\}\s+from\s+["']([^"']+)["'];?\s*$/);
    if (reExportMatch) {
      const dependencyId = resolveImportId(moduleId, reExportMatch[2]);
      for (const rawSpecifier of reExportMatch[1].split(",")) {
        const [imported, exported] = rawSpecifier.split(/\s+as\s+/).map((value) => value.trim());
        const exportName = exported || imported;
        lines.push(
          `const { ${imported}: __nfReExport_${exportName} } = __nfImport(${JSON.stringify(dependencyId)});`,
        );
        lines.push(`exports.${exportName} = __nfReExport_${exportName};`);
      }
      continue;
    }

    lines.push(line);
  }

  let transformed = lines.join("\n");
  transformed = transformed.replace(/^export function\s+([A-Za-z0-9_$]+)\s*\(/gm, (_match, name) => {
    exportNames.push(name);
    return `function ${name}(`;
  });
  transformed = transformed.replace(/^export const\s+([A-Za-z0-9_$]+)\s*=/gm, (_match, name) => {
    exportNames.push(name);
    return `const ${name} =`;
  });

  if (exportNames.length > 0) {
    transformed += `\n${exportNames.map((name) => `exports.${name} = ${name};`).join("\n")}\n`;
  }

  return transformed;
}

function buildRuntimeBundle() {
  const entryIds = [
    toModuleId(resolve(WEB_ROOT, "track-flags.js")),
    ...listModuleIds(ENGINE_DIR),
    ...listModuleIds(SCENES_DIR),
  ];
  const seen = new Set();
  const orderedIds = [];

  function visit(moduleId) {
    if (seen.has(moduleId)) {
      return;
    }
    seen.add(moduleId);
    const source = readFileSync(fromModuleId(moduleId), "utf8");
    for (const dependencyId of collectDependencies(source, moduleId)) {
      visit(dependencyId);
    }
    orderedIds.push(moduleId);
  }

  for (const entryId of entryIds) {
    visit(entryId);
  }

  return orderedIds.map((moduleId) => {
    const source = readFileSync(fromModuleId(moduleId), "utf8");
    const transformed = transformModuleSource(source, moduleId);
    return `__nfDefine(${JSON.stringify(moduleId)}, function(module, exports, __nfImport) {\n${transformed}\n});`;
  }).join("\n\n");
}

/**
 * Generate a self-contained HTML harness for the browser renderer.
 * @param {object} timeline
 * @param {{width?: number, height?: number}} [opts]
 * @returns {string}
 */
export function generateHarness(timeline, opts = {}) {
  const width = Number(opts.width) || timeline?.project?.width || 1920;
  const height = Number(opts.height) || timeline?.project?.height || 1080;
  const bundle = buildRuntimeBundle();
  const serializedTimeline = serializeForScript(timeline);
  const runtimeScript = escapeScriptContent(`
(function() {
  const __nfModules = new Map();
  const __nfCache = new Map();

  function __nfDefine(id, factory) {
    __nfModules.set(id, factory);
  }

  function __nfImport(id) {
    if (__nfCache.has(id)) {
      return __nfCache.get(id).exports;
    }

    const factory = __nfModules.get(id);
    if (typeof factory !== "function") {
      throw new Error("Unknown NextFrame runtime module: " + id);
    }

    const module = { exports: {} };
    __nfCache.set(id, module);
    factory(module, module.exports, __nfImport);
    return module.exports;
  }

  ${bundle}

  const timeline = window.__TIMELINE;
  const width = ${JSON.stringify(width)};
  const height = ${JSON.stringify(height)};
  const engine = __nfImport("runtime/web/src/engine/index.js");
  const scenes = __nfImport("runtime/web/src/scenes/index.js");
  const canvas = document.getElementById("nf-canvas");
  const ctx = canvas.getContext("2d");
  let ready = false;

  if (!ctx) {
    throw new Error("Failed to initialize #nf-canvas 2D context");
  }

  canvas.width = width;
  canvas.height = height;
  scenes.registerAllScenes(engine);

  function renderFrame(time) {
    engine.renderAt(ctx, timeline, Number.isFinite(time) ? time : 0);
    if (!ready) {
      ready = true;
      window.__READY = true;
    }
  }

  window.__READY = false;
  window.__onFrame = function(frame = {}) {
    renderFrame(Number(frame.time) || 0);
    return true;
  };

  renderFrame(0);
})();
`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NextFrame Harness</title>
  <style>
    :root { color-scheme: light; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    body {
      display: grid;
      place-items: center;
    }
    canvas {
      display: block;
      width: ${width}px;
      height: ${height}px;
    }
  </style>
</head>
<body>
  <canvas id="nf-canvas" width="${width}" height="${height}"></canvas>
  <script>window.__TIMELINE = ${serializedTimeline};</script>
  <script>${runtimeScript}</script>
</body>
</html>
`;
}
