/**
 * syncSubs — synchronized subtitles driven by TTS timeline
 *
 * params:
 *   segments: [{ text, start_ms, end_ms }]  — from vox .timeline.json
 *   fontSize: 24
 *   color: "#ffffff"
 *   bgColor: "rgba(0,0,0,0.6)"
 *   position: "bottom" | "top" | "center"
 *   highlightColor: "#6ee7ff"
 */
import {
  createRoot, createNode, smoothstep, toNumber, SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

export default {
  id: "syncSubs",
  type: "dom",
  name: "Synced Subtitles",
  category: "Overlay",
  tags: ["字幕", "同步", "时间轴", "覆盖层", "高亮", "多语言"],
  description: "按时间轴同步显示并高亮当前词的字幕叠加层",
  params: {
    segments:       { type: "array",  default: [],               desc: "字幕段落数组（含 start/end/text）" },
    fontSize:       { type: "number", default: 24,               desc: "字体大小（px）", min: 12, max: 60 },
    color:          { type: "string", default: "#ffffff",        desc: "文字颜色" },
    bgColor:        { type: "string", default: "rgba(0,0,0,0.6)", desc: "背景色（支持 rgba）" },
    position:       { type: "string", default: "bottom",         desc: "位置：top / center / bottom" },
    highlightColor: { type: "string", default: "#6ee7ff",        desc: "当前词高亮颜色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const pos = params.position || "bottom";
    const alignCSS = pos === "top" ? "top:5%;bottom:auto"
      : pos === "center" ? "top:50%;transform:translateY(-50%)"
      : "bottom:8%";
    const root = createRoot(container, `display:flex;justify-content:center;align-items:flex-end;${alignCSS}`);
    const box = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      `font-size:${toNumber(params.fontSize, 24)}px`,
      "font-weight:500",
      "line-height:1.6",
      `color:${params.color || "#ffffff"}`,
      `background:${params.bgColor || "rgba(0,0,0,0.6)"}`,
      "padding:10px 24px",
      "border-radius:8px",
      "max-width:80%",
      "text-align:center",
      "will-change:opacity",
      "opacity:0",
    ].join(";"));
    root.appendChild(box);
    return { root, box, currentIdx: -1 };
  },

  // localT is normalized 0~1 (DOM type)
  update(els, localT, params) {
    const segments = params.segments || [];
    if (!segments.length) { els.box.style.opacity = "0"; return; }

    // Convert normalT back to approximate seconds using total duration
    // We need actual seconds — estimate from last segment end
    const totalMs = segments[segments.length - 1].end_ms || 10000;
    const tMs = localT * totalMs; // localT is 0~1, map to ms range

    // Find active segment
    let activeIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (tMs >= segments[i].start_ms && tMs <= segments[i].end_ms) {
        activeIdx = i;
        break;
      }
    }

    if (activeIdx < 0) {
      els.box.style.opacity = "0";
      els.currentIdx = -1;
      return;
    }

    if (activeIdx !== els.currentIdx) {
      els.box.textContent = segments[activeIdx].text;
      els.currentIdx = activeIdx;
    }

    // Fade in/out
    const seg = segments[activeIdx];
    const segDur = seg.end_ms - seg.start_ms;
    const segProgress = (tMs - seg.start_ms) / segDur;
    const fadeIn = smoothstep(0, 0.15, segProgress);
    const fadeOut = smoothstep(1, 0.85, segProgress);
    els.box.style.opacity = String(fadeIn * fadeOut);
  },

  destroy(els) { els.root.remove(); },
};
