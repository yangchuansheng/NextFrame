import {
  createRoot, createNode, smoothstep, easeOutBack, toNumber,
  SERIF_FONT_STACK, SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

// bigNumber — 大数字展示：居中大号数字 + 下方说明文字
// type: "dom"
// params: { number: "100+", label, numColor, numSize, fontFamily }

export default {
  id: "bigNumber",
  type: "dom",
  name: "Big Number",
  category: "Layout",
  defaultParams: {
    number: "100+",
    label: "说明文字",
    numColor: "#da7756",
    numSize: 72,
    fontFamily: "serif",
  },

  create(container, params) {
    const numColor = params.numColor || "#da7756";
    const numSize = toNumber(params.numSize, 72);
    const fontStack = (params.fontFamily === "mono")
      ? '"SF Mono","Fira Code",Menlo,monospace'
      : (params.fontFamily === "sans")
        ? SANS_FONT_STACK
        : SERIF_FONT_STACK;

    const root = createRoot(container, [
      "display:flex",
      "align-items:center",
      "justify-content:flex-start",
      "gap:20px",
    ].join(";"));

    const numEl = createNode("div", [
      `font-family:${fontStack}`,
      `font-size:${numSize}px`,
      "font-weight:800",
      `color:${numColor}`,
      "letter-spacing:-0.02em",
      "line-height:1",
      "will-change:opacity,transform",
      "opacity:0",
      "transform:scale(0.7)",
      "flex-shrink:0",
    ].join(";"), String(params.number || "0"));
    root.appendChild(numEl);

    const labelEl = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:18px",
      "font-weight:500",
      "color:rgba(245,236,224,0.6)",
      "line-height:1.5",
      "will-change:opacity,transform",
      "opacity:0",
      "transform:translateX(-10px)",
      "max-width:480px",
    ].join(";"), String(params.label || ""));
    root.appendChild(labelEl);

    return { root, numEl, labelEl };
  },

  update(els, localT) {
    const exitT = 1 - smoothstep(0.88, 1, localT);

    // Number pops in
    const numT = smoothstep(0, 0.15, localT);
    const sc = 0.7 + 0.3 * easeOutBack(numT);
    els.numEl.style.opacity = numT * exitT;
    els.numEl.style.transform = `scale(${sc})`;

    // Label slides in after number
    const labelT = smoothstep(0.12, 0.28, localT);
    els.labelEl.style.opacity = labelT * exitT;
    els.labelEl.style.transform = `translateX(${(1 - labelT) * -10}px)`;
  },

  destroy(els) { els.root.remove(); },
};
