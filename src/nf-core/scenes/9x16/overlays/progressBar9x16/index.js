import { getPreset, scaleW, scaleH, clamp01 } from "../../../shared/design.js";

const PRESET_NAME = "interview-dark";

export const meta = {
  id: "progressBar9x16",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Progress Bar 9x16",
  description: "Portrait interview progress bar aligned to the interview-dark preset footer slot.",
  tech: "dom",
  duration_hint: 81,
  tags: ["progress", "portrait", "interview"],
  mood: ["editorial"],
  theme: ["interview-dark"],
  default_theme: PRESET_NAME,
  themes: {
    "interview-dark": {},
    "interview-soft": {},
    "interview-contrast": {},
  },
  params: {
    duration: { type: "number", default: 81.31, label: "总时长", group: "timing" },
  },
  ai: {
    when: "Use as the bottom progress layer in a 9:16 interview layout.",
    how: "Keep it full-duration and pass the clip duration so fill width matches playback time.",
    example: {},
    avoid: "Do not use for segmented chapter progress bars.",
    pairs_with: ["interviewChrome", "interviewVideoArea", "interviewBiSub"],
  },
};

export function render(t, params, vp) {
  const preset = getPreset(PRESET_NAME);
  const { colors, layout } = preset;
  const duration = Number(params.duration) > 0 ? Number(params.duration) : 1;
  const progress = clamp01(t / duration);
  const left = scaleW(vp, layout.sidePad, layout.baseW);
  const top = scaleH(vp, layout.progress, layout.baseH);
  const trackHeight = Math.max(3, scaleH(vp, 6, layout.baseH));
  const knobSize = scaleW(vp, 20, layout.baseW);
  const width = vp.width - left * 2;

  return `
    <div style="position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${knobSize}px;">
      <div style="position:absolute;left:0;right:0;top:${Math.round((knobSize - trackHeight) / 2)}px;height:${trackHeight}px;border-radius:${trackHeight}px;background:rgba(255,255,255,0.08);overflow:hidden;">
        <div style="height:100%;width:${(progress * 100).toFixed(3)}%;background:linear-gradient(90deg, ${colors.primary}, ${colors.accent});border-radius:${trackHeight}px;"></div>
      </div>
      <div style="position:absolute;top:0;left:calc(${(progress * 100).toFixed(3)}% - ${Math.round(knobSize / 2)}px);width:${knobSize}px;height:${knobSize}px;border-radius:50%;border:1px solid ${colors.decoLineDiamond};background:${colors.bg};box-shadow:0 0 0 ${Math.max(2, scaleW(vp, 2, layout.baseW))}px rgba(232,196,122,0.12);"></div>
    </div>
  `;
}

export function screenshots() {
  return [
    { t: 0.5, label: "start" },
    { t: 20, label: "midway" },
    { t: 70, label: "near-end" },
  ];
}

export function lint(params) {
  const errors = [];
  if (typeof params.duration !== "number" || params.duration <= 0) {
    errors.push("duration must be a positive number");
  }
  return { ok: errors.length === 0, errors };
}
