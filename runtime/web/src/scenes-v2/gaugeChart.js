import { clamp, easeOutCubic, toNumber, normalizeArray } from "../scenes-v2-shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT = '-apple-system, "SF Pro Display", sans-serif';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function polarToCart(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 180) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const s = polarToCart(cx, cy, r, startDeg);
  const e = polarToCart(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default {
  id: "gaugeChart",
  type: "svg",
  name: "Gauge Chart",
  category: "Numbers",
  tags: ["gauge", "meter", "speedometer", "number", "progress", "dashboard"],
  description: "半圆仪表盘，指针动画从零扫到目标值，支持彩色区段",
  params: {
    value:    { type: "number", default: 72,                                desc: "当前值", min: 0 },
    maxValue: { type: "number", default: 100,                               desc: "最大值", min: 1 },
    label:    { type: "string", default: "Performance",                     desc: "底部标签" },
    color:    { type: "string", default: "#6ee7ff",                         desc: "主色" },
    unit:     { type: "string", default: "%",                               desc: "单位" },
    zones:    { type: "array",  default: [{from:0,to:40,color:"#4ade80"},{from:40,to:70,color:"#fbbf24"},{from:70,to:100,color:"#f472b6"}], desc: "彩色区段 [{from,to,color}]" },
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

    const cx = 960, cy = 620, radius = 340;
    const maxVal = toNumber(params.maxValue, 100);
    const zones = normalizeArray(params.zones, []);

    // zone arcs (background)
    zones.forEach((z) => {
      const startDeg = (toNumber(z.from, 0) / maxVal) * 180;
      const endDeg = (toNumber(z.to, maxVal) / maxVal) * 180;
      const arc = svgEl("path", {
        d: describeArc(cx, cy, radius, startDeg, endDeg),
        fill: "none",
        stroke: z.color || "#444",
        "stroke-width": "28",
        "stroke-linecap": "butt",
        opacity: "0.2",
      });
      svg.appendChild(arc);
    });

    // track arc (bg)
    const trackArc = svgEl("path", {
      d: describeArc(cx, cy, radius, 0, 180),
      fill: "none",
      stroke: "rgba(255,255,255,0.06)",
      "stroke-width": "28",
      "stroke-linecap": "round",
    });
    svg.appendChild(trackArc);

    // value arc
    const valueArc = svgEl("path", {
      d: describeArc(cx, cy, radius, 0, 0.1),
      fill: "none",
      stroke: params.color || "#6ee7ff",
      "stroke-width": "28",
      "stroke-linecap": "round",
      opacity: "0.9",
    });
    svg.appendChild(valueArc);

    // needle
    const needle = svgEl("line", {
      x1: String(cx), y1: String(cy),
      x2: String(cx - radius + 40), y2: String(cy),
      stroke: "rgba(255,255,255,0.9)", "stroke-width": "4",
      "stroke-linecap": "round",
    });
    svg.appendChild(needle);

    // center dot
    svg.appendChild(svgEl("circle", { cx: String(cx), cy: String(cy), r: "12", fill: params.color || "#6ee7ff" }));

    // value text
    const valText = svgEl("text", {
      x: String(cx), y: String(cy - 60),
      fill: "rgba(255,255,255,0.9)", "font-size": "80", "font-weight": "800",
      "font-family": FONT, "text-anchor": "middle", opacity: "0",
    });
    valText.textContent = "0";
    svg.appendChild(valText);

    // unit text
    const unitText = svgEl("text", {
      x: String(cx + 80), y: String(cy - 60),
      fill: "rgba(255,255,255,0.4)", "font-size": "32",
      "font-family": FONT, "text-anchor": "start", opacity: "0",
    });
    unitText.textContent = params.unit || "%";
    svg.appendChild(unitText);

    // label
    const labelText = svgEl("text", {
      x: String(cx), y: String(cy + 60),
      fill: "rgba(255,255,255,0.5)", "font-size": "26",
      "font-family": FONT, "text-anchor": "middle", "letter-spacing": "0.1em",
    });
    labelText.textContent = params.label || "Performance";
    svg.appendChild(labelText);

    const targetVal = clamp(toNumber(params.value, 72), 0, maxVal);

    return { svg, valueArc, needle, valText, unitText, cx, cy, radius, targetVal, maxVal };
  },

  update(els, localT) {
    const sweepT = easeOutCubic(clamp(localT / 0.8, 0, 1));
    const ratio = (els.targetVal / els.maxVal) * sweepT;
    const deg = ratio * 180;

    // update value arc
    els.valueArc.setAttribute("d", describeArc(els.cx, els.cy, els.radius, 0, Math.max(deg, 0.1)));

    // update needle
    const rad = (deg - 180) * Math.PI / 180;
    const needleLen = els.radius - 40;
    const nx = els.cx + needleLen * Math.cos(rad);
    const ny = els.cy + needleLen * Math.sin(rad);
    els.needle.setAttribute("x2", String(nx));
    els.needle.setAttribute("y2", String(ny));

    // value counter
    const currentVal = Math.round(els.targetVal * sweepT);
    els.valText.textContent = String(currentVal);
    els.valText.setAttribute("opacity", String(clamp(localT / 0.2, 0, 1)));
    els.unitText.setAttribute("opacity", String(clamp(localT / 0.2, 0, 1)));
  },

  destroy(els) { els.svg.remove(); },
};
