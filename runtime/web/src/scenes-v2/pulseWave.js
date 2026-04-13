import { toNumber, clamp, lerp } from "../scenes-v2-shared.js";

export default {
  id: "pulseWave",
  type: "canvas",
  name: "Pulse Wave",
  category: "Effects",
  tags: ["脉冲波形", "音频波形", "均衡器", "音乐可视化", "波形", "动效"],
  description: "模拟音频均衡器的脉冲波形动画，柱状条随节拍上下跳动",
  params: {
    bars:      { type: "number", default: 32,   min: 4,  max: 128, desc: "波形柱数量" },
    color:     { type: "color",  default: "#a855f7",              desc: "波形柱颜色" },
    minHeight: { type: "number", default: 0.05, min: 0,  max: 0.5, desc: "柱最小高度比例(0-1)" },
    maxHeight: { type: "number", default: 0.8,  min: 0.1, max: 1,  desc: "柱最大高度比例(0-1)" },
    beatFreq:  { type: "number", default: 2,    min: 0.5, max: 10, desc: "节拍频率倍数" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    canvas.width = container.clientWidth || 1920;
    canvas.height = container.clientHeight || 1080;
    container.appendChild(canvas);

    // Pre-compute per-bar frequency offsets for varied motion
    const barCount = clamp(toNumber(params.bars, 32), 4, 128) | 0;
    const offsets = new Float64Array(barCount);
    let seed = 73;
    for (let i = 0; i < barCount; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      offsets[i] = (seed / 0x7fffffff) * Math.PI * 2;
    }
    canvas._data = { offsets };
    return canvas;
  },

  update(canvas, localT, params) {
    const ctx = canvas.getContext("2d");
    const cw = canvas.parentElement?.clientWidth || canvas.width;
    const ch = canvas.parentElement?.clientHeight || canvas.height;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const W = canvas.width;
    const H = canvas.height;

    const barCount = clamp(toNumber(params.bars, 32), 4, 128) | 0;
    const color = params.color || "#a855f7";
    const minH = clamp(toNumber(params.minHeight, 0.05), 0, 0.5);
    const maxH = clamp(toNumber(params.maxHeight, 0.8), 0.1, 1);
    const beatFreq = toNumber(params.beatFreq, 2);

    const { offsets } = canvas._data;

    ctx.clearRect(0, 0, W, H);

    const gap = 2;
    const totalGap = gap * (barCount - 1);
    const barWidth = Math.max(1, (W - totalGap) / barCount);
    const centerY = H / 2;
    const t = localT * beatFreq;

    for (let i = 0; i < barCount; i++) {
      const offset = i < offsets.length ? offsets[i] : i;
      // Combine multiple frequencies for organic "audio" look
      const wave1 = Math.sin(t * 3.5 + offset) * 0.4;
      const wave2 = Math.sin(t * 2.1 + offset * 1.7) * 0.3;
      const wave3 = Math.sin(t * 5.8 + offset * 0.5) * 0.15;
      const beat = Math.pow(Math.abs(Math.sin(t * Math.PI)), 3) * 0.15;

      const raw = 0.5 + wave1 + wave2 + wave3 + beat;
      const normalized = clamp(raw, 0, 1);
      const heightFrac = lerp(minH, maxH, normalized);
      const barH = heightFrac * H * 0.5;

      const x = i * (barWidth + gap);

      // Gradient per bar
      const grad = ctx.createLinearGradient(x, centerY - barH, x, centerY + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(0.5, color + "cc");
      grad.addColorStop(1, color);

      ctx.fillStyle = grad;

      // Round-capped bars using roundRect
      const rx = Math.min(barWidth / 2, 4);
      ctx.beginPath();
      ctx.roundRect(x, centerY - barH, barWidth, barH * 2, rx);
      ctx.fill();
    }
  },

  destroy(canvas) {
    canvas._data = null;
    canvas.remove();
  },
};
