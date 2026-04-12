export function grayscale(data, w, h, params) {
  const amount = params.amount ?? 1;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i]     = data[i] + (gray - data[i]) * amount;
    data[i + 1] = data[i + 1] + (gray - data[i + 1]) * amount;
    data[i + 2] = data[i + 2] + (gray - data[i + 2]) * amount;
  }
}
