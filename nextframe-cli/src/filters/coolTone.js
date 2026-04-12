export function coolTone(data, w, h, params) {
  const intensity = params.intensity ?? 0.5;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.max(0, data[i] - 8 * intensity);       // R reduce
    data[i + 2] = Math.min(255, data[i + 2] + 12 * intensity); // B boost
  }
}
