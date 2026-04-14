import { TOKENS, GRID, TYPE, esc, escAttr, scaleW, scaleH, fadeIn } from "../../../shared/design.js";

export const meta = {
  id: "interviewVideoArea", version: 3, ratio: "9:16", category: "media",
  label: "Interview Video Area",
  description: "Black video embed matching old clip-slide .video-area: top 276, height 538, rounded corners, shadow.",
  tech: "dom", duration_hint: 20, loopable: true, z_hint: "middle",
  videoOverlay: true, // recorder uses this flag to detect video layers for ffmpeg compositing
  tags: ["media", "interview", "video", "9x16"],
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    src: { type: "string", default: "", label: "Video URL", group: "content" },
    clipNum: { type: "number", default: 0, label: "Clip number (0=hide)", group: "content" },
    totalClips: { type: "number", default: 0, label: "Total clips", group: "content" },
  },
  ai: { when: "Video embed for interview clips. Recorder auto-overlays real video via ffmpeg." },
};

export function render(t, params, vp) {
  const src = params.src || "";
  const clipNum = params.clipNum || 0;
  const totalClips = params.totalClips || 0;
  const top = scaleH(vp, GRID.video.top);
  const height = scaleH(vp, GRID.video.height);
  const pad = scaleW(vp, GRID.video.left);
  const width = vp.width - pad * 2;
  const radius = scaleW(vp, 8);
  const alpha = fadeIn(t, 0, 0.45);
  // Clip label (e.g., "CLIP 1/3")
  const labelSize = scaleW(vp, TYPE.clipLabel.size);
  const clipLabel = clipNum > 0
    ? `<span style="position:absolute;top:${scaleW(vp, 16)}px;left:${scaleW(vp, 20)}px;z-index:20;font:${TYPE.clipLabel.weight} ${labelSize}px ${TYPE.clipLabel.font};color:rgba(232,196,122,0.6);background:rgba(232,196,122,0.08);padding:${scaleW(vp, 4)}px ${scaleW(vp, 12)}px;border-radius:${scaleW(vp, 4)}px;letter-spacing:${TYPE.clipLabel.spacing}">CLIP ${clipNum}${totalClips ? "/" + totalClips : ""}</span>`
    : "";
  const shell = `position:absolute;left:${pad}px;top:${top}px;width:${width}px;height:${height}px;opacity:${alpha};border-radius:${radius}px;overflow:hidden;pointer-events:none;background:#000;box-shadow:0 ${scaleW(vp, 8)}px ${scaleW(vp, 48)}px rgba(0,0,0,0.4),inset 0 0 0 1px rgba(232,196,122,0.08)`;
  if (src) {
    const persistKey = `iv-${String(src).replace(/[^a-zA-Z0-9]/g, "").slice(-24)}`;
    return `<div style="${shell}">` +
      clipLabel +
      `<video data-nf-persist="${persistKey}" data-nf-time="${Math.max(0, t)}" src="${escAttr(src)}" muted playsinline preload="auto" style="width:100%;height:100%;object-fit:cover;display:block;background:#000"></video>` +
      `</div>`;
  }
  return `<div style="${shell};display:flex;align-items:center;justify-content:center">` +
    clipLabel +
    `<span style="font:400 ${scaleW(vp, 24)}px system-ui;color:${TOKENS.interview.textFaint}">VIDEO</span>` +
    `</div>`;
}

export function screenshots() {
  return [{ t: 0.1, label: "Video area" }];
}

export function lint() {
  return { ok: true, errors: [] };
}
