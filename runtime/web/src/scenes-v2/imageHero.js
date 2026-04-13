import { toNumber, clamp, lerp, resolveAssetUrl } from "../scenes-v2-shared.js";

export default {
  id: "imageHero",
  type: "media",
  name: "Image Hero",
  category: "Media",
  tags: ["image", "photo", "hero", "zoom", "pan", "kenburns", "media"],
  description: "全屏英雄图，支持 Ken Burns 效果（缓慢缩放+平移），适合开场或背景展示",
  params: {
    src:       { type: "string", default: "",     desc: "图片路径或 URL" },
    alt:       { type: "string", default: "",     desc: "图片 alt 文字" },
    objectFit: { type: "string", default: "cover", desc: "填充模式：cover / contain / fill" },
    zoomStart: { type: "number", default: 1,      desc: "起始缩放比例", min: 0.5, max: 2 },
    zoomEnd:   { type: "number", default: 1.15,   desc: "结束缩放比例", min: 0.5, max: 2 },
    panX:      { type: "number", default: 0,      desc: "水平平移距离(px)" },
    panY:      { type: "number", default: 0,      desc: "垂直平移距离(px)" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;overflow:hidden";
    const img = document.createElement("img");
    img.style.cssText = [
      "width:100%;height:100%",
      `object-fit:${params.objectFit || "cover"}`,
      "display:block;will-change:transform",
    ].join(";");
    img.alt = params.alt || "";
    const resolvedSrc = resolveAssetUrl(params.src);
    if (resolvedSrc) img.src = resolvedSrc;
    wrap.appendChild(img);
    container.appendChild(wrap);
    return { wrap, img };
  },

  update(els, localT, params) {
    const duration = toNumber(localT, 0);
    // Normalize to 0-1 over a 10s assumed max, clamped
    const progress = clamp(duration / 10, 0, 1);
    const zoomStart = toNumber(params.zoomStart, 1);
    const zoomEnd = toNumber(params.zoomEnd, 1.15);
    const panX = toNumber(params.panX, 0);
    const panY = toNumber(params.panY, 0);
    const scale = lerp(zoomStart, zoomEnd, progress);
    const tx = panX * progress;
    const ty = panY * progress;
    els.img.style.transform = `scale(${scale}) translate(${tx}px, ${ty}px)`;
  },

  destroy(els) { els.wrap.remove(); },
};
