import { clamp, toNumber } from "../scenes-v2-shared.js";

export default {
  id: "gridPattern",
  type: "canvas",
  name: "Grid Pattern",
  category: "Backgrounds",
  tags: ["grid", "pattern", "background", "dots", "lines", "decoration"],
  description: "装饰性网格图案背景，支持圆点/网格线/十字/斜线四种模式，可选漂移动画",
  params: {
    pattern: { type: "string",  default: "dots",                desc: "图案类型: dots/lines/cross/diagonal" },
    spacing: { type: "number",  default: 40,                    desc: "网格间距(px)", min: 10, max: 200 },
    color:   { type: "string",  default: "rgba(255,255,255,0.15)", desc: "图案颜色" },
    size:    { type: "number",  default: 2,                     desc: "点/线大小(px)", min: 0.5, max: 10 },
    opacity: { type: "number",  default: 1,                     desc: "整体不透明度", min: 0, max: 1 },
    animate: { type: "boolean", default: true,                  desc: "是否启用漂移动画" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    canvas.width = container.clientWidth || 1920;
    canvas.height = container.clientHeight || 1080;
    container.appendChild(canvas);

    canvas._data = {};
    return canvas;
  },

  update(canvas, localT, params) {
    const ctx = canvas.getContext("2d");
    const cw = canvas.parentElement?.clientWidth || canvas.width;
    const ch = canvas.parentElement?.clientHeight || canvas.height;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const spacing = clamp(toNumber(params.spacing, 40), 10, 200);
    const color = params.color || "rgba(255,255,255,0.15)";
    const size = clamp(toNumber(params.size, 2), 0.5, 10);
    const opacity = clamp(toNumber(params.opacity, 1), 0, 1);
    const animate = params.animate !== false;
    const pattern = params.pattern || "dots";

    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = opacity;

    // drift offset
    const ox = animate ? (localT * 8) % spacing : 0;
    const oy = animate ? (localT * 5) % spacing : 0;

    const cols = Math.ceil(cw / spacing) + 2;
    const rows = Math.ceil(ch / spacing) + 2;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;

    if (pattern === "dots") {
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const x = c * spacing + ox;
          const y = r * spacing + oy;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === "lines") {
      ctx.beginPath();
      for (let c = -1; c < cols; c++) {
        const x = c * spacing + ox;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
      }
      for (let r = -1; r < rows; r++) {
        const y = r * spacing + oy;
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
      }
      ctx.stroke();
    } else if (pattern === "cross") {
      const arm = spacing * 0.2;
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const x = c * spacing + ox;
          const y = r * spacing + oy;
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();
        }
      }
    } else if (pattern === "diagonal") {
      ctx.beginPath();
      const diagSpacing = spacing * 1.414;
      const diagCount = Math.ceil((cw + ch) / diagSpacing) + 2;
      for (let i = -diagCount; i < diagCount; i++) {
        const offset = i * diagSpacing + (animate ? (localT * 10) % diagSpacing : 0);
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset - ch, ch);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  },

  destroy(canvas) {
    canvas._data = null;
    canvas.remove();
  },
};
