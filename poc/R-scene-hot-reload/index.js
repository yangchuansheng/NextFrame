import { createCanvas } from "canvas";
import chokidar from "chokidar";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WIDTH = 1920;
const HEIGHT = 1080;
const FRAME_INTERVAL_MS = 200;
const OUTPUT_DIR = "/tmp/poc-r";
const OUTPUT_PATH = path.join(OUTPUT_DIR, "latest.png");
const TEMP_OUTPUT_PATH = path.join(OUTPUT_DIR, "latest.tmp.png");
const SCENE_PATH = path.resolve("./mySimpleScene.js");
const PARAMS = {
  hue: 210,
};

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

let currentScene = () => {};
let currentSceneVersion = "boot";
let lastSaveMtimeMs = 0;
let lastMeasuredVersion = "";
let importSerial = 0;
let running = true;
let reloadChain = Promise.resolve();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadScene() {
  importSerial += 1;
  const cacheBustToken = `${Date.now()}-${importSerial}`;
  const sceneUrl = `${pathToFileURL(SCENE_PATH).href}?v=${cacheBustToken}`;
  const module = await import(sceneUrl);

  if (typeof module.default !== "function") {
    throw new TypeError("mySimpleScene.js must export a default function");
  }

  const stats = await fs.stat(SCENE_PATH);
  currentScene = module.default;
  currentSceneVersion = cacheBustToken;
  lastSaveMtimeMs = stats.mtimeMs;
  console.log(
    `[reload] version=${currentSceneVersion} fileMtime=${new Date(lastSaveMtimeMs).toISOString()}`
  );
}

function scheduleReload(reason) {
  reloadChain = reloadChain
    .then(async () => {
      try {
        await loadScene();
      } catch (error) {
        console.error(`[reload] failed after ${reason}:`, error);
      }
    })
    .catch((error) => {
      console.error("[reload] unexpected queue failure:", error);
    });
}

async function writeLatestPng() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  currentScene(ctx, PARAMS);

  const pngBuffer = canvas.toBuffer("image/png");
  await fs.writeFile(TEMP_OUTPUT_PATH, pngBuffer);
  await fs.rename(TEMP_OUTPUT_PATH, OUTPUT_PATH);

  const renderedAtMs = Date.now();
  if (currentSceneVersion !== lastMeasuredVersion && renderedAtMs >= lastSaveMtimeMs) {
    const latencyMs = renderedAtMs - lastSaveMtimeMs;
    lastMeasuredVersion = currentSceneVersion;
    console.log(
      `[render] ${OUTPUT_PATH} version=${currentSceneVersion} latencyFromSave=${latencyMs.toFixed(1)}ms`
    );
  }
}

async function renderLoop() {
  while (running) {
    const startedAtMs = Date.now();
    try {
      await writeLatestPng();
    } catch (error) {
      console.error("[render] failed:", error);
    }

    const elapsedMs = Date.now() - startedAtMs;
    await delay(Math.max(0, FRAME_INTERVAL_MS - elapsedMs));
  }
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await loadScene();

  const watcher = chokidar.watch(SCENE_PATH, {
    ignoreInitial: true,
  });

  watcher.on("all", (eventName) => {
    if (eventName === "change" || eventName === "add") {
      scheduleReload(eventName);
    }
  });

  const shutdown = async (signal) => {
    if (!running) {
      return;
    }

    running = false;
    console.log(`[shutdown] ${signal}`);
    await watcher.close();
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  console.log(`[start] watching ${SCENE_PATH}`);
  console.log(`[start] writing ${OUTPUT_PATH} every ${FRAME_INTERVAL_MS}ms`);
  await renderLoop();
}

await main();
