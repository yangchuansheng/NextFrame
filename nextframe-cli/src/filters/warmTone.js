export function warmTone(data, w, h, params) {
  const intensity = params.intensity ?? 0.5;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i] + 12 * intensity);     // R boost
    data[i + 2] = Math.max(0, data[i + 2] - 8 * intensity);   // B reduce
  }
}
