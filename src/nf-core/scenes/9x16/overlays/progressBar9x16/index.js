import { TOKENS, GRID, scaleW, scaleH } from "../../../shared/design.js";

export const meta = {
  id: "progressBar9x16", version: 3, ratio: "9:16", category: "overlays",
  label: "Progress Bar 9:16",
  description: "Thin warm progress bar matching old clip-slide: gold gradient fill + segment dividers.",
  tech: "dom", duration_hint: 20, loopable: false, z_hint: "top",
  tags: ["overlays", "progressbar", "9x16"],
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    duration: { type: "number", default: 20, label: "Total duration (s)", group: "timing" },
  },
  ai: { when: "Always present. Shows playback progress." },
};

export function render(t, params, vp) {
  const duration = Number.isFinite(params.duration) && params.duration > 0 ? params.duration : 20;
  const progress = Math.max(0, Math.min(1, t / duration));
  const pad = scaleW(vp, GRID.sidePad);
  const top = scaleH(vp, GRID.progress);
  const width = vp.width - pad * 2;
  const barH = scaleW(vp, 6);
  const fill = Math.round(width * progress);
  const radius = scaleW(vp, 3);
  return `<div style="position:absolute;left:${pad}px;top:${top}px;width:${width}px;height:${scaleW(vp, 40)}px;display:flex;align-items:center;pointer-events:none">` +
    `<div style="position:relative;width:100%;height:${barH}px;background:rgba(232,196,122,0.1);border-radius:${radius}px;overflow:hidden">` +
    `<div style="position:absolute;left:0;top:0;bottom:0;width:${fill}px;background:linear-gradient(90deg,${TOKENS.interview.gold},rgba(232,196,122,0.6));border-radius:${radius}px"></div>` +
    `</div>` +
    `</div>`;
}

export function screenshots() {
  return [{ t: 0, label: "Start" }, { t: 10, label: "50%" }, { t: 19.9, label: "End" }];
}

export function lint(params) {
  const errors = [];
  if (params.duration <= 0) errors.push("duration must be > 0");
  return { ok: errors.length === 0, errors };
}
