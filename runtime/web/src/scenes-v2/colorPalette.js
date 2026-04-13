import {
  createRoot, createNode, smoothstep, toNumber, toBoolean,
  MONO_FONT_STACK, SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

/* ── Open Color 13 palettes × 10 shades ── */
const OC = {
  gray:   ["#f8f9fa","#f1f3f5","#e9ecef","#dee2e6","#ced4da","#adb5bd","#868e96","#495057","#343a40","#212529"],
  red:    ["#fff5f5","#ffe3e3","#ffc9c9","#ffa8a8","#ff8787","#ff6b6b","#fa5252","#f03e3e","#e03131","#c92a2a"],
  pink:   ["#fff0f6","#ffdeeb","#fcc2d7","#faa2c1","#f783ac","#f06595","#e64980","#d6336c","#c2255c","#a61e4d"],
  grape:  ["#f8f0fc","#f3d9fa","#eebefa","#e599f7","#da77f2","#cc5de8","#be4bdb","#ae3ec9","#9c36b5","#862e9c"],
  violet: ["#f3f0ff","#e5dbff","#d0bfff","#b197fc","#9775fa","#845ef7","#7950f2","#7048e8","#6741d9","#5f3dc4"],
  indigo: ["#edf2ff","#dbe4ff","#bac8ff","#91a7ff","#748ffc","#5c7cfa","#4c6ef5","#4263eb","#3b5bdb","#364fc7"],
  blue:   ["#e7f5ff","#d0ebff","#a5d8ff","#74c0fc","#4dabf7","#339af0","#228be6","#1c7ed6","#1971c2","#1864ab"],
  cyan:   ["#e3fafc","#c5f6fa","#99e9f2","#66d9e8","#3bc9db","#22b8cf","#15aabf","#1098ad","#0c8599","#0b7285"],
  teal:   ["#e6fcf5","#c3fae8","#96f2d7","#63e6be","#38d9a9","#20c997","#12b886","#0ca678","#099268","#087f5b"],
  green:  ["#ebfbee","#d3f9d8","#b2f2bb","#8ce99a","#69db7c","#51cf66","#40c057","#37b24d","#2f9e44","#2b8a3e"],
  lime:   ["#f4fce3","#e9fac8","#d8f5a2","#c0eb75","#a9e34b","#94d82d","#82c91e","#74b816","#66a80f","#5c940d"],
  yellow: ["#fff9db","#fff3bf","#ffec99","#ffe066","#ffd43b","#fcc419","#fab005","#f59f00","#f08c00","#e67700"],
  orange: ["#fff4e6","#ffe8cc","#ffd8a8","#ffc078","#ffa94d","#ff922b","#fd7e14","#f76707","#e8590c","#d9480f"],
};

const SIZES = { small: 28, medium: 44, large: 60 };

function renderStrip(wrapper, colors, showHex, size, color) {
  wrapper.style.cssText += ";display:flex;gap:6px;flex-wrap:nowrap;align-items:flex-end";
  return colors.map((hex, i) => {
    const col = createNode("div", [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "gap:6px",
      "will-change:transform,opacity",
      "opacity:0",
    ].join(";"));
    const swatch = createNode("div", [
      `width:${size}px`,
      `height:${size}px`,
      "border-radius:6px",
      `background:${hex}`,
      "box-shadow:0 2px 8px rgba(0,0,0,0.2)",
    ].join(";"));
    col.appendChild(swatch);
    if (showHex) {
      const label = createNode("div", [
        `font-family:${MONO_FONT_STACK}`,
        "font-size:10px",
        "color:rgba(255,255,255,0.5)",
        "text-transform:uppercase",
      ].join(";"), hex);
      col.appendChild(label);
    }
    wrapper.appendChild(col);
    return col;
  });
}

function renderGrid(wrapper, colors, showHex, size) {
  wrapper.style.cssText += ";display:grid;grid-template-columns:repeat(5,1fr);gap:10px";
  return colors.map((hex) => {
    const cell = createNode("div", [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "gap:4px",
      "will-change:transform,opacity",
      "opacity:0",
    ].join(";"));
    const swatch = createNode("div", [
      `width:${size}px`,
      `height:${size}px`,
      "border-radius:8px",
      `background:${hex}`,
      "box-shadow:0 2px 8px rgba(0,0,0,0.2)",
    ].join(";"));
    cell.appendChild(swatch);
    if (showHex) {
      const label = createNode("div", [
        `font-family:${MONO_FONT_STACK}`,
        "font-size:10px",
        "color:rgba(255,255,255,0.5)",
      ].join(";"), hex);
      cell.appendChild(label);
    }
    wrapper.appendChild(cell);
    return cell;
  });
}

function renderCircles(wrapper, colors, showHex, size) {
  wrapper.style.cssText += ";display:flex;gap:10px;flex-wrap:wrap;justify-content:center";
  return colors.map((hex) => {
    const cell = createNode("div", [
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "gap:4px",
      "will-change:transform,opacity",
      "opacity:0",
    ].join(";"));
    const swatch = createNode("div", [
      `width:${size}px`,
      `height:${size}px`,
      "border-radius:50%",
      `background:${hex}`,
      "box-shadow:0 2px 8px rgba(0,0,0,0.2)",
    ].join(";"));
    cell.appendChild(swatch);
    if (showHex) {
      const label = createNode("div", [
        `font-family:${MONO_FONT_STACK}`,
        "font-size:10px",
        "color:rgba(255,255,255,0.5)",
      ].join(";"), hex);
      cell.appendChild(label);
    }
    wrapper.appendChild(cell);
    return cell;
  });
}

export default {
  id: "colorPalette",
  type: "dom",
  name: "Color Palette",
  category: "Data Viz",
  tags: ["color", "palette", "swatch", "design", "data", "grid"],
  description: "展示色板，内置 Open Color 13 种色系共 130 个色阶，支持横排/网格/圆形三种布局",
  params: {
    palette: { type: "string",  default: "blue",  desc: "色系:gray/red/pink/grape/violet/indigo/blue/cyan/teal/green/lime/yellow/orange" },
    format:  { type: "string",  default: "strip", desc: "格式:strip/grid/circles" },
    showHex: { type: "boolean", default: true,     desc: "显示色值" },
    size:    { type: "string",  default: "large",  desc: "大小:small/medium/large" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6% 8%");
    const paletteName = params.palette || "blue";
    const colors = OC[paletteName] || OC.blue;
    const format = params.format || "strip";
    const showHex = toBoolean(params.showHex, true);
    const sizeKey = params.size || "large";
    const size = SIZES[sizeKey] || SIZES.large;

    // Title
    const title = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:14px",
      "font-weight:600",
      "color:rgba(255,255,255,0.5)",
      "text-transform:uppercase",
      "letter-spacing:0.12em",
      "margin-bottom:20px",
    ].join(";"), paletteName);
    root.appendChild(title);

    const wrapper = createNode("div", "");
    root.appendChild(wrapper);

    let swatchEls;
    if (format === "grid") {
      swatchEls = renderGrid(wrapper, colors, showHex, size);
    } else if (format === "circles") {
      swatchEls = renderCircles(wrapper, colors, showHex, size);
    } else {
      swatchEls = renderStrip(wrapper, colors, showHex, size);
    }

    return { root, title, swatchEls };
  },

  update(els, localT) {
    const enterT = smoothstep(0, 0.06, localT);
    const exitT = 1 - smoothstep(0.88, 1, localT);
    els.root.style.opacity = String(enterT * exitT);

    const total = els.swatchEls.length;
    const stagger = 0.5 / Math.max(1, total);

    for (let i = 0; i < total; i++) {
      const start = 0.08 + i * stagger;
      const end = start + stagger * 2.5;
      const t = smoothstep(start, end, localT);
      els.swatchEls[i].style.opacity = String(t);
      els.swatchEls[i].style.transform = `scale(${0.5 + t * 0.5})`;
    }
  },

  destroy(els) { els.root.remove(); },
};
