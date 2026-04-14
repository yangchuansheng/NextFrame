// progressBar9x16 — 9:16 进度条
import { TOKENS, GRID, scaleW, scaleH } from "../../../shared/design.js";

export const meta = {
  id: "progressBar9x16",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Progress Bar (9:16)",
  description: "底部金色进度条，支持多 clip 分段竖线",
  tech: "dom",
  duration_hint: 60,
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    duration: { type: "number", default: 60, label: "总时长（秒）", group: "timing" },
    clipDurations: {
      type: "array",
      default: [],
      label: "多 clip 各段时长数组（用于分段竖线，单 clip 传空数组）",
      group: "timing",
    },
  },
  ai: {
    when: "9:16 访谈视频进度条",
    how: "传入 duration=总秒数；多 clip 时传 clipDurations=[d1,d2,...] 显示分段线",
  },
};

export function render(t, params, vp) {
  const tok = TOKENS.interview;
  const progressY = scaleH(vp, GRID.progress);
  const sidePad = scaleW(vp, GRID.sidePad);
  const barHeight = scaleH(vp, 3);

  const dur = Math.max(params.duration || 60, 0.001);
  const progress = Math.max(0, Math.min(1, t / dur));

  // dividers for multi-clip
  let dividersHtml = "";
  const durs = params.clipDurations || [];
  if (durs.length > 1) {
    let acc = 0;
    const total = durs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < durs.length - 1; i++) {
      acc += durs[i];
      const pct = (acc / total) * 100;
      dividersHtml += `<div style="position:absolute;top:${-scaleH(vp,3)}px;bottom:${-scaleH(vp,3)}px;
        left:${pct.toFixed(2)}%;width:${scaleW(vp,2)}px;
        background:rgba(255,255,255,0.55);border-radius:1px;"></div>`;
    }
  }

  return `<div style="position:absolute;left:${sidePad}px;right:${sidePad}px;top:${progressY}px;
    height:${scaleH(vp,20)}px;display:flex;align-items:center;pointer-events:none;z-index:10;">
  <div style="flex:1;height:${barHeight}px;position:relative;
    background:rgba(232,196,122,0.1);border-radius:${barHeight/2}px;overflow:hidden;">
    <div style="position:absolute;left:0;top:0;bottom:0;
      width:${(progress*100).toFixed(2)}%;
      background:linear-gradient(90deg,${tok.gold},rgba(232,196,122,0.6));
      border-radius:${barHeight/2}px;"></div>
    ${dividersHtml}
  </div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0, label: "progress-start" },
    { t: 30, label: "progress-mid" },
  ];
}

export function lint(params, _vp) {
  const errors = [];
  if (typeof params.duration !== "number" || params.duration <= 0)
    errors.push("duration 必须是正数");
  return { ok: errors.length === 0, errors };
}
