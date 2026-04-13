import { toNumber, clamp, smoothstep } from "../scenes-v2-shared.js";

export default {
  id: "circleRipple",
  type: "canvas",
  name: "Circle Ripple",
  category: "Effects",
  tags: ["ripple", "circle", "pulse", "wave", "effect", "ambient", "loop"],
  description: "同心圆波纹向外扩散，循环播放，可自定义颜色和速度，适合强调中心元素",
  params: {
    count:       { type: "number", default: 5,        desc: "同时存在的波纹数量", min: 1, max: 20 },
    speed:       { type: "number", default: 1,        desc: "扩散速度倍数", min: 0.1, max: 5 },
    color:       { type: "string", default: "#7c6ef0", desc: "波纹颜色" },
    strokeWidth: { type: "number", default: 2,        desc: "线宽(px)", min: 0.5, max: 10 },
    maxRadius:   { type: "number", default: 0.8,      desc: "最大半径（相对于画面短边的比例）", min: 0.1, max: 1.5 },
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
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const count = clamp(toNumber(params.count, 5), 1, 20) | 0;
    const speed = toNumber(params.speed, 1);
    const color = params.color || "#7c6ef0";
    const strokeWidth = clamp(toNumber(params.strokeWidth, 2), 0.5, 10);
    const maxRadiusFrac = clamp(toNumber(params.maxRadius, 0.8), 0.2, 1.5);
    const maxRadius = maxRadiusFrac * Math.min(W, H) / 2;

    ctx.clearRect(0, 0, W, H);

    // Each ring has a staggered phase; cycle period = count spacing

    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;

    for (let i = 0; i < count; i++) {
      // Progress 0..1 for this ring, looping
      const phase = ((localT * speed * 0.3) - i * (1 / count)) % 1;
      const p = phase < 0 ? phase + 1 : phase;

      const radius = p * maxRadius;
      // Fade in quickly, fade out at the edge
      const alpha = smoothstep(0, 0.1, p) * smoothstep(1, 0.7, p);

      if (alpha < 0.01) continue;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  },

  destroy(canvas) {
    canvas.remove();
  },
};
