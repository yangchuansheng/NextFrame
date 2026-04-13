import { createRoot, createNode, clamp, easeOutCubic, smoothstep, toNumber, normalizeArray, SANS_FONT_STACK } from "../scenes-v2-shared.js";

export default {
  id: "statsRow",
  type: "dom",
  name: "Stats Row",
  category: "Numbers",
  tags: ["stats", "numbers", "counter", "data", "dashboard", "KPI"],
  description: "横排统计数字，3-5 个大数字并排展示，数字从零滚动到目标值",
  params: {
    stats: { type: "array", default: [{value:1234,label:"Users",prefix:"",suffix:"K",color:"#6ee7ff"},{value:98,label:"Uptime",prefix:"",suffix:"%",color:"#4ade80"},{value:52,label:"Revenue",prefix:"$",suffix:"M",color:"#a78bfa"},{value:3.2,label:"Rating",prefix:"",suffix:"/5",color:"#fbbf24"}], desc: "统计项数组 [{value,label,prefix,suffix,color}]" },
    gap:   { type: "number", default: 80, desc: "项目间距(px)", min: 20, max: 200 },
    size:  { type: "number", default: 64, desc: "数字字号(px)", min: 24, max: 120 },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");
    const stats = normalizeArray(params.stats, this.params.stats.default);
    const gap = toNumber(params.gap, 80);
    const size = toNumber(params.size, 64);

    const row = createNode("div", [
      "display:flex",
      "align-items:flex-start",
      "justify-content:center",
      `gap:${gap}px`,
      "flex-wrap:wrap",
    ].join(";"));

    const items = stats.map((s) => {
      const color = s.color || "#6ee7ff";
      const col = createNode("div", [
        "display:flex",
        "flex-direction:column",
        "align-items:center",
        "opacity:0",
        "will-change:transform,opacity",
        "transform:translateY(20px)",
      ].join(";"));

      const numRow = createNode("div", "display:flex;align-items:baseline;gap:2px");

      const prefix = createNode("span", [
        `font-family:${SANS_FONT_STACK}`,
        `font-size:${size * 0.5}px`,
        "font-weight:300",
        `color:${color}`,
      ].join(";"), s.prefix || "");

      const digits = createNode("span", [
        `font-family:${SANS_FONT_STACK}`,
        `font-size:${size}px`,
        "font-weight:900",
        `color:${color}`,
        "letter-spacing:-0.02em",
        `text-shadow:0 0 30px ${color}44`,
        "font-variant-numeric:tabular-nums",
      ].join(";"), "0");

      const suffix = createNode("span", [
        `font-family:${SANS_FONT_STACK}`,
        `font-size:${size * 0.45}px`,
        "font-weight:400",
        `color:${color}`,
        "opacity:0.7",
        "margin-left:2px",
      ].join(";"), s.suffix || "");

      numRow.appendChild(prefix);
      numRow.appendChild(digits);
      numRow.appendChild(suffix);

      const label = createNode("div", [
        `font-family:${SANS_FONT_STACK}`,
        "font-size:14px",
        "font-weight:500",
        "color:rgba(255,255,255,0.45)",
        "letter-spacing:0.12em",
        "text-transform:uppercase",
        "margin-top:8px",
      ].join(";"), s.label || "");

      col.appendChild(numRow);
      col.appendChild(label);
      row.appendChild(col);

      const targetValue = toNumber(s.value, 0);
      const isFloat = targetValue !== Math.floor(targetValue);

      return { col, digits, targetValue, isFloat };
    });

    root.appendChild(row);
    return { root, items };
  },

  update(els, localT) {
    const staggerDelay = 0.12;
    const dur = 0.6;

    els.items.forEach((item, i) => {
      const start = i * staggerDelay;
      const enterT = clamp((localT - start) / 0.3, 0, 1);
      const countT = easeOutCubic(clamp((localT - start) / dur, 0, 1));

      item.col.style.opacity = String(enterT);
      item.col.style.transform = `translateY(${20 * (1 - enterT)}px)`;

      const current = item.targetValue * countT;
      if (item.isFloat) {
        item.digits.textContent = current.toFixed(1);
      } else {
        item.digits.textContent = Math.round(current).toLocaleString();
      }
    });
  },

  destroy(els) { els.root.remove(); },
};
