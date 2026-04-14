// interviewBg — 9:16 访谈底层：深黑底 + 金色光晕 + 网格点 + 暗角
import { TOKENS, GRID, scaleW, scaleH } from "../../../shared/design.js";

export const meta = {
  id: "interviewBg",
  version: 1,
  ratio: "9:16",
  category: "backgrounds",
  label: "Interview Background",
  description: "深黑底 + 金色径向光晕 + 网格点 + 暗角，9:16 访谈视频底层",
  tech: "dom",
  duration_hint: 60,
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {},
  ai: {
    when: "9:16 访谈视频的底层背景，放在 layers 最底部",
    how: "无需任何参数，直接使用",
  },
};

export function render(_t, _params, vp) {
  const bg = TOKENS.interview.bg;
  const gold = TOKENS.interview.glowTop;
  const gold2 = TOKENS.interview.glowBottom;
  const vignette = TOKENS.interview.vignette;
  const dotColor = TOKENS.interview.gridDot;

  return `<div style="position:absolute;inset:0;background:${bg};overflow:hidden;">
  <!-- top radial glow -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 20%,${gold} 0%,transparent 60%);pointer-events:none;"></div>
  <!-- bottom radial glow -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 85%,${gold2} 0%,transparent 50%);pointer-events:none;"></div>
  <!-- grid dots -->
  <div style="position:absolute;inset:0;background-image:radial-gradient(${dotColor} 1px,transparent 1px);background-size:${scaleW(vp,20)}px ${scaleH(vp,20)}px;opacity:0.15;pointer-events:none;"></div>
  <!-- vignette -->
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 40%,${vignette} 100%);pointer-events:none;z-index:2;"></div>
</div>`;
}

export function screenshots() {
  return [{ t: 0, label: "background" }];
}

export function lint(_params, _vp) {
  return { ok: true, errors: [] };
}
