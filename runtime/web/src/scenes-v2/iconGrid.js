import {
  createRoot, createNode, smoothstep, toNumber, normalizeArray,
  SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

const DEFAULT_ITEMS = [
  { icon: "\u26A1", label: "Fast" },
  { icon: "\uD83D\uDD12", label: "Secure" },
  { icon: "\uD83C\uDF10", label: "Global" },
  { icon: "\uD83D\uDCCA", label: "Analytics" },
];

export default {
  id: "iconGrid",
  type: "dom",
  name: "Icon Grid",
  category: "Layout",
  tags: ["icon", "grid", "layout", "features", "emoji", "stagger"],
  description: "图标网格展示，emoji 图标加标签文字，逐个缩放入场，适合功能矩阵和特性展示",
  params: {
    items:    { type: "array",  default: DEFAULT_ITEMS, desc: "图标列表[{icon,label}]" },
    columns:  { type: "number", default: 2,             desc: "列数", min: 1, max: 6 },
    iconSize: { type: "number", default: 48,            desc: "图标大小(px)", min: 20, max: 120 },
    color:    { type: "string", default: "#6ee7ff",     desc: "强调色" },
    stagger:  { type: "number", default: 0.06,          desc: "入场延迟(0~0.2)" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center;padding:6% 8%");
    const items = normalizeArray(params.items, DEFAULT_ITEMS);
    const columns = toNumber(params.columns, 2);
    const iconSize = toNumber(params.iconSize, 48);
    const color = params.color || "#6ee7ff";
    const stagger = toNumber(params.stagger, 0.06);

    const grid = createNode("div", [
      "display:grid",
      `grid-template-columns:repeat(${columns}, 1fr)`,
      "gap:32px",
      "max-width:600px",
      "width:100%",
    ].join(";"));

    const cellEls = items.map((item) => {
      const cell = createNode("div", [
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "gap:12px",
        "will-change:transform,opacity",
        "opacity:0",
        "transform:scale(0)",
      ].join(";"));

      const iconBg = createNode("div", [
        `width:${iconSize * 1.6}px`,
        `height:${iconSize * 1.6}px`,
        "border-radius:16px",
        `background:${color}15`,
        `border:1px solid ${color}33`,
        "display:flex",
        "align-items:center",
        "justify-content:center",
      ].join(";"));

      const iconEl = createNode("span", [
        `font-size:${iconSize}px`,
        "line-height:1",
      ].join(";"), String(item.icon || "\u2B50"));
      iconBg.appendChild(iconEl);

      const label = createNode("div", [
        `font-family:${SANS_FONT_STACK}`,
        "font-size:16px",
        "font-weight:600",
        "color:#e2e8f0",
        "text-align:center",
      ].join(";"), String(item.label || ""));

      cell.appendChild(iconBg);
      cell.appendChild(label);
      grid.appendChild(cell);

      return cell;
    });

    root.appendChild(grid);

    return { root, cellEls, stagger };
  },

  update(els, localT) {
    const enterT = smoothstep(0, 0.06, localT);
    const exitT = 1 - smoothstep(0.88, 1, localT);
    els.root.style.opacity = String(enterT * exitT);

    const total = els.cellEls.length;
    for (let i = 0; i < total; i++) {
      const start = 0.08 + i * els.stagger;
      const end = start + 0.25;
      const t = smoothstep(start, end, localT);
      els.cellEls[i].style.opacity = String(t);
      els.cellEls[i].style.transform = `scale(${t})`;
    }
  },

  destroy(els) { els.root.remove(); },
};
