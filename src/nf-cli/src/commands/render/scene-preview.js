// nextframe scene-preview <name> [--ratio=9:16]
// Creates a temp timeline with one layer, builds HTML, opens in browser.
// Reuses the full build system — gets Play/Pause, scrubber, time display, auto-scaling for free.
import { parseFlags } from "../_helpers/_io.js";
import { existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, execSync } from "node:child_process";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENES_ROOT = resolve(HERE, "../../../../nf-core/scenes");
const CLI_ENTRY = resolve(HERE, "../../../bin/nextframe.js");
const RATIO_DIRS = { "16:9": "16x9", "9:16": "9x16", "4:3": "4x3" };
const DIMS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "4:3": [1440, 1080] };
const CATEGORIES = ["backgrounds", "typography", "data", "shapes", "overlays", "media", "browser"];

export async function run(argv) {
  const { positional, flags } = parseFlags(argv);
  if (flags.help || positional.length === 0) {
    process.stdout.write(`scene-preview — Preview a scene component with full playback controls.

Usage: nextframe scene-preview <name> [--ratio=9:16] [--duration=10]

Creates a temp timeline, builds HTML with Play/Pause + scrubber, opens in browser.

Example:
  nextframe scene-preview interviewHeader --ratio=9:16
  nextframe scene-preview interviewBiSub --ratio=9:16 --duration=20
`);
    return positional.length === 0 ? 3 : 0;
  }

  const name = positional[0];
  const ratio = flags.ratio || "9:16";
  const duration = Number(flags.duration) || 10;
  const ratioDir = RATIO_DIRS[ratio];
  const [w, h] = DIMS[ratio] || [1080, 1920];
  if (!ratioDir) { process.stderr.write(`Unknown ratio "${ratio}"\n`); return 2; }

  // Find scene
  let found = false;
  for (const cat of CATEGORIES) {
    if (existsSync(resolve(SCENES_ROOT, ratioDir, cat, name, "index.js"))) { found = true; break; }
  }
  if (!found) {
    process.stderr.write(`Scene "${name}" not found in ${ratio}. Run: nextframe scenes\n`);
    return 2;
  }

  // Build temp timeline
  const timeline = {
    version: "0.3",
    ratio,
    width: w,
    height: h,
    fps: 30,
    duration,
    background: ratio === "9:16" ? "#111111" : "#1a1510",
    layers: [{ id: "preview", scene: name, start: 0, dur: duration, params: {} }],
  };

  const tmpJson = resolve(tmpdir(), `nf-scene-preview-${name}.json`);
  const tmpHtml = resolve(tmpdir(), `nf-scene-preview-${name}.html`);
  writeFileSync(tmpJson, JSON.stringify(timeline, null, 2));

  // Build HTML (skip auto-preview to avoid recursion)
  try {
    const output = execFileSync(process.execPath, [CLI_ENTRY, "build", tmpJson, "--no-preview"], {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    process.stdout.write(output);
  } catch (err) {
    process.stderr.write(`Build failed: ${err.stderr || err.message}\n`);
    return 2;
  }

  // Open
  try { execSync(`open "${tmpHtml}"`); } catch { /* ignore */ }
  process.stdout.write(`\nOpened: ${tmpHtml}\n`);
  process.stdout.write(`Use Play button + scrubber to test animation.\n`);
  return 0;
}
