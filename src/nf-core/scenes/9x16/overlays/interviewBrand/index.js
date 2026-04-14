import { TOKENS, GRID, TYPE, esc, scaleW, scaleH, fadeIn, decoLine } from "../../../shared/design.js";

export const meta = {
  id: "interviewBrand", version: 3, ratio: "9:16", category: "overlays",
  label: "Interview Brand",
  description: "Bottom brand lockup matching old clip-slide: deco line + serif brand + team attribution.",
  tech: "dom", duration_hint: 20, loopable: true, z_hint: "top",
  tags: ["overlays", "interview", "brand", "9x16"],
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    brand: { type: "string", default: "OPC · 王宇轩", label: "Brand name", group: "content" },
    teamLine: { type: "string", default: "该视频由数字员工 Alysa 全自动负责剪辑 · 翻译 · 字幕 · 讲解 · 封面 · 发布", label: "Team attribution", group: "content" },
  },
  ai: { when: "Always present at bottom. Shows brand + team attribution." },
};

export function render(t, params, vp) {
  const brand = esc(params.brand || "OPC · 王宇轩");
  const teamLine = esc(params.teamLine || "");
  const alpha = fadeIn(t, 0.12, 0.55);
  const brandY = scaleH(vp, GRID.brand);
  const teamY = scaleH(vp, GRID.teamLine);
  const brandSize = scaleW(vp, TYPE.brand.size);
  const teamSize = scaleW(vp, TYPE.teamLine.size);
  return `<div style="position:absolute;inset:0;pointer-events:none;opacity:${alpha}">` +
    // Deco line above brand
    decoLine(vp, GRID.decoLine3) +
    // Brand name (centered, serif)
    `<div style="position:absolute;left:0;right:0;top:${brandY}px;text-align:center">` +
    `<span style="font:${TYPE.brand.weight} ${brandSize}px ${TYPE.brand.font};color:${TOKENS.interview.gold};letter-spacing:${TYPE.brand.spacing}">${brand}</span>` +
    `</div>` +
    // Team line
    (teamLine ? `<div style="position:absolute;left:0;right:0;top:${teamY}px;text-align:center"><span style="font:${TYPE.teamLine.weight} ${teamSize}px ${TYPE.teamLine.font};color:${TOKENS.interview.textFaint};letter-spacing:${TYPE.teamLine.spacing}">${teamLine}</span></div>` : "") +
    `</div>`;
}

export function screenshots() {
  return [{ t: 0.1, label: "Brand fade in" }];
}

export function lint(params) {
  const errors = [];
  if (!params.brand) errors.push("brand name required");
  return { ok: errors.length === 0, errors };
}
