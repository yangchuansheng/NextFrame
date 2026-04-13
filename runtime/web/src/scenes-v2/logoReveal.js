import {
  createRoot, createNode, smoothstep, easeOutCubic, toNumber, resolveAssetUrl,
} from "../scenes-v2-shared.js";

export default {
  id: "logoReveal",
  type: "dom",
  name: "Logo Reveal",
  category: "Media",
  tags: ["Logo", "品牌", "图片", "发光", "出场动画", "光扫"],
  description: "带光扫动效和发光效果的 Logo 入场展示组件",
  params: {
    src:       { type: "string", default: "",         desc: "图片资源路径或 URL" },
    size:      { type: "number", default: 200, min: 50, max: 800, desc: "图片尺寸(px)" },
    glowColor: { type: "color",  default: "#6ee7ff",  desc: "光扫效果颜色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");
    const size = toNumber(params.size, 200);
    const glowColor = params.glowColor || "#6ee7ff";

    const wrap = createNode("div", [
      "position:relative",
      `width:${size}px;height:${size}px`,
      "will-change:opacity,transform",
      "opacity:0",
    ].join(";"));

    const img = document.createElement("img");
    img.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;position:relative;z-index:1";
    const resolvedSrc = resolveAssetUrl(params.src);
    if (resolvedSrc) img.src = resolvedSrc;
    wrap.appendChild(img);

    const glow = createNode("div", [
      "position:absolute;top:0;left:-40%;width:30%;height:100%",
      `background:linear-gradient(90deg,transparent,${glowColor}88,transparent)`,
      "will-change:transform;opacity:0;z-index:2",
      "pointer-events:none;filter:blur(8px)",
    ].join(";"));
    wrap.appendChild(glow);

    root.appendChild(wrap);
    return { root, wrap, glow };
  },

  update(els, localT, params) {
    const fadeIn = smoothstep(0, 0.12, localT);
    const fadeOut = 1 - smoothstep(0.85, 1, localT);
    const scale = 0.8 + easeOutCubic(fadeIn) * 0.2;

    els.wrap.style.opacity = fadeIn * fadeOut;
    els.wrap.style.transform = `scale(${scale})`;

    // Glow sweep: active between 0.1 and 0.5
    const sweepT = smoothstep(0.1, 0.5, localT);
    const glowX = -40 + sweepT * 180; // percent
    els.glow.style.opacity = sweepT < 1 ? 0.9 : 0;
    els.glow.style.transform = `translateX(${glowX}%)`;
  },

  destroy(els) { els.root.remove(); },
};
