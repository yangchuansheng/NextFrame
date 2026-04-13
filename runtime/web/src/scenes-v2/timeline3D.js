import {
  createRoot, createNode, smoothstep, toNumber, normalizeArray, clamp,
  SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

const DEFAULT_EVENTS = [
  { label: "Start", date: "2024" },
  { label: "Launch", date: "2025" },
];

export default {
  id: "timeline3D",
  type: "dom",
  name: "3D Timeline",
  category: "Diagrams",
  tags: ["timeline", "3d", "perspective", "events", "diagram", "animation"],
  description: "CSS 3D 透视时间线，事件在 3D 空间中排列，从远处逐个飞入，适合展示项目里程碑和历史回顾",
  params: {
    events:      { type: "array",  default: DEFAULT_EVENTS, desc: "事件列表[{label,date}]" },
    perspective: { type: "number", default: 1200,           desc: "透视深度(px)" },
    rotateX:     { type: "number", default: 35,             desc: "X轴旋转角度" },
    color:       { type: "string", default: "#6ee7ff",      desc: "主色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");
    const perspective = toNumber(params.perspective, 1200);
    const rotateX = toNumber(params.rotateX, 35);
    const color = params.color || "#6ee7ff";
    const events = normalizeArray(params.events, DEFAULT_EVENTS);

    const stage = createNode("div", [
      `perspective:${perspective}px`,
      "width:80%",
      "max-width:700px",
    ].join(";"));

    const track = createNode("div", [
      `transform:rotateX(${rotateX}deg)`,
      "transform-style:preserve-3d",
      "display:flex",
      "flex-direction:column",
      "gap:32px",
      "padding:40px 0",
    ].join(";"));

    // Center line
    const line = createNode("div", [
      "position:absolute",
      "left:50%",
      "top:0",
      "bottom:0",
      "width:2px",
      `background:${color}`,
      "opacity:0.3",
      "transform:translateX(-50%)",
    ].join(";"));
    track.appendChild(line);

    const eventEls = events.map((evt, i) => {
      const isLeft = i % 2 === 0;
      const row = createNode("div", [
        "display:flex",
        "align-items:center",
        `justify-content:${isLeft ? "flex-end" : "flex-start"}`,
        "position:relative",
        "will-change:transform,opacity",
        "opacity:0",
        "transform:translateZ(-200px)",
        isLeft ? "padding-right:calc(50% + 24px)" : "padding-left:calc(50% + 24px)",
      ].join(";"));

      // Dot on center line
      const dot = createNode("div", [
        "position:absolute",
        "left:50%",
        "transform:translateX(-50%)",
        "width:14px",
        "height:14px",
        "border-radius:50%",
        `background:${color}`,
        "box-shadow:0 0 12px " + color,
        "z-index:2",
      ].join(";"));
      row.appendChild(dot);

      const card = createNode("div", [
        `background:rgba(255,255,255,0.06)`,
        "border-radius:10px",
        `border:1px solid ${color}33`,
        "padding:16px 20px",
        "backdrop-filter:blur(8px)",
      ].join(";"));

      const dateEl = createNode("div", [
        `font-family:${SANS_FONT_STACK}`,
        "font-size:13px",
        "font-weight:600",
        `color:${color}`,
        "margin-bottom:4px",
        "letter-spacing:0.08em",
      ].join(";"), String(evt.date || ""));

      const labelEl = createNode("div", [
        `font-family:${SANS_FONT_STACK}`,
        "font-size:18px",
        "font-weight:700",
        "color:#e2e8f0",
      ].join(";"), String(evt.label || ""));

      card.appendChild(dateEl);
      card.appendChild(labelEl);
      row.appendChild(card);
      track.appendChild(row);

      return row;
    });

    stage.appendChild(track);
    root.appendChild(stage);

    return { root, track, eventEls };
  },

  update(els, localT) {
    const enterT = smoothstep(0, 0.06, localT);
    const exitT = 1 - smoothstep(0.88, 1, localT);
    const alpha = enterT * exitT;
    els.root.style.opacity = String(alpha);

    const total = els.eventEls.length;
    const stagger = 0.6 / Math.max(1, total);

    for (let i = 0; i < total; i++) {
      const start = 0.08 + i * stagger;
      const end = start + stagger * 2;
      const t = smoothstep(start, end, localT);
      const z = (1 - t) * -200;
      els.eventEls[i].style.opacity = String(t);
      els.eventEls[i].style.transform = `translateZ(${z}px)`;
    }
  },

  destroy(els) { els.root.remove(); },
};
