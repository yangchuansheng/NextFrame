// 16:9 bullet list component with left-aligned rows and staggered slide-in animation.
import {
  createRoot, createNode, smoothstep, easeOutCubic,
  toNumber, normalizeArray, SANS_FONT_STACK, makeDescribeResult,
} from '../core/shared/index.js';

export default {
  id: "bulletList",
  type: "dom",
  name: "Bullet List (16:9)",
  category: "Typography",
  ratio: "16:9",
  tags: ["list", "bullet", "text"],
  description: "左对齐要点列表，逐条滑入。1920x1080 专用",
  params: {
    items:       { type: "array", required: true, default: ["Point one", "Point two", "Point three"], desc: "列表项数组" },
    fontSize:    { type: "number", required: false, default: 28, desc: "字号(px)" },
    bulletColor: { type: "color", required: false, default: "#60a5fa", desc: "圆点颜色" },
    stagger:     { type: "number", required: false, default: 0.1, desc: "逐条延迟(秒)" },
  },

  get defaultParams() {
    const d = {};
    for (const [k, v] of Object.entries(this.params)) d[k] = v.default;
    return d;
  },

  create(container, params) {
    const p = { ...this.defaultParams, ...params };
    const root = createRoot(container, "display:flex;flex-direction:column;justify-content:center;width:1920px;height:1080px;padding-left:200px");

    const items = normalizeArray(p.items, ["Point one", "Point two", "Point three"]);
    const fontSize = toNumber(p.fontSize, 28);
    const bulletColor = p.bulletColor || "#60a5fa";
    const rows = [];

    for (const text of items) {
      const row = createNode("div", `
        display:flex;align-items:center;gap:16px;
        margin-bottom:24px;opacity:0;transform:translateX(-40px);
      `);
      const dot = createNode("span", `
        width:12px;height:12px;border-radius:50%;flex-shrink:0;
        background:${bulletColor};
      `);
      const label = createNode("span", `
        font-family:${SANS_FONT_STACK};font-size:${fontSize}px;
        color:rgba(255,255,255,0.9);line-height:1.5;
      `, text);
      row.appendChild(dot);
      row.appendChild(label);
      root.appendChild(row);
      rows.push(row);
    }

    return { root, rows, stagger: toNumber(p.stagger, 0.1) };
  },

  update(els, localT) {
    const { rows, stagger } = els;
    for (let i = 0; i < rows.length; i++) {
      const t = smoothstep(i * stagger, i * stagger + 0.4, localT);
      rows[i].style.opacity = t;
      rows[i].style.transform = `translateX(${(1 - t) * -40}px)`;
    }
  },

  describe(data, props, t = 0) {
    const p = { ...this.defaultParams, ...(data || {}), ...(props || {}) };
    const items = normalizeArray(p.items, ["Point one", "Point two", "Point three"]);
    const stagger = toNumber(p.stagger, 0.1);

    return makeDescribeResult({
      t,
      duration: 0.4 + Math.max(0, items.length - 1) * stagger,
      elements: items.map((item) => ({
        type: "bullet",
        text: String(item),
      })),
      textContent: items,
    });
  },

  destroy(els) {
    els.root.remove();
  },
};
