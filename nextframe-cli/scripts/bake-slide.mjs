#!/usr/bin/env node
// bake-slide.mjs — screenshots an sk-frame HTML at specified times via Chrome CDP.
// Usage: node scripts/bake-slide.mjs <slide.html> <outDir> [fps=30] [duration=auto]
//
// Launches headless Chrome, connects via CDP, injects __seekTo(t) for each frame,
// takes a screenshot, writes <outDir>/frame-NNNN.png.
//
// Requires: Google Chrome installed at /Applications/Google Chrome.app

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
// WebSocket is a global in Node 22+.

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9334;

const [,, htmlPath, outDir, fpsArg, durArg] = process.argv;
if (!htmlPath || !outDir) {
  console.error("usage: node bake-slide.mjs <slide.html> <outDir> [fps] [duration]");
  process.exit(1);
}

const fps = Number(fpsArg) || 30;
mkdirSync(outDir, { recursive: true });

const absHtml = resolve(htmlPath);
const fileUrl = `file://${absHtml}`;

// Launch Chrome
const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  "--window-size=1920,1080",
  "--hide-scrollbars",
  fileUrl,
], { stdio: ["ignore", "pipe", "pipe"] });

// Wait for DevTools ready
await new Promise((r) => setTimeout(r, 3000));

// Get page WS url
const resp = await fetch(`http://localhost:${PORT}/json`);
const pages = await resp.json();
const wsUrl = pages[0]?.webSocketDebuggerUrl;
if (!wsUrl) { console.error("no ws url"); chrome.kill(); process.exit(1); }

// Connect via WebSocket (browser-standard API in Node 22+)
const ws = new WebSocket(wsUrl);
let msgId = 1;
const pending = new Map();

ws.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

function cdp(method, params = {}) {
  return new Promise((resolve) => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((r) => ws.addEventListener("open", r));

// Wait for page load + slidekit init
await new Promise((r) => setTimeout(r, 2000));

// Get slide duration
const durResult = await cdp("Runtime.evaluate", {
  expression: "window.SK?.duration || window.__SLIDE_SEGMENTS?.segments?.reduce((a,s) => Math.max(a, (s.start||0) + (s.duration||0)), 0) || 0",
  returnByValue: true,
});
const slideDuration = Number(durArg) || durResult.result?.value || 72.42;
const totalFrames = Math.ceil(slideDuration * fps);

console.log(`Baking ${totalFrames} frames @ ${fps}fps for ${slideDuration.toFixed(2)}s from ${absHtml}`);
console.log(`Output: ${outDir}/frame-NNNN.png`);

for (let i = 0; i < totalFrames; i++) {
  const t = i / fps;

  // Seek slidekit timeline
  await cdp("Runtime.evaluate", {
    expression: `(function(){
      if(window.__seekTo) window.__seekTo(${t});
      else if(window.SK && window.SK.tl) { window.SK.tl.seek(${t}); }
    })()`,
  });

  // Wait for paint
  await new Promise((r) => setTimeout(r, 20));

  // Screenshot
  const shot = await cdp("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 },
  });

  const buf = Buffer.from(shot.result.data, "base64");
  const fname = `frame-${String(i).padStart(4, "0")}.png`;
  writeFileSync(`${outDir}/${fname}`, buf);

  if (i % 30 === 0) process.stderr.write(`  ${i}/${totalFrames}\r`);
}

process.stderr.write(`\n  Done: ${totalFrames} frames\n`);

ws.close();
chrome.kill();
process.exit(0);
