import {
  createRoot, createNode, smoothstep, clamp,
  SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

export default {
  id: "compareSlider",
  type: "dom",
  name: "Compare Slider",
  category: "Layout",
  tags: ["compare", "split", "before", "after", "slider", "layout"],
  description: "分屏对比效果，分割线自动从左向右移动，适合展示前后对比、版本差异、A/B 方案比较",
  params: {
    leftLabel:    { type: "string", default: "Before",  desc: "左侧标签" },
    rightLabel:   { type: "string", default: "After",   desc: "右侧标签" },
    leftColor:    { type: "string", default: "#1a1a2e", desc: "左侧背景色" },
    rightColor:   { type: "string", default: "#0a2a4e", desc: "右侧背景色" },
    dividerColor: { type: "string", default: "#ffffff", desc: "分割线颜色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:stretch;justify-content:center");

    const leftSide = createNode("div", [
      `background:${params.leftColor || "#1a1a2e"}`,
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "overflow:hidden",
    ].join(";"));

    const leftLabel = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:36px",
      "font-weight:700",
      "color:rgba(255,255,255,0.85)",
      "letter-spacing:0.04em",
      "text-transform:uppercase",
    ].join(";"), params.leftLabel || "Before");
    leftSide.appendChild(leftLabel);

    const rightSide = createNode("div", [
      `background:${params.rightColor || "#0a2a4e"}`,
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "overflow:hidden",
    ].join(";"));

    const rightLabel = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:36px",
      "font-weight:700",
      "color:rgba(255,255,255,0.85)",
      "letter-spacing:0.04em",
      "text-transform:uppercase",
    ].join(";"), params.rightLabel || "After");
    rightSide.appendChild(rightLabel);

    const divider = createNode("div", [
      "position:absolute",
      "top:0",
      "bottom:0",
      "width:3px",
      `background:${params.dividerColor || "#ffffff"}`,
      "z-index:10",
      "box-shadow:0 0 12px rgba(255,255,255,0.4)",
      "pointer-events:none",
    ].join(";"));

    const handle = createNode("div", [
      "position:absolute",
      "top:50%",
      "left:50%",
      "transform:translate(-50%,-50%)",
      "width:40px",
      "height:40px",
      "border-radius:50%",
      `background:${params.dividerColor || "#ffffff"}`,
      "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      `color:${params.rightColor || "#0a2a4e"}`,
      "font-size:16px",
      "font-weight:bold",
    ].join(";"), "\u25C0\u25B6");
    divider.appendChild(handle);

    root.appendChild(rightSide);
    root.appendChild(leftSide);
    root.appendChild(divider);

    return { root, leftSide, rightSide, divider };
  },

  update(els, localT) {
    const enterT = smoothstep(0, 0.08, localT);
    const exitT = 1 - smoothstep(0.9, 1, localT);
    const alpha = enterT * exitT;
    els.root.style.opacity = String(alpha);

    // Slider moves from 15% to 85% over the main animation window
    const slideT = smoothstep(0.08, 0.85, localT);
    const position = 0.15 + slideT * 0.7; // 15% → 85%
    const pct = (position * 100).toFixed(2);

    els.leftSide.style.clipPath = `inset(0 ${(100 - position * 100).toFixed(2)}% 0 0)`;
    els.divider.style.left = `${pct}%`;
    els.divider.style.transform = "translateX(-50%)";
  },

  destroy(els) { els.root.remove(); },
};
