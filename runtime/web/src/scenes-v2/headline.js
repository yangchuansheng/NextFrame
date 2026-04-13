import {
  SANS_FONT_STACK,
  createRoot,
  createNode,
  smoothstep,
  easeOutCubic,
  clamp,
  normalizeArray,
  makeLinearGradient,
} from "../scenes-v2-shared.js";

export default {
  id: "headline",
  type: "dom",
  name: "Headline",
  category: "Typography",
  tags: ["text", "title", "headline", "gradient", "stagger", "animation"],
  description: "Adaptive headline with optional subtitle, gradient text, and per-character stagger entrance",

  params: {
    text: { type: "string", default: "TITLE", desc: "Main headline text" },
    subtitle: { type: "string", default: "", desc: "Optional subtitle below headline" },
    fontSize: { type: "number", default: 0.07, desc: "Font size relative to short edge", min: 0.02, max: 0.15 },
    gradient: { type: "array", default: ["#6ee7ff", "#a78bfa", "#f472b6"], desc: "Gradient color stops" },
    stagger: { type: "number", default: 0.08, desc: "Stagger delay per character (in localT units)", min: 0.01, max: 0.3 },
  },

  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) {
      p[k] = v.default;
    }
    return p;
  },

  create(container, params) {
    const W = container.clientWidth || 1920;
    const H = container.clientHeight || 1080;
    const S = Math.min(W, H);

    const text = String(params.text || "TITLE");
    const subtitle = String(params.subtitle || "");
    const fontSize = S * (params.fontSize || 0.07);
    const subtitleSize = S * 0.025;
    const colors = normalizeArray(params.gradient, ["#6ee7ff", "#a78bfa", "#f472b6"]);
    const gradientCSS = makeLinearGradient(colors);

    const root = createRoot(container, "display:flex;flex-direction:column;align-items:center;justify-content:center");

    const titleWrap = createNode("div", [
      "display:flex",
      "flex-wrap:wrap",
      "justify-content:center",
      "align-items:baseline",
      `gap:${Math.round(S * 0.005)}px`,
      "will-change:transform,opacity",
    ].join(";"));

    const chars = [];
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const span = createNode("span", [
        `font-size:${Math.round(fontSize)}px`,
        `font-family:${SANS_FONT_STACK}`,
        "font-weight:900",
        `background:${gradientCSS}`,
        "-webkit-background-clip:text",
        "background-clip:text",
        "-webkit-text-fill-color:transparent",
        "display:inline-block",
        "opacity:0",
        "transform:translateY(20px)",
        "will-change:transform,opacity",
        "transition:none",
        ch === " " ? `width:${Math.round(fontSize * 0.3)}px` : "",
      ].filter(Boolean).join(";"), ch === " " ? "\u00A0" : ch);
      titleWrap.appendChild(span);
      chars.push(span);
    }
    root.appendChild(titleWrap);

    let subtitleEl = null;
    if (subtitle) {
      subtitleEl = createNode("div", [
        `font-size:${Math.round(subtitleSize)}px`,
        `font-family:${SANS_FONT_STACK}`,
        "font-weight:400",
        "color:rgba(255,255,255,0.6)",
        `margin-top:${Math.round(S * 0.015)}px`,
        "opacity:0",
        "will-change:opacity",
        "text-align:center",
      ].join(";"), subtitle);
      root.appendChild(subtitleEl);
    }

    return { root, chars, subtitleEl, S };
  },

  update(els, localT, params) {
    const t = clamp(localT);
    const staggerDelay = params.stagger || 0.08;
    const charCount = els.chars.length;

    for (let i = 0; i < charCount; i += 1) {
      const charStart = i * staggerDelay * 0.3;
      const enterEnd = charStart + 0.3;
      const exitStart = 0.8;

      const enterProgress = easeOutCubic(smoothstep(charStart, Math.min(enterEnd, 0.3), t));
      const exitProgress = smoothstep(exitStart, 1, t);
      const opacity = enterProgress * (1 - exitProgress);
      const translateY = (1 - enterProgress) * 20 + exitProgress * -20;

      els.chars[i].style.opacity = String(opacity);
      els.chars[i].style.transform = `translateY(${translateY}px)`;
    }

    if (els.subtitleEl) {
      const subEnter = easeOutCubic(smoothstep(0.2, 0.4, t));
      const subExit = smoothstep(0.8, 1, t);
      els.subtitleEl.style.opacity = String(subEnter * (1 - subExit));
    }
  },

  destroy(els) {
    if (els.root && els.root.parentNode) {
      els.root.parentNode.removeChild(els.root);
    }
  },
};
