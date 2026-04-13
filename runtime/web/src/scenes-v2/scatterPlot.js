import { clamp, easeOutBack, toNumber, normalizeArray } from "../scenes-v2-shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT = '-apple-system, "SF Pro Display", sans-serif';
const PALETTE = ["#6ee7ff", "#a78bfa", "#f472b6", "#fb923c", "#4ade80", "#fbbf24"];

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export default {
  id: "scatterPlot",
  type: "svg",
  name: "Scatter Plot",
  category: "Data Viz",
  tags: ["chart", "scatter", "data", "visualization", "dots", "graph"],
  description: "散点图，多个数据点带大小和颜色映射，入场时点从中心向外弹出",
  params: {
    data:      { type: "array",  default: [{x:20,y:80,size:8,color:"#6ee7ff"},{x:40,y:55,size:12,color:"#a78bfa"},{x:60,y:70,size:6,color:"#f472b6"},{x:30,y:35,size:10,color:"#fb923c"},{x:75,y:90,size:14,color:"#4ade80"},{x:50,y:45,size:9,color:"#fbbf24"},{x:85,y:60,size:7,color:"#6ee7ff"},{x:15,y:25,size:11,color:"#a78bfa"}], desc: "数据点数组 [{x,y,size,color}]" },
    xLabel:    { type: "string", default: "X Axis",   desc: "X 轴标签" },
    yLabel:    { type: "string", default: "Y Axis",   desc: "Y 轴标签" },
    dotSize:   { type: "number", default: 1,           desc: "点大小倍数", min: 0.5, max: 3 },
    gridColor: { type: "string", default: "rgba(255,255,255,0.08)", desc: "网格线颜色" },
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

    const data = normalizeArray(params.data, this.params.data.default);
    const dotSize = toNumber(params.dotSize, 1);
    const gridColor = params.gridColor || "rgba(255,255,255,0.08)";

    const padL = 180, padR = 120, padT = 100, padB = 140;
    const chartW = 1920 - padL - padR;
    const chartH = 1080 - padT - padB;

    // grid
    for (let i = 0; i <= 5; i++) {
      const y = padT + (chartH / 5) * i;
      svg.appendChild(svgEl("line", { x1: String(padL), y1: String(y), x2: String(1920 - padR), y2: String(y), stroke: gridColor, "stroke-width": "1" }));
      const x = padL + (chartW / 5) * i;
      svg.appendChild(svgEl("line", { x1: String(x), y1: String(padT), x2: String(x), y2: String(padT + chartH), stroke: gridColor, "stroke-width": "1" }));
    }

    // axes
    svg.appendChild(svgEl("line", { x1: String(padL), y1: String(padT + chartH), x2: String(1920 - padR), y2: String(padT + chartH), stroke: "rgba(255,255,255,0.2)", "stroke-width": "2" }));
    svg.appendChild(svgEl("line", { x1: String(padL), y1: String(padT), x2: String(padL), y2: String(padT + chartH), stroke: "rgba(255,255,255,0.2)", "stroke-width": "2" }));

    // axis labels
    const xLbl = svgEl("text", { x: String(padL + chartW / 2), y: String(padT + chartH + 60), fill: "rgba(255,255,255,0.5)", "font-size": "22", "font-family": FONT, "text-anchor": "middle" });
    xLbl.textContent = params.xLabel || "X Axis";
    svg.appendChild(xLbl);

    const yLbl = svgEl("text", { x: String(padL - 60), y: String(padT + chartH / 2), fill: "rgba(255,255,255,0.5)", "font-size": "22", "font-family": FONT, "text-anchor": "middle", transform: `rotate(-90, ${padL - 60}, ${padT + chartH / 2})` });
    yLbl.textContent = params.yLabel || "Y Axis";
    svg.appendChild(yLbl);

    const cx = padL + chartW / 2;
    const cy = padT + chartH / 2;

    const dots = data.map((d) => {
      const tx = padL + (toNumber(d.x, 50) / 100) * chartW;
      const ty = padT + chartH - (toNumber(d.y, 50) / 100) * chartH;
      const r = toNumber(d.size, 8) * dotSize;
      const color = d.color || PALETTE[0];

      const circle = svgEl("circle", {
        cx: String(cx), cy: String(cy), r: "0",
        fill: color, opacity: "0.85",
      });
      svg.appendChild(circle);
      return { circle, tx, ty, r, cx, cy };
    });

    return { svg, dots };
  },

  update(els, localT) {
    const stagger = 0.06;
    const dur = 0.7;

    els.dots.forEach((d, i) => {
      const start = i * stagger;
      const raw = clamp((localT - start) / dur, 0, 1);
      const t = raw > 0 ? easeOutBack(raw) : 0;
      const clamped = clamp(t, 0, 1.15);

      const x = d.cx + (d.tx - d.cx) * clamped;
      const y = d.cy + (d.ty - d.cy) * clamped;
      const r = d.r * clamp(t, 0, 1);

      d.circle.setAttribute("cx", String(x));
      d.circle.setAttribute("cy", String(y));
      d.circle.setAttribute("r", String(Math.max(0, r)));
    });
  },

  destroy(els) { els.svg.remove(); },
};
