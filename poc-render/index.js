const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { PNG } = require("pngjs");
const wasm = require("./S-wasm/pkg/s_wasm.js");

const WIDTH = 1920;
const HEIGHT = 1080;
const T = 5.0;
const PARAMS = [270, 200, 320, 1.0, 0.04];
const OUTPUT_PATH = path.join(__dirname, "S-wasm", "frame_t5.png");
const ITERATIONS = 6;

function renderOnce() {
  return wasm.render_aurora(WIDTH, HEIGHT, T, ...PARAMS);
}

function writePng(rgba) {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  png.data = Buffer.from(rgba);
  fs.writeFileSync(OUTPUT_PATH, PNG.sync.write(png));
}

function measureLatency() {
  const durations = [];
  let firstFrame = null;

  for (let i = 0; i < ITERATIONS; i += 1) {
    const start = performance.now();
    const rgba = renderOnce();
    const elapsed = performance.now() - start;
    durations.push(elapsed);
    if (i === 0) {
      firstFrame = rgba;
    }
  }

  return {
    firstFrame,
    firstCallMs: durations[0],
    subsequentAvgMs:
      durations.slice(1).reduce((sum, value) => sum + value, 0) /
      (durations.length - 1),
  };
}

const { firstFrame, firstCallMs, subsequentAvgMs } = measureLatency();
writePng(firstFrame);

console.log(`Wrote ${OUTPUT_PATH}`);
console.log(`First call latency: ${firstCallMs.toFixed(2)} ms`);
console.log(`Subsequent call latency (avg of ${ITERATIONS - 1}): ${subsequentAvgMs.toFixed(2)} ms`);
