// interviewBiSub — 9:16 双语字幕（两级查找：segment→英文, cn[]→中文）
import { TOKENS, GRID, TYPE, scaleW, scaleH, esc, findActiveSub } from "../../../shared/design.js";

export const meta = {
  id: "interviewBiSub",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Bilingual Subtitles",
  description: "双语字幕：中文按 cn[] 子 cue 切换，英文按 segment 切换，说话人决定颜色",
  tech: "dom",
  duration_hint: 60,
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    segments: {
      type: "array",
      default: [],
      label: "fine.json segments 数组（直接贴，不转换）",
      group: "content",
    },
  },
  ai: {
    when: "9:16 访谈视频的双语字幕层",
    how: "params.segments = fine.json.segments（直接贴，不转换）；使用 findActiveSub 两级查找",
  },
};

export function render(t, params, vp) {
  const tok = TOKENS.interview;
  const subs = GRID.subs;

  const left = scaleW(vp, subs.left);
  const right = scaleW(vp, subs.right);
  const top = scaleH(vp, subs.top);
  const height = scaleH(vp, subs.height);

  const cnSize = scaleW(vp, TYPE.cnSub.size);
  const enSize = scaleW(vp, TYPE.enSub.size);
  const gap = scaleH(vp, 10);

  const active = findActiveSub(params.segments, t);

  let cnText = "";
  let enText = "";
  let cnColor = tok.gold; // default: dario = gold

  if (active) {
    cnText = active.cn || "";
    enText = active.en || "";
    // dwarkesh = white, dario = gold, others = gold
    cnColor = active.speaker === "dwarkesh" ? tok.text : tok.gold;
  }

  return `<div style="position:absolute;left:${left}px;right:${right}px;top:${top}px;height:${height}px;
    pointer-events:none;z-index:40;overflow:hidden;
    display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:${gap}px;">
  <!-- Chinese -->
  <div style="font-size:${cnSize}px;font-weight:${TYPE.cnSub.weight};
    color:${cnColor};line-height:${TYPE.cnSub.lineHeight};
    text-align:center;
    text-shadow:0 1px 8px rgba(0,0,0,0.4);
    white-space:normal;word-break:break-word;overflow-wrap:anywhere;
    overflow:hidden;box-sizing:border-box;
    font-family:${TYPE.cnSub.font};">${esc(cnText)}</div>
  <!-- English -->
  <div style="font-size:${enSize}px;font-weight:${TYPE.enSub.weight};
    color:rgba(255,255,255,0.45);line-height:${TYPE.enSub.lineHeight};
    text-align:center;font-style:italic;
    white-space:normal;word-break:break-word;overflow-wrap:anywhere;
    overflow:hidden;box-sizing:border-box;
    font-family:${TYPE.enSub.font};">${esc(enText)}</div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0, label: "subs-empty" },
    { t: 1, label: "subs-active" },
  ];
}

export function lint(params, _vp) {
  const errors = [];
  if (!Array.isArray(params.segments)) errors.push("segments 必须是数组");
  return { ok: errors.length === 0, errors };
}
