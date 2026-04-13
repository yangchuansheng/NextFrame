import {
  createRoot, createNode, smoothstep, easeOutCubic, toNumber,
  SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

const ALIGN = { left: "flex-start", center: "center", right: "flex-end" };

export default {
  id: "lowerThird",
  type: "dom",
  name: "Lower Third",
  category: "Overlay",
  tags: ["角标", "字幕条", "下三分之一", "姓名条", "新闻字幕", "覆盖层"],
  description: "视频下方姓名职位字幕条，带强调色横线和滑入动画",
  params: {
    title:       { type: "string", default: "John Doe",          desc: "主标题文字（姓名）" },
    subtitle:    { type: "string", default: "Creative Director", desc: "副标题文字（职位）" },
    accentColor: { type: "color",  default: "#6ee7ff",           desc: "强调色（横线和副标题）" },
    position:    { type: "select", default: "left",              desc: "水平位置 left/center/right", options: ["left", "center", "right"] },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, [
      "display:flex",
      `justify-content:${ALIGN[params.position] || ALIGN.left}`,
      "align-items:flex-end",
      "padding:0 5% 8%",
    ].join(";"));
    const accent = params.accentColor || "#6ee7ff";
    const wrap = createNode("div", [
      "will-change:transform,opacity",
      "opacity:0",
      "transform:translateX(-40px)",
    ].join(";"));
    const bar = createNode("div", [
      `background:${accent}`,
      "height:3px",
      "width:0",
      "margin-bottom:8px",
      "border-radius:2px",
      `box-shadow:0 0 12px ${accent}66`,
      "will-change:width",
    ].join(";"));
    const title = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:24px",
      "font-weight:700",
      "color:rgba(255,255,255,0.95)",
      "letter-spacing:0.02em",
      "margin-bottom:2px",
    ].join(";"), params.title || "");
    const subtitle = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:14px",
      "font-weight:400",
      `color:${accent}`,
      "letter-spacing:0.06em",
      "opacity:0",
      "will-change:opacity",
    ].join(";"), params.subtitle || "");
    wrap.appendChild(bar);
    wrap.appendChild(title);
    wrap.appendChild(subtitle);
    root.appendChild(wrap);
    return { root, wrap, bar, subtitle };
  },

  update(els, localT) {
    const exitAlpha = 1 - smoothstep(0.85, 1, localT);
    const slideT = easeOutCubic(smoothstep(0, 0.12, localT));
    els.wrap.style.opacity = slideT * exitAlpha;
    els.wrap.style.transform = `translateX(${(1 - slideT) * -40}px)`;
    const barT = smoothstep(0.05, 0.15, localT);
    els.bar.style.width = `${barT * 60}px`;
    const subT = smoothstep(0.1, 0.18, localT);
    els.subtitle.style.opacity = subT * exitAlpha;
  },

  destroy(els) { els.root.remove(); },
};
