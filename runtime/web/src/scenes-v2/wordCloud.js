import { clamp, toNumber, normalizeArray } from "../scenes-v2-shared.js";

const PALETTE = ["#6ee7ff", "#a78bfa", "#f472b6", "#fb923c", "#4ade80", "#fbbf24"];
const FONT = '-apple-system, "SF Pro Display", sans-serif';

export default {
  id: "wordCloud",
  type: "canvas",
  name: "Word Cloud",
  category: "Typography",
  tags: ["words", "cloud", "text", "typography", "tags", "visualization"],
  description: "词云效果，多个文字以不同大小和角度随机分布，逐个淡入出现",
  params: {
    words:   { type: "array",  default: [{text:"Design",weight:9},{text:"Code",weight:8},{text:"AI",weight:10},{text:"Cloud",weight:7},{text:"Data",weight:6},{text:"API",weight:5},{text:"Ship",weight:8},{text:"Scale",weight:6},{text:"Build",weight:7},{text:"Deploy",weight:5},{text:"Test",weight:4},{text:"Debug",weight:3},{text:"Launch",weight:9},{text:"Fast",weight:7},{text:"Iterate",weight:6}], desc: "词条数组 [{text,weight}]" },
    colors:  { type: "array",  default: PALETTE, desc: "颜色数组" },
    maxSize: { type: "number", default: 80,      desc: "最大字号(px)", min: 30, max: 200 },
    minSize: { type: "number", default: 16,      desc: "最小字号(px)", min: 8, max: 60 },
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

    const words = normalizeArray(params.words, this.params.words.default);
    const colors = normalizeArray(params.colors, PALETTE);
    const maxSize = toNumber(params.maxSize, 80);
    const minSize = toNumber(params.minSize, 16);

    const maxWeight = Math.max(...words.map((w) => toNumber(w.weight, 1)), 1);
    const W = canvas.width;
    const H = canvas.height;

    // pre-compute positions using a simple grid spiral
    let seed = 42;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    const sorted = [...words].sort((a, b) => toNumber(b.weight, 1) - toNumber(a.weight, 1));
    const placed = [];

    // grid-based placement: spread words in concentric rings from center
    sorted.forEach((w, i) => {
      const weight = toNumber(w.weight, 1);
      const fontSize = minSize + ((weight / maxWeight) * (maxSize - minSize));
      const angle = (rng() < 0.3) ? -90 : 0; // 30% chance vertical
      const color = colors[i % colors.length];

      // spiral placement
      const ringAngle = (i / sorted.length) * Math.PI * 4 + rng() * 0.5;
      const ringRadius = 50 + (i / sorted.length) * Math.min(W, H) * 0.35;
      const x = W / 2 + Math.cos(ringAngle) * ringRadius + (rng() - 0.5) * 60;
      const y = H / 2 + Math.sin(ringAngle) * ringRadius + (rng() - 0.5) * 40;

      placed.push({ text: w.text || "", x, y, fontSize, angle, color });
    });

    canvas._data = { placed };
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { placed } = canvas._data;
    const stagger = 0.04;
    const dur = 0.4;

    placed.forEach((w, i) => {
      const t = clamp((localT - i * stagger) / dur, 0, 1);
      if (t <= 0) return;

      ctx.save();
      ctx.globalAlpha = t;
      ctx.translate(w.x, w.y);
      if (w.angle !== 0) ctx.rotate(w.angle * Math.PI / 180);
      ctx.font = `bold ${w.fontSize}px ${FONT}`;
      ctx.fillStyle = w.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(w.text, 0, 0);
      ctx.restore();
    });
  },

  destroy(canvas) {
    canvas._data = null;
    canvas.remove();
  },
};
