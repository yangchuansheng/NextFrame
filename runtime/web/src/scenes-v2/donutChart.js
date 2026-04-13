import { clamp, easeOutCubic, toNumber, normalizeArray } from "../scenes-v2-shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT = '-apple-system, "SF Pro Display", sans-serif';
const PALETTE = ["#6ee7ff", "#a78bfa", "#f472b6", "#fb923c", "#4ade80", "#fbbf24"];

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = (a) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const start = s(startAngle);
  const end = s(endAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export default {
  id: "donutChart",
  type: "svg",
  name: "Donut Chart",
  category: "Data Viz",
  tags: ["chart", "donut", "ring", "data", "visualization", "pie"],
  description: "甜甜圈环形图，中间显示数字或文字，扇区顺序展开入场",
  params: {
    data:       { type: "array",  default: [35, 25, 20, 15, 5],                          desc: "数据值数组" },
    labels:     { type: "array",  default: ["Design", "Dev", "Marketing", "Sales", "HR"], desc: "标签数组" },
    colors:     { type: "array",  default: PALETTE,                                       desc: "颜色数组" },
    innerLabel: { type: "string", default: "Total",                                       desc: "中心标签" },
    innerValue: { type: "string", default: "100",                                         desc: "中心数值" },
    thickness:  { type: "number", default: 60,                                            desc: "环宽(px)", min: 20, max: 120 },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const svg = svgEl("svg", {
      viewBox: "0 0 1920 1080",
      style: "position:absolute;inset:0;width:100%;height:100%",
    });
    container.appendChild(svg);

    const data = normalizeArray(params.data, [35, 25, 20, 15, 5]);
    const labels = normalizeArray(params.labels, []);
    const colors = normalizeArray(params.colors, PALETTE);
    const thickness = toNumber(params.thickness, 60);

    const cx = 960, cy = 540, outerR = 280;
    const total = data.reduce((s, v) => s + toNumber(v, 0), 0) || 1;

    // build arc data
    let angle = -Math.PI / 2;
    const arcs = data.map((val, i) => {
      const sweep = (toNumber(val, 0) / total) * Math.PI * 2;
      const startAngle = angle;
      angle += sweep;
      return { startAngle, endAngle: angle, color: colors[i % colors.length], label: labels[i] || "" };
    });

    const paths = arcs.map((arc) => {
      const path = svgEl("path", {
        d: describeArc(cx, cy, outerR, arc.startAngle, arc.startAngle),
        fill: "none",
        stroke: arc.color,
        "stroke-width": String(thickness),
        "stroke-linecap": "butt",
        opacity: "0.9",
      });
      svg.appendChild(path);
      return { path, startAngle: arc.startAngle, endAngle: arc.endAngle };
    });

    // center text
    const valText = svgEl("text", {
      x: String(cx), y: String(cy - 10),
      fill: "rgba(255,255,255,0.9)", "font-size": "64", "font-weight": "800",
      "font-family": FONT, "text-anchor": "middle", "dominant-baseline": "auto",
      opacity: "0",
    });
    valText.textContent = params.innerValue || "100";
    svg.appendChild(valText);

    const lblText = svgEl("text", {
      x: String(cx), y: String(cy + 35),
      fill: "rgba(255,255,255,0.5)", "font-size": "24",
      "font-family": FONT, "text-anchor": "middle",
      opacity: "0",
    });
    lblText.textContent = params.innerLabel || "Total";
    svg.appendChild(lblText);

    // legend
    const legendItems = arcs.map((arc, i) => {
      const ly = 300 + i * 40;
      const rect = svgEl("rect", { x: "1450", y: String(ly), width: "18", height: "18", rx: "3", fill: arc.color, opacity: "0" });
      svg.appendChild(rect);
      const txt = svgEl("text", { x: "1480", y: String(ly + 14), fill: "rgba(255,255,255,0.6)", "font-size": "18", "font-family": FONT, opacity: "0" });
      txt.textContent = arc.label;
      svg.appendChild(txt);
      return { rect, txt };
    });

    return { svg, paths, valText, lblText, legendItems, cx, cy, outerR };
  },

  update(els, localT) {
    const totalDur = 0.7;
    const arcT = easeOutCubic(clamp(localT / totalDur, 0, 1));

    els.paths.forEach((p) => {
      const currentEnd = p.startAngle + (p.endAngle - p.startAngle) * arcT;
      const clamped = Math.max(currentEnd, p.startAngle + 0.001);
      p.path.setAttribute("d", describeArc(els.cx, els.cy, els.outerR, p.startAngle, clamped));
    });

    // center text fades in after arcs start
    const centerT = clamp((localT - 0.3) / 0.3, 0, 1);
    els.valText.setAttribute("opacity", String(centerT));
    els.lblText.setAttribute("opacity", String(centerT * 0.7));

    // legend stagger
    els.legendItems.forEach((item, i) => {
      const lt = clamp((localT - 0.4 - i * 0.06) / 0.3, 0, 1);
      item.rect.setAttribute("opacity", String(lt));
      item.txt.setAttribute("opacity", String(lt * 0.8));
    });
  },

  destroy(els) { els.svg.remove(); },
};
