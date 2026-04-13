import { toNumber, clamp } from "../scenes-v2-shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const PRESETS = {
  checkmark:  ["M4 12 L10 18 L20 6"],
  arrow:      ["M4 12 L18 12", "M13 6 L19 12 L13 18"],
  circle:     ["M12 2 A10 10 0 1 1 11.99 2"],
  star:       ["M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"],
  box:        ["M4 4 L20 4 L20 20 L4 20 Z"],
  underline:  ["M3 18 Q12 14 21 18"],
  zigzag:     ["M2 12 L6 6 L10 18 L14 6 L18 18 L22 12"],
};

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) { for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); }
  return el;
}

export default {
  id: "hand-draw",
  type: "svg",
  name: "Hand Draw",
  category: "Effects",
  tags: ["draw", "hand-drawn", "stroke", "animation", "path", "sketch"],
  description: "SVG 路径手绘动画，线条逐步描绘出形状，支持多种预设和动画方式",
  params: {
    preset:      { type: "string", default: "checkmark", desc: "预设形状" },
    color:       { type: "string", default: "#6ee7ff",   desc: "颜色" },
    strokeWidth: { type: "number", default: 3,           desc: "线宽", min: 1, max: 10 },
    style:       { type: "string", default: "oneByOne",  desc: "动画方式:oneByOne/delayed/sync" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const svg = svgEl("svg", {
      viewBox: "0 0 24 24",
      style: "position:absolute;inset:0;width:100%;height:100%;display:block",
      preserveAspectRatio: "xMidYMid meet",
    });
    container.appendChild(svg);

    const presetName = String(params.preset || "checkmark");
    const pathDefs = PRESETS[presetName] || PRESETS["checkmark"];
    const color = params.color || "#6ee7ff";
    const sw = toNumber(params.strokeWidth, 3);

    const paths = pathDefs.map((d) => {
      const path = svgEl("path", {
        d,
        fill: "none",
        stroke: color,
        "stroke-width": String(sw),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      });
      svg.appendChild(path);
      const len = path.getTotalLength ? path.getTotalLength() : 100;
      path.setAttribute("stroke-dasharray", String(len));
      path.setAttribute("stroke-dashoffset", String(len));
      return { el: path, len };
    });

    return { svg, paths };
  },

  update(els, localT, params) {
    const style = String(params.style || "oneByOne");
    const duration = 2.5;
    const t = clamp(localT / duration, 0, 1);
    const count = els.paths.length;

    els.paths.forEach((p, i) => {
      let progress = 0;
      if (style === "sync") {
        progress = t;
      } else if (style === "delayed") {
        const delay = i * 0.15;
        progress = clamp((t - delay) / (1 - delay * count + delay), 0, 1);
      } else {
        // oneByOne
        const segDur = 1 / count;
        const segStart = i * segDur;
        progress = clamp((t - segStart) / segDur, 0, 1);
      }
      // ease out
      const eased = 1 - ((1 - progress) ** 2);
      p.el.setAttribute("stroke-dashoffset", String(p.len * (1 - eased)));
    });
  },

  destroy(els) { els.svg.remove(); },
};
