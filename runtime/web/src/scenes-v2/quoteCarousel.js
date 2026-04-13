import { createRoot, createNode, clamp, smoothstep, normalizeArray, toNumber, SANS_FONT_STACK, SERIF_FONT_STACK } from "../scenes-v2-shared.js";

export default {
  id: "quoteCarousel",
  type: "dom",
  name: "Quote Carousel",
  category: "Typography",
  tags: ["quote", "carousel", "text", "typography", "testimonial", "rotation"],
  description: "引用轮播组件，多条引言自动淡入淡出循环切换",
  params: {
    quotes:      { type: "array",  default: [{text:"The best way to predict the future is to invent it.",author:"Alan Kay"},{text:"Simplicity is the ultimate sophistication.",author:"Leonardo da Vinci"},{text:"Talk is cheap. Show me the code.",author:"Linus Torvalds"}], desc: "引言数组 [{text,author}]" },
    interval:    { type: "number", default: 4,         desc: "切换间隔(秒)", min: 2, max: 15 },
    accentColor: { type: "string", default: "#a78bfa", desc: "强调色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center");
    const quotes = normalizeArray(params.quotes, this.params.quotes.default);
    const accent = params.accentColor || "#a78bfa";

    const wrapper = createNode("div", [
      "position:relative",
      "max-width:900px",
      "text-align:center",
      "padding:40px",
    ].join(";"));

    // quotation mark decoration
    const mark = createNode("div", [
      `font-family:${SERIF_FONT_STACK}`,
      "font-size:120px",
      "font-weight:700",
      `color:${accent}`,
      "opacity:0.15",
      "line-height:1",
      "position:absolute",
      "top:-20px",
      "left:20px",
      "pointer-events:none",
    ].join(";"), "\u201C");
    wrapper.appendChild(mark);

    const textEl = createNode("div", [
      `font-family:${SERIF_FONT_STACK}`,
      "font-size:32px",
      "font-weight:400",
      "color:rgba(255,255,255,0.85)",
      "line-height:1.6",
      "font-style:italic",
      "will-change:opacity",
      "opacity:0",
    ].join(";"), quotes[0]?.text || "");

    const authorEl = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      "font-size:18px",
      "font-weight:600",
      `color:${accent}`,
      "margin-top:24px",
      "letter-spacing:0.05em",
      "will-change:opacity",
      "opacity:0",
    ].join(";"), quotes[0]?.author ? `\u2014 ${quotes[0].author}` : "");

    wrapper.appendChild(textEl);
    wrapper.appendChild(authorEl);
    root.appendChild(wrapper);

    return { root, textEl, authorEl, quotes, interval: toNumber(params.interval, 4), currentIdx: 0 };
  },

  update(els, localT) {
    const { quotes, interval } = els;
    if (quotes.length === 0) return;

    const cycleT = localT % (interval * quotes.length);
    const idx = Math.floor(cycleT / interval) % quotes.length;
    const withinT = (cycleT % interval) / interval; // 0..1 within current quote

    // cross-fade: fade in 0-0.15, hold 0.15-0.8, fade out 0.8-1.0
    const fadeIn = smoothstep(0, 0.15, withinT);
    const fadeOut = 1 - smoothstep(0.8, 1.0, withinT);
    const alpha = fadeIn * fadeOut;

    // update text if index changed
    if (idx !== els.currentIdx) {
      els.currentIdx = idx;
      els.textEl.textContent = quotes[idx]?.text || "";
      els.authorEl.textContent = quotes[idx]?.author ? `\u2014 ${quotes[idx].author}` : "";
    }

    els.textEl.style.opacity = String(alpha);
    els.authorEl.style.opacity = String(alpha * 0.8);
    els.textEl.style.transform = `translateY(${(1 - alpha) * 8}px)`;
  },

  destroy(els) { els.root.remove(); },
};
