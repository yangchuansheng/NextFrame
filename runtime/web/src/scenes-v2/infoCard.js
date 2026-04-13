import {
  createRoot, createNode, smoothstep, easeOutBack,
  SANS_FONT_STACK, MONO_FONT_STACK,
} from "../scenes-v2-shared.js";

// infoCard — 信息卡片：顶部色条 + 标签 + 标题 + 描述 + chips
// type: "dom"
// params: { topColor, borderStyle("solid"/"dashed"), label, title, desc, chips:[], chipColor }

export default {
  id: "infoCard",
  type: "dom",
  name: "Info Card",
  category: "Cards",
  tags: ["卡片", "信息卡", "标签", "标题", "描述", "布局", "内容展示"],
  description: "带顶部色条、标签 pill、标题、描述和 chip 标签的信息卡片组件",
  params: {
    topColor:    { type: "color",  default: "#7ec699",            desc: "顶部色条颜色" },
    borderStyle: { type: "select", default: "solid",              desc: "边框样式 solid/dashed", options: ["solid", "dashed"] },
    label:       { type: "string", default: "LABEL",              desc: "顶部标签文字" },
    title:       { type: "string", default: "卡片标题",            desc: "卡片主标题" },
    desc:        { type: "string", default: "卡片描述文字",        desc: "卡片描述内容，支持换行" },
    chips:       { type: "array",  default: [],                   desc: "底部 chip 标签数组" },
    chipColor:   { type: "color",  default: "#7ec699",            desc: "chip 颜色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const topColor = params.topColor || "#7ec699";
    const borderStyle = params.borderStyle || "solid";
    const chipColor = params.chipColor || topColor;
    const chips = Array.isArray(params.chips) ? params.chips : [];
    const cardBg = "#211c15";

    const root = createRoot(container, [
      "display:flex",
      "flex-direction:column",
    ].join(";"));

    // ── Card wrapper ──────────────────────────────────────────────────
    const card = createNode("div", [
      `background:${cardBg}`,
      `border:1.5px ${borderStyle} ${topColor}55`,
      "border-top:none",
      "border-radius:16px",
      "overflow:hidden",
      "width:100%",
      "height:100%",
      "display:flex",
      "flex-direction:column",
      `box-shadow:0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px ${topColor}11`,
      "will-change:opacity,transform",
      "opacity:0",
    ].join(";"));

    // ── Top color bar ─────────────────────────────────────────────────
    const topBar = createNode("div", [
      `background:${topColor}`,
      "height:5px",
      "width:100%",
      "flex-shrink:0",
    ].join(";"));
    card.appendChild(topBar);

    // ── Content ───────────────────────────────────────────────────────
    const content = createNode("div", [
      "padding:28px 28px 24px",
      "display:flex",
      "flex-direction:column",
      "gap:12px",
      "flex:1",
    ].join(";"));

    // Label pill
    const labelEl = createNode("div", [
      `font-family:${MONO_FONT_STACK}`,
      "font-size:11px",
      "font-weight:700",
      `color:${topColor}`,
      `background:${topColor}18`,
      `border:1px solid ${topColor}44`,
      "border-radius:6px",
      "padding:3px 10px",
      "letter-spacing:0.12em",
      "width:fit-content",
    ].join(";"), params.label || "");
    content.appendChild(labelEl);

    // Title
    const titleEl = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:22px",
      "font-weight:700",
      "color:rgba(245,236,224,0.95)",
      "letter-spacing:0.01em",
      "line-height:1.3",
    ].join(";"), params.title || "");
    content.appendChild(titleEl);

    // Desc — support \n line breaks
    const descText = String(params.desc || "");
    const descEl = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:15px",
      "font-weight:400",
      "color:rgba(245,236,224,0.55)",
      "line-height:1.7",
      "white-space:pre-line",
      "flex:1",
    ].join(";"), descText);
    content.appendChild(descEl);

    // Chips
    if (chips.length > 0) {
      const chipRow = createNode("div", [
        "display:flex",
        "flex-wrap:wrap",
        "gap:8px",
        "margin-top:4px",
      ].join(";"));
      chips.forEach((label) => {
        const chip = createNode("div", [
          `font-family:${MONO_FONT_STACK}`,
          "font-size:13px",
          "font-weight:600",
          `color:${chipColor}`,
          `background:${chipColor}14`,
          `border:1px solid ${chipColor}44`,
          "border-radius:6px",
          "padding:4px 12px",
          "letter-spacing:0.04em",
          "white-space:nowrap",
        ].join(";"), label);
        chipRow.appendChild(chip);
      });
      content.appendChild(chipRow);
    }

    card.appendChild(content);
    root.appendChild(card);

    return { root, card };
  },

  update(els, localT, params) {
    const slideDir = (params && params.slideDir) || "up";
    const enterT = smoothstep(0, 0.1, localT);
    const exitT = 1 - smoothstep(0.88, 1, localT);
    const alpha = enterT * exitT;
    const dy = slideDir === "left" ? 0 : (1 - enterT) * 30;
    const dx = slideDir === "left" ? (1 - enterT) * -40 : 0;
    const sc = 0.94 + 0.06 * easeOutBack(enterT);

    els.card.style.opacity = alpha;
    els.card.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
  },

  destroy(els) { els.root.remove(); },
};
