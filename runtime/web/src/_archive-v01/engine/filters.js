function clamp01(value, fallback) {
  const normalized = value ?? fallback;
  return Math.max(0, Math.min(1, normalized));
}

function createCanvas(width, height) {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  throw new Error("Canvas creation is unavailable in this environment");
}

function getSourceCanvas(ctx, width, height) {
  const source = createCanvas(width, height);
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) {
    throw new Error("Could not acquire a 2D context for filter processing");
  }

  sourceCtx.drawImage(ctx.canvas, 0, 0, width, height);
  return source;
}

function buildCssFilter(spec) {
  switch (spec.type) {
    case "grayscale":
      return `grayscale(${clamp01(spec.amount, 1)})`;
    case "sepia":
      return `sepia(${clamp01(spec.intensity, 0.8)})`;
    case "warmTone":
      return "sepia(0.15) saturate(1.2) hue-rotate(-10deg)";
    case "coolTone":
      return "saturate(1.1) hue-rotate(10deg) brightness(1.05)";
    default:
      return "";
  }
}

function nextNoise(seed) {
  return (seed * 1664525 + 1013904223) >>> 0;
}

function createNoiseCanvas(width, height, seedBase) {
  const noiseCanvas = createCanvas(width, height);
  const noiseCtx = noiseCanvas.getContext("2d");
  if (!noiseCtx) {
    throw new Error("Could not acquire a 2D context for film grain noise");
  }

  const noiseData = noiseCtx.createImageData(width, height);
  let seed = seedBase >>> 0;
  for (let index = 0; index < noiseData.data.length; index += 4) {
    seed = nextNoise(seed + index);
    const gray = seed & 0xff;
    noiseData.data[index] = gray;
    noiseData.data[index + 1] = gray;
    noiseData.data[index + 2] = gray;
    noiseData.data[index + 3] = 255;
  }

  noiseCtx.putImageData(noiseData, 0, 0);
  return noiseCanvas;
}

function applyFilmGrain(ctx, width, height, spec) {
  const intensity = clamp01(spec.intensity ?? spec.amount, 0.04);
  if (intensity <= 0) {
    return;
  }

  const noiseWidth = Math.max(1, Math.round(width / 4));
  const noiseHeight = Math.max(1, Math.round(height / 4));
  const frameSeed = Math.floor((spec._t || 0) * 1000);
  const baseNoise = createNoiseCanvas(noiseWidth, noiseHeight, 0x9e3779b9 ^ frameSeed);
  const detailNoise = createNoiseCanvas(noiseWidth, noiseHeight, 0x85ebca6b ^ (frameSeed * 3));
  const softNoise = createNoiseCanvas(noiseWidth, noiseHeight, 0xc2b2ae35 ^ (frameSeed * 7));
  const offsetX = (frameSeed % 19) - 9;
  const offsetY = ((frameSeed >> 1) % 17) - 8;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = intensity * 0.5;
  ctx.drawImage(baseNoise, 0, 0, width, height);
  ctx.globalAlpha = intensity * 0.3;
  ctx.drawImage(detailNoise, offsetX, offsetY, width + 14, height + 10);
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = intensity * 0.2;
  ctx.drawImage(softNoise, -offsetY, offsetX, width + 10, height + 14);
  ctx.restore();
}

export function hasClipFilters(clip) {
  return Array.isArray(clip?.filters) && clip.filters.length > 0;
}

export function applyFilters(ctx, width, height, filters, t = 0) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return;
  }

  const specs = filters.map((filter) => (
    typeof filter === "string"
      ? { type: filter, _t: t }
      : { ...filter, _t: t }
  ));
  const cssFilters = specs
    .map((spec) => buildCssFilter(spec))
    .filter(Boolean);

  if (cssFilters.length > 0 && typeof ctx.filter === "string") {
    const source = getSourceCanvas(ctx, width, height);
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.filter = cssFilters.join(" ");
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();
  }

  for (const spec of specs) {
    if (spec.type === "filmGrain") {
      applyFilmGrain(ctx, width, height, spec);
    }
  }
}
