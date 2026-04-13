import { toNumber, clamp } from "../scenes-v2-shared.js";

export default {
  id: "particleFlow",
  type: "canvas",
  name: "Particle Flow",
  category: "Effects",
  tags: ["粒子流", "粒子效果", "背景", "动态背景", "流动", "光点"],
  description: "发光粒子沿指定方向流动的动态背景效果，支持边界环绕",
  params: {
    count:     { type: "number", default: 150, min: 10, max: 1000, desc: "粒子数量" },
    speed:     { type: "number", default: 1,   min: 0,  max: 10,   desc: "流动速度倍数" },
    color:     { type: "color",  default: "#6ea8fe",               desc: "粒子颜色" },
    size:      { type: "number", default: 2,   min: 0.5, max: 10,  desc: "粒子基础半径(px)" },
    direction: { type: "number", default: 0,   min: 0,  max: 360,  desc: "流动方向（角度，0为向右）" },
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

    const count = clamp(toNumber(params.count, 150), 10, 1000) | 0;
    const particles = new Float64Array(count * 4); // x, y, speed_mult, size_mult
    let seed = 137;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < count; i++) {
      particles[i * 4] = rng();       // x position 0..1
      particles[i * 4 + 1] = rng();   // y position 0..1
      particles[i * 4 + 2] = 0.3 + rng() * 0.7; // speed multiplier
      particles[i * 4 + 3] = 0.4 + rng() * 0.6; // size multiplier
    }
    canvas._data = { particles, count };
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

    const speed = toNumber(params.speed, 1);
    const color = params.color || "#6ea8fe";
    const size = clamp(toNumber(params.size, 2), 0.5, 10);
    const angle = toNumber(params.direction, 0) * Math.PI / 180;

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    ctx.clearRect(0, 0, W, H);

    const { particles, count } = canvas._data;
    const t = localT * speed * 0.05;

    for (let i = 0; i < count; i++) {
      const ox = particles[i * 4];
      const oy = particles[i * 4 + 1];
      const sm = particles[i * 4 + 2];
      const szm = particles[i * 4 + 3];

      // Flow along direction, wrap around
      let px = (ox + t * sm * dx) % 1;
      let py = (oy + t * sm * dy) % 1;
      if (px < 0) px += 1;
      if (py < 0) py += 1;

      const x = px * W;
      const y = py * H;
      const r = size * szm;

      // Glow effect: larger transparent circle + solid core
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      grad.addColorStop(0, color);
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, "transparent");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  destroy(canvas) {
    canvas._data = null;
    canvas.remove();
  },
};
