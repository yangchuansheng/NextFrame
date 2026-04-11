const waveformCache = new WeakMap();

function getPeakCache(audioBuffer) {
  let cache = waveformCache.get(audioBuffer);
  if (!cache) {
    cache = new Map();
    waveformCache.set(audioBuffer, cache);
  }
  return cache;
}

function computePeaks(audioBuffer, samples) {
  const cache = getPeakCache(audioBuffer);
  if (cache.has(samples)) {
    return cache.get(samples);
  }

  const channels = Array.from(
    { length: Math.max(0, audioBuffer.numberOfChannels) },
    (_, index) => audioBuffer.getChannelData(index),
  );
  const peaks = new Float32Array(samples * 2);

  if (channels.length === 0 || channels[0].length === 0) {
    cache.set(samples, peaks);
    return peaks;
  }

  const blockSize = Math.max(1, Math.floor(channels[0].length / samples));
  const stride = Math.max(1, Math.floor(blockSize / 48));

  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
    const blockStart = sampleIndex * blockSize;
    const blockEnd = Math.min(channels[0].length, blockStart + blockSize);
    let min = 1;
    let max = -1;

    for (const channel of channels) {
      for (let index = blockStart; index < blockEnd; index += stride) {
        const value = channel[index] || 0;
        if (value < min) {
          min = value;
        }
        if (value > max) {
          max = value;
        }
      }
    }

    if (min > max) {
      min = 0;
      max = 0;
    }

    peaks[sampleIndex * 2] = min;
    peaks[sampleIndex * 2 + 1] = max;
  }

  cache.set(samples, peaks);
  return peaks;
}

export function drawWaveform(ctx, audioBuffer, x, y, w, h, color = "rgba(255, 255, 255, 0.72)") {
  if (!ctx || typeof ctx.save !== "function" || !audioBuffer || !(w > 0) || !(h > 0)) {
    return;
  }

  const samples = Math.max(8, Math.floor(w));
  const peaks = computePeaks(audioBuffer, samples);
  const centerY = y + h / 2;
  const amplitude = h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();

  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
    const min = peaks[sampleIndex * 2];
    const max = peaks[sampleIndex * 2 + 1];
    const px = x + (sampleIndex / Math.max(samples - 1, 1)) * w;
    ctx.moveTo(px, centerY + min * amplitude);
    ctx.lineTo(px, centerY + max * amplitude);
  }

  ctx.stroke();
  ctx.restore();
}
