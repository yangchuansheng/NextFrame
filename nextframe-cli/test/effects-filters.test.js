import { test } from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { applyEnterEffect, applyExitEffect, EFFECT_FNS } from "../src/effects/index.js";
import { applyFilters, FILTER_FNS } from "../src/filters/index.js";

const W = 64, H = 64;

function makeCtx() {
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, W, H);
  return ctx;
}

test("ef-1: fadeIn at progress=0 sets globalAlpha=0", () => {
  const ctx = makeCtx();
  EFFECT_FNS.fadeIn(ctx, 0);
  assert.equal(ctx.globalAlpha, 0);
});

test("ef-2: fadeIn at progress=1 sets globalAlpha=1", () => {
  const ctx = makeCtx();
  EFFECT_FNS.fadeIn(ctx, 1);
  assert.equal(ctx.globalAlpha, 1);
});

test("ef-3: fadeOut at progress=1 sets globalAlpha=0", () => {
  const ctx = makeCtx();
  EFFECT_FNS.fadeOut(ctx, 1);
  assert.equal(ctx.globalAlpha, 0);
});

test("ef-4: applyEnterEffect with unknown type does not crash", () => {
  const ctx = makeCtx();
  applyEnterEffect(ctx, 0.2, { type: "nonexistent", dur: 0.5 }, W, H);
  // Should not throw
  assert.ok(true);
});

test("ef-5: applyExitEffect only applies in last dur seconds", () => {
  const ctx = makeCtx();
  // At localT=1, clipDur=5, exit dur=0.5 → exitStart=4.5 → not yet
  applyExitEffect(ctx, 1, 5, { type: "fadeOut", dur: 0.5 }, W, H);
  assert.equal(ctx.globalAlpha, 1); // unchanged
});

test("ef-6: applyExitEffect applies at end", () => {
  const ctx = makeCtx();
  // At localT=4.75, clipDur=5, exit dur=0.5 → progress=0.5
  applyExitEffect(ctx, 4.75, 5, { type: "fadeOut", dur: 0.5 }, W, H);
  assert.ok(ctx.globalAlpha < 1, `expected alpha < 1, got ${ctx.globalAlpha}`);
});

test("fl-1: warmTone increases red channel", () => {
  const data = new Uint8ClampedArray([100, 100, 100, 255]);
  FILTER_FNS.warmTone(data, 1, 1, { intensity: 1 });
  assert.ok(data[0] > 100, `R should increase, got ${data[0]}`);
  assert.ok(data[2] < 100, `B should decrease, got ${data[2]}`);
});

test("fl-2: grayscale makes R=G=B", () => {
  const data = new Uint8ClampedArray([255, 0, 0, 255]);
  FILTER_FNS.grayscale(data, 1, 1, { amount: 1 });
  assert.ok(Math.abs(data[0] - data[1]) < 2 && Math.abs(data[1] - data[2]) < 2,
    `expected R≈G≈B, got ${data[0]},${data[1]},${data[2]}`);
});

test("fl-3: filmGrain produces different output for different t", () => {
  const d1 = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255]);
  const d2 = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255]);
  FILTER_FNS.filmGrain(d1, 2, 1, { amount: 0.1, _t: 0 });
  FILTER_FNS.filmGrain(d2, 2, 1, { amount: 0.1, _t: 1 });
  const same = d1[0] === d2[0] && d1[4] === d2[4];
  assert.ok(!same, "grain should differ between t=0 and t=1");
});

test("fl-4: applyFilters chains multiple filters", () => {
  const ctx = makeCtx();
  applyFilters(ctx, W, H, ["warmTone", "grayscale"], 0);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  // After warmTone + grayscale, should be grayish
  assert.ok(Math.abs(d[0] - d[1]) < 10, "should be near-gray after chain");
});
