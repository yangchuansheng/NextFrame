// Deterministic film grain — seed varies per frame via t, no Math.random.
export function filmGrain(data, w, h, params) {
  const amount = (params.amount ?? 0.04) * 255;
  const t = params._t || 0;
  let seed = 5381 + Math.floor(t * 1000);
  for (let i = 0; i < data.length; i += 4) {
    seed = ((seed << 5) + seed + i) & 0x7fffffff;
    const noise = ((seed % 256) - 128) * (amount / 128);
    data[i]     = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
}
