// interviewVideoArea — 9:16 视频嵌入框（recorder 叠加真实视频）
import { TOKENS, GRID, scaleW, scaleH, esc, decoLine } from "../../../shared/design.js";

export const meta = {
  id: "interviewVideoArea",
  version: 1,
  ratio: "9:16",
  category: "media",
  label: "Interview Video Area",
  description: "视频嵌入黑色占位框，recorder 通过 ffmpeg overlay 叠入真实视频",
  tech: "dom",
  duration_hint: 60,
  videoOverlay: {
    x: GRID.video.left,
    y: GRID.video.top,
    w: 1080 - GRID.video.left - GRID.video.right,
    h: GRID.video.height,
  },
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    clipLabel: { type: "string", default: "CLIP 1/1", label: "片段标签（右上角角标）", group: "content" },
  },
  ai: {
    when: "9:16 访谈视频的视频占位层，必须设 meta.videoOverlay=true，recorder 靠此检测",
    how: "设 clipLabel='CLIP N/M'；recorder 会把真实视频 ffmpeg overlay 到这个区域",
  },
};

export function render(_t, params, vp) {
  const tok = TOKENS.interview;
  const v = GRID.video;
  const top = scaleH(vp, v.top);
  const left = scaleW(vp, v.left);
  const right = scaleW(vp, v.right);
  const height = scaleH(vp, v.height);
  const labelSize = scaleW(vp, TYPE_clipLabel_size);
  const labelPad = scaleW(vp, 10);
  const labelTop = scaleH(vp, 8);

  // import TYPE doesn't work inline — use literal derived from design.js TYPE.clipLabel.size=14
  const fs = Math.round(vp.width * 14 / 1080);

  return `<div style="position:absolute;left:${left}px;right:${right}px;top:${top}px;height:${height}px;
    background:#000;border-radius:${scaleW(vp,4)}px;overflow:hidden;z-index:10;
    box-shadow:0 ${scaleH(vp,4)}px ${scaleW(vp,24)}px rgba(0,0,0,0.4),inset 0 0 0 1px rgba(232,196,122,0.08);">
  ${params.clipLabel ? `<span style="position:absolute;top:${labelTop}px;left:${labelPad}px;z-index:20;
    font-size:${fs}px;color:rgba(232,196,122,0.6);
    font-family:'SF Mono','JetBrains Mono',monospace;
    background:rgba(232,196,122,0.08);padding:${scaleH(vp,2)}px ${scaleW(vp,6)}px;
    border-radius:${scaleW(vp,2)}px;letter-spacing:0.08em;">${esc(params.clipLabel)}</span>` : ""}
</div>
${decoLine(vp, GRID.decoLine2)}`;
}

// TYPE.clipLabel.size placeholder — avoid import cycle
const TYPE_clipLabel_size = 14;

export function screenshots() {
  return [{ t: 0, label: "video-area" }];
}

export function lint(_params, _vp) {
  return { ok: true, errors: [] };
}
