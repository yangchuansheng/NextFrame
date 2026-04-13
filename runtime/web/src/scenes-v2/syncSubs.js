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
  defaultParams: {
    segments: [],
    fontSize: 24,
    color: "#ffffff",
    bgColor: "rgba(0,0,0,0.6)",
    position: "bottom",
    highlightColor: "#6ee7ff",
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
