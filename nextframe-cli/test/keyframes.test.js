import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveKeyframes, interpolate, isKeyframed, EASINGS } from "../src/engine/keyframes.js";

test("kf-1: static params pass through unchanged", () => {
  const out = resolveKeyframes({ text: "hello", size: 48, on: true }, 5);
  assert.equal(out.text, "hello");
  assert.equal(out.size, 48);
  assert.equal(out.on, true);
});

test("kf-2: single keyframe returns that value at any t", () => {
  assert.equal(interpolate({ keys: [[0, 42]] }, 0), 42);
  assert.equal(interpolate({ keys: [[0, 42]] }, 99), 42);
});

test("kf-3: clamp before first key", () => {
  assert.equal(interpolate({ keys: [[2, 10], [4, 20]] }, 0), 10);
});

test("kf-4: clamp after last key", () => {
  assert.equal(interpolate({ keys: [[2, 10], [4, 20]] }, 99), 20);
});

test("kf-5: number lerp at midpoint", () => {
  const v = interpolate({ keys: [[0, 0], [10, 100]], ease: "linear" }, 5);
  assert.ok(Math.abs(v - 50) < 0.01, `expected ~50, got ${v}`);
});

test("kf-6: color lerp between two hex colors", () => {
  const c = interpolate({ keys: [[0, "#000000"], [1, "#ffffff"]], ease: "linear" }, 0.5);
  assert.ok(typeof c === "string" && c.startsWith("#"), `expected hex, got ${c}`);
  // Midpoint of black→white should be ~#808080
  const mid = parseInt(c.slice(1, 3), 16);
  assert.ok(mid >= 120 && mid <= 136, `R channel expected ~128, got ${mid}`);
});

test("kf-7: boolean snaps at 50%", () => {
  assert.equal(interpolate({ keys: [[0, true], [1, false]], ease: "linear" }, 0.3), true);
  assert.equal(interpolate({ keys: [[0, true], [1, false]], ease: "linear" }, 0.7), false);
});

test("kf-8: string snaps at 50%", () => {
  assert.equal(interpolate({ keys: [[0, "hello"], [1, "world"]], ease: "linear" }, 0.3), "hello");
  assert.equal(interpolate({ keys: [[0, "hello"], [1, "world"]], ease: "linear" }, 0.7), "world");
});

test("kf-9: easings return 0 at t=0 and ~1 at t=1", () => {
  for (const [name, fn] of Object.entries(EASINGS)) {
    assert.equal(fn(0), 0, `${name}(0) should be 0`);
    assert.ok(Math.abs(fn(1) - 1) < 0.01, `${name}(1) should be ~1, got ${fn(1)}`);
  }
});

test("kf-10: resolveKeyframes with mixed static + keyed params", () => {
  const out = resolveKeyframes({
    text: "hello",
    size: { keys: [[0, 24], [2, 48]], ease: "linear" },
    color: "#ff0000",
  }, 1);
  assert.equal(out.text, "hello");
  assert.ok(Math.abs(out.size - 36) < 0.01, `expected ~36, got ${out.size}`);
  assert.equal(out.color, "#ff0000");
});

test("kf-11: isKeyframed detects correctly", () => {
  assert.equal(isKeyframed({ keys: [[0, 1]] }), true);
  assert.equal(isKeyframed(42), false);
  assert.equal(isKeyframed("hello"), false);
  assert.equal(isKeyframed(null), false);
  assert.equal(isKeyframed({ keys: [] }), false);
});
