import { toNumber, clamp, normalizeArray, createRoot, SANS_FONT_STACK } from "../scenes-v2-shared.js";

const DEFAULT_COLORS = ["#ff6b6b", "#ffd93d", "#6ee7ff"];

export default {
  id: "gradientText",
  type: "dom",
  name: "Gradient Text",
  category: "Typography",
  tags: ["text", "gradient", "animated", "typography", "color", "heading"],
  description: "文字带动态渐变效果，渐变色随时间平滑滚动，支持自定义颜色、角度和速度",
  params: {
    text:     { type: "string", default: "HELLO",                  desc: "文字" },
    fontSize: { type: "number", default: 96,                       desc: "字号", min: 24, max: 400 },
    colors:   { type: "array",  default: DEFAULT_COLORS,           desc: "渐变色" },
    speed:    { type: "number", default: 1,                        desc: "渐变滚动速度", min: 0, max: 10 },
    angle:    { type: "number", default: 135,                      desc: "渐变角度", min: 0, max: 360 },
    weight:   { type: "number", default: 900,                      desc: "字重", min: 100, max: 900 },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");

    const text = String(params.text || "HELLO");
    const fontSize = clamp(toNumber(params.fontSize, 96), 24, 400);
    const colors = normalizeArray(params.colors, DEFAULT_COLORS);
    const angle = toNumber(params.angle, 135);
    const weight = toNumber(params.weight, 900);

    const gradColors = colors.length > 0 ? colors : DEFAULT_COLORS;
    // duplicate colors for seamless scroll
    const gradStr = [...gradColors, ...gradColors].join(", ");

    const el = document.createElement("span");
    el.textContent = text;
    el.style.cssText = [
      `font-family:${SANS_FONT_STACK}`,
      `font-size:${fontSize}px`,
      `font-weight:${weight}`,
      "letter-spacing:-0.02em",
      "white-space:nowrap",
      `background:linear-gradient(${angle}deg, ${gradStr})`,
      "background-size:200% 200%",
      "-webkit-background-clip:text",
      "-webkit-text-fill-color:transparent",
      "background-clip:text",
      "will-change:background-position",
    ].join(";");

    root.appendChild(el);
    return { root, el };
  },

  update(els, localT, params) {
    const speed = toNumber(params.speed, 1);
    const offset = (localT * speed * 50) % 200;
    els.el.style.backgroundPosition = `${offset}% 50%`;
  },

  destroy(els) { els.root.remove(); },
};
