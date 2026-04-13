import {
  createRoot, createNode, smoothstep, easeOutBack, toNumber,
  MONO_FONT_STACK,
} from "../scenes-v2-shared.js";

// chipGroup — 一组标签 pill/chip，stagger 逐个出现
// type: "dom"
// params: { chips: string[], color, bgColor, stagger }

export default {
  id: "chipGroup",
  type: "dom",
  name: "Chip Group",
  category: "Layout",
  defaultParams: {
    chips: ["Bash", "Read", "Edit", "Grep"],
    color: "#7ee787",
    bgColor: "rgba(126,231,135,0.08)",
    stagger: 0.08,
  },

  create(container, params) {
    const chips = Array.isArray(params.chips) ? params.chips : [];
    const color = params.color || "#7ee787";
    const bgColor = params.bgColor || "rgba(126,231,135,0.08)";

    const root = createRoot(container, [
      "display:flex",
      "align-items:center",
      "flex-wrap:wrap",
      "gap:10px",
      "padding:0 4px",
    ].join(";"));

    const chipEls = chips.map((label) => {
      const chip = createNode("div", [
        `font-family:${MONO_FONT_STACK}`,
        "font-size:15px",
        "font-weight:600",
        `color:${color}`,
        `background:${bgColor}`,
        `border:1px solid ${color}44`,
        "border-radius:8px",
        "padding:6px 16px",
        "letter-spacing:0.04em",
        "white-space:nowrap",
        "will-change:opacity,transform",
        "opacity:0",
        "transform:translateY(10px) scale(0.88)",
        "flex-shrink:0",
      ].join(";"), label);
      root.appendChild(chip);
      return chip;
    });

    return { root, chipEls };
  },

  update(els, localT, params) {
    const stagger = toNumber(params && params.stagger, 0.08);
    const exitT = 1 - smoothstep(0.88, 1, localT);
    const total = els.chipEls.length;

    els.chipEls.forEach((chip, i) => {
      const start = 0.0 + i * stagger;
      const t = smoothstep(start, start + 0.12, localT);
      const sc = 0.88 + 0.12 * easeOutBack(t);
      chip.style.opacity = t * exitT;
      chip.style.transform = `translateY(${(1 - t) * 10}px) scale(${sc})`;
    });
  },

  destroy(els) { els.root.remove(); },
};
