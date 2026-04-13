import {
  createRoot, createNode, smoothstep, toNumber, clamp,
  SANS_FONT_STACK, hashFloat,
} from "../scenes-v2-shared.js";

function charProgress(index, total, stagger, globalT) {
  const charStart = index * stagger;
  const charEnd = charStart + (1 - total * stagger);
  if (charEnd <= charStart) return clamp(globalT);
  return clamp((globalT - charStart) / (charEnd - charStart));
}

const EFFECTS = {
  wave(el, t, index) {
    const offset = Math.sin((t * Math.PI * 2) - index * 0.5) * (1 - t) * 30;
    el.style.transform = `translateY(${offset}px)`;
    el.style.opacity = String(smoothstep(0, 0.3, t));
  },
  scatter(el, t, index, seed) {
    const rx = (hashFloat(seed + index, "x") - 0.5) * 400;
    const ry = (hashFloat(seed + index, "y") - 0.5) * 300;
    const inv = 1 - t;
    el.style.transform = `translate(${rx * inv}px, ${ry * inv}px)`;
    el.style.opacity = String(smoothstep(0, 0.4, t));
  },
  rotate(el, t) {
    const angle = (1 - t) * 180;
    el.style.transform = `rotate(${angle}deg)`;
    el.style.opacity = String(smoothstep(0, 0.3, t));
  },
  blur(el, t) {
    const blurAmount = (1 - t) * 12;
    el.style.filter = `blur(${blurAmount}px)`;
    el.style.opacity = String(smoothstep(0, 0.5, t));
  },
  scale(el, t) {
    const s = t;
    el.style.transform = `scale(${s})`;
    el.style.opacity = String(smoothstep(0, 0.3, t));
  },
};

export default {
  id: "textReveal",
  type: "dom",
  name: "Text Reveal",
  category: "Typography",
  tags: ["text", "reveal", "animation", "wave", "scatter", "stagger", "typography"],
  description: "逐字符高级动画效果，支持波浪、散射、旋转、模糊和缩放五种入场方式，适合标题和强调文字",
  params: {
    text:    { type: "string", default: "REVEAL",    desc: "文字内容" },
    fontSize:{ type: "number", default: 80,          desc: "字号(px)", min: 24, max: 200 },
    effect:  { type: "string", default: "wave",      desc: "效果:wave/scatter/rotate/blur/scale" },
    color:   { type: "string", default: "#ffffff",   desc: "文字颜色" },
    stagger: { type: "number", default: 0.05,        desc: "字符间延迟(0~0.2)" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");
    const fontSize = toNumber(params.fontSize, 80);
    const text = String(params.text || "REVEAL");
    const color = params.color || "#ffffff";

    const wrapper = createNode("div", [
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "flex-wrap:wrap",
      "gap:0",
    ].join(";"));

    const chars = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = createNode("span", [
        `font-family:${SANS_FONT_STACK}`,
        `font-size:${fontSize}px`,
        "font-weight:800",
        `color:${color}`,
        "display:inline-block",
        "will-change:transform,opacity,filter",
        "opacity:0",
        ch === " " ? `width:${fontSize * 0.3}px` : "",
      ].filter(Boolean).join(";"), ch === " " ? "\u00A0" : ch);
      wrapper.appendChild(span);
      chars.push(span);
    }

    root.appendChild(wrapper);
    const effect = params.effect || "wave";
    const stagger = toNumber(params.stagger, 0.05);

    return { root, wrapper, chars, effect, stagger, seed: Math.floor(Math.random() * 10000) };
  },

  update(els, localT) {
    const exitT = 1 - smoothstep(0.85, 1, localT);
    const animT = smoothstep(0.05, 0.75, localT);
    const effectFn = EFFECTS[els.effect] || EFFECTS.wave;
    const total = els.chars.length;

    for (let i = 0; i < total; i++) {
      const t = charProgress(i, total, els.stagger, animT);
      effectFn(els.chars[i], t, i, els.seed);
      // Apply exit fade
      const currentOpacity = parseFloat(els.chars[i].style.opacity) || 0;
      els.chars[i].style.opacity = String(currentOpacity * exitT);
    }
  },

  destroy(els) { els.root.remove(); },
};
