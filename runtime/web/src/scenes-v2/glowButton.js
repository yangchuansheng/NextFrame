import { createRoot, createNode, clamp, easeOutBack, smoothstep, SANS_FONT_STACK } from "../scenes-v2-shared.js";

export default {
  id: "glowButton",
  type: "dom",
  name: "Glow Button",
  category: "Layout",
  tags: ["button", "cta", "glow", "pulse", "animation", "layout"],
  description: "发光按钮组件，带脉冲光晕效果，缩放弹入入场动画",
  params: {
    text:         { type: "string", default: "Get Started",      desc: "按钮文字" },
    color:        { type: "string", default: "#6ee7ff",          desc: "按钮背景色" },
    glowColor:    { type: "string", default: "#6ee7ff",          desc: "光晕颜色" },
    size:         { type: "number", default: 20,                 desc: "字号(px)", min: 12, max: 48 },
    pulseSpeed:   { type: "number", default: 2,                  desc: "脉冲速度(秒/周期)", min: 0.5, max: 8 },
    borderRadius: { type: "number", default: 12,                 desc: "圆角(px)", min: 0, max: 50 },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");

    const color = params.color || "#6ee7ff";
    const glowColor = params.glowColor || "#6ee7ff";
    const borderRadius = params.borderRadius != null ? params.borderRadius : 12;
    const size = params.size || 20;

    const wrapper = createNode("div", [
      "position:relative",
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "will-change:transform,opacity",
      "opacity:0",
      "transform:scale(0.3)",
    ].join(";"));

    // glow layer behind button
    const glow = createNode("div", [
      "position:absolute",
      "inset:-20px",
      `background:${glowColor}`,
      `border-radius:${borderRadius + 20}px`,
      "filter:blur(30px)",
      "opacity:0.3",
      "will-change:opacity",
    ].join(";"));

    const btn = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      `font-size:${size}px`,
      "font-weight:700",
      "color:rgba(0,0,0,0.9)",
      `background:${color}`,
      `padding:${size * 0.8}px ${size * 2}px`,
      `border-radius:${borderRadius}px`,
      "letter-spacing:0.05em",
      "text-transform:uppercase",
      "position:relative",
      "z-index:1",
      "white-space:nowrap",
    ].join(";"), params.text || "Get Started");

    wrapper.appendChild(glow);
    wrapper.appendChild(btn);
    root.appendChild(wrapper);

    return { root, wrapper, glow, pulseSpeed: params.pulseSpeed || 2 };
  },

  update(els, localT) {
    // entrance: scale bounce
    const enterT = clamp(localT / 0.6, 0, 1);
    const scale = enterT > 0 ? 0.3 + 0.7 * easeOutBack(enterT) : 0.3;
    const alpha = smoothstep(0, 0.2, localT);

    els.wrapper.style.transform = `scale(${clamp(scale, 0.3, 1.15)})`;
    els.wrapper.style.opacity = String(alpha);

    // pulse glow
    if (enterT >= 1) {
      const pulse = 0.2 + 0.15 * Math.sin(localT * Math.PI * 2 / els.pulseSpeed);
      els.glow.style.opacity = String(pulse);
    }
  },

  destroy(els) { els.root.remove(); },
};
