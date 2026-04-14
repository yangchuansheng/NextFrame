// Portrait bullet list component with left-aligned rows and staggered slide-in animation.
import {
  createRoot, createNode, smoothstep,
  toNumber, normalizeArray, SANS_FONT_STACK, makeDescribeResult,
} from '../core/shared/index.js';

export default {
  id: "bulletList_portrait",
  type: "dom",
  name: "Bullet List (9:16)",
  category: "Typography",
  ratio: "9:16",
  tags: ["list", "bullet", "portrait"],
  description: "竖屏要点列表，左对齐，逐条动画。1080x1920 专用",
  params: {
    items:       { type: "array", required: true, default: ["Point A", "Point B", "Point C"], desc: "要点数组" },
    fontSize:    { type: "number", required: false, default: 28, desc: "字号(px)" },
    bulletColor: { type: "color", required: false, default: "#a0c4ff", desc: "圆点颜色" },
    stagger:     { type: "number", required: false, default: 0.12, desc: "逐条延迟(秒)" },
  },

  get defaultParams() {
    const d = {};
    for (const [k, v] of Object.entries(this.params)) d[k] = v.default;
    return d;
  },

  create(container, params) {
    const p = { ...this.defaultParams, ...params };
    const root = createRoot(container, "display:flex;flex-direction:column;align-items:flex-start;justify-content:center;width:1080px;height:1920px;padding:0 80px");

    const items = normalizeArray(p.items, ["Point A", "Point B", "Point C"]);
    const fontSize = toNumber(p.fontSize, 28);
    const bulletColor = p.bulletColor || "#a0c4ff";
    const rows = [];

    for (const item of items) {
      const row = createNode("div", `
        display:flex;align-items:flex-start;gap:16px;
        font-family:${SANS_FONT_STACK};font-size:${fontSize}px;font-weight:500;
        color:rgba(255,255,255,0.95);line-height:1.5;
        margin-bottom:32px;opacity:0;transform:translateX(-20px);
      `);
      const bullet = createNode("span", `
        display:inline-block;width:10px;height:10px;min-width:10px;
        border-radius:50%;background:${bulletColor};
        margin-top:${Math.round(fontSize * 0.45)}px;
      `);
      const text = createNode("span", "", String(item));
      row.appendChild(bullet);
      row.appendChild(text);
      root.appendChild(row);
      rows.push(row);
    }

    return { root, rows, stagger: toNumber(p.stagger, 0.12) };
  },

  update(els, localT) {
    const { rows, stagger } = els;
    for (let i = 0; i < rows.length; i++) {
      const t = smoothstep(i * stagger, i * stagger + 0.4, localT);
      rows[i].style.opacity = t;
      rows[i].style.transform = `translateX(${(1 - t) * -20}px)`;
    }
  },

  describe(data, props, t = 0) {
    const p = { ...this.defaultParams, ...(data || {}), ...(props || {}) };
    const items = normalizeArray(p.items, ["Point A", "Point B", "Point C"]);
    const stagger = toNumber(p.stagger, 0.12);

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
