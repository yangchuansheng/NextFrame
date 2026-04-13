import {
  SANS_FONT_STACK,
  createRoot,
  createNode,
  smoothstep,
  easeOutCubic,
  clamp,
  normalizeArray,
} from "../scenes-v2-shared.js";

export default {
  id: "bulletList",
  type: "dom",
  name: "Bullet List",
  category: "Typography",
  tags: ["text", "list", "bullets", "stagger", "slide-in", "points"],
  description: "Adaptive bullet point list with colored dots and per-item slide-in entrance from the left",

  params: {
    items: { type: "array", default: ["Item 1", "Item 2", "Item 3"], desc: "List of bullet point strings" },
    fontSize: { type: "number", default: 0.028, desc: "Font size relative to short edge", min: 0.015, max: 0.06 },
    bulletColor: { type: "string", default: "#a78bfa", desc: "Bullet dot color" },
    stagger: { type: "number", default: 0.1, desc: "Stagger delay per item (in localT units)", min: 0.02, max: 0.4 },
  },

  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) {
      p[k] = v.default;
    }
    return p;
  },

  create(container, params) {
    const W = container.clientWidth || 1920;
    const H = container.clientHeight || 1080;
    const S = Math.min(W, H);

    const items = normalizeArray(params.items, ["Item 1", "Item 2", "Item 3"]);
    const fontSize = S * (params.fontSize || 0.028);
    const bulletColor = params.bulletColor || "#a78bfa";
    const bulletSize = S * 0.008;
    const gap = S * 0.018;
    const padding = S * 0.04;

    const root = createRoot(container, [
      "display:flex",
      "flex-direction:column",
      "justify-content:center",
      `padding:${Math.round(padding)}px`,
      "box-sizing:border-box",
    ].join(";"));

    const listWrap = createNode("div", [
      "display:flex",
      "flex-direction:column",
      `gap:${Math.round(gap)}px`,
    ].join(";"));

    const itemEls = [];
    for (let i = 0; i < items.length; i += 1) {
      const row = createNode("div", [
        "display:flex",
        "align-items:center",
        `gap:${Math.round(S * 0.012)}px`,
        "opacity:0",
        "transform:translateX(-30px)",
        "will-change:transform,opacity",
      ].join(";"));

      const dot = createNode("span", [
        `width:${Math.round(bulletSize)}px`,
        `height:${Math.round(bulletSize)}px`,
        "border-radius:50%",
        `background:${bulletColor}`,
        "flex-shrink:0",
      ].join(";"));

      const textEl = createNode("span", [
        `font-size:${Math.round(fontSize)}px`,
        `font-family:${SANS_FONT_STACK}`,
        "font-weight:400",
        "color:#f0f0f0",
        "line-height:1.5",
      ].join(";"), String(items[i]));

      row.appendChild(dot);
      row.appendChild(textEl);
      listWrap.appendChild(row);
      itemEls.push(row);
    }

    root.appendChild(listWrap);
    return { root, itemEls, S };
  },

  update(els, localT, params) {
    const t = clamp(localT);
    const staggerDelay = params.stagger || 0.1;
    const itemCount = els.itemEls.length;

    for (let i = 0; i < itemCount; i += 1) {
      const itemStart = i * staggerDelay * 0.3;
      const enterEnd = itemStart + 0.3;
      const exitStart = 0.8;

      const enterProgress = easeOutCubic(smoothstep(itemStart, Math.min(enterEnd, 0.3), t));
      const exitProgress = smoothstep(exitStart, 1, t);
      const opacity = enterProgress * (1 - exitProgress);
      const translateX = (1 - enterProgress) * -30 + exitProgress * -30;

      els.itemEls[i].style.opacity = String(opacity);
      els.itemEls[i].style.transform = `translateX(${translateX}px)`;
    }
  },

  destroy(els) {
    if (els.root && els.root.parentNode) {
      els.root.parentNode.removeChild(els.root);
    }
  },
};
