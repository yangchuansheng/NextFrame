import { getPreset, esc, scaleW, scaleH, findActiveSub, fadeIn } from "../../../shared/design.js";

const PRESET_NAME = "interview-dark";

const SAMPLE_SEGMENTS = [
  {
    s: 0,
    e: 3.2,
    speaker: "dwarkesh",
    en: "Three years ago, we had this conversation in a much calmer world.",
    cn: [
      { s: 0, e: 1.5, text: "我们三年前谈过一次。" },
      { s: 1.5, e: 3.2, text: "那时外界还没意识到曲线有多陡。" },
    ],
  },
  {
    s: 3.2,
    e: 6.8,
    speaker: "dario",
    en: "Now the capabilities are moving so fast that the public signal is still lagging behind reality.",
    cn: [
      { s: 3.2, e: 5.2, text: "现在能力爬升得太快了。" },
      { s: 5.2, e: 6.8, text: "公众感知仍然落后于现实。" },
    ],
  },
];

function speakerColor(colors, speaker) {
  if (!speaker) return colors.primary;
  const normalized = String(speaker).toLowerCase();
  return normalized.includes("dwarkesh") ? colors.text : colors.primary;
}

export const meta = {
  id: "interviewBiSub",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Bilingual Subtitle",
  description: "Portrait bilingual subtitle block that reads fine.json segments via findActiveSub for Chinese and English timing.",
  tech: "dom",
  duration_hint: 81,
  tags: ["interview", "subtitle", "bilingual"],
  mood: ["editorial"],
  theme: ["interview-dark"],
  default_theme: PRESET_NAME,
  themes: {
    "interview-dark": {},
    "interview-soft": {},
    "interview-contrast": {},
  },
  params: {
    segments: { type: "array", default: SAMPLE_SEGMENTS, label: "fine.json segments", group: "content", semantic: "fine-segments" },
  },
  ai: {
    when: "Use for portrait interview clips that already have fine.json bilingual segments.",
    how: "Pass fine.json.segments directly without flattening; render uses findActiveSub(params.segments, t).",
    example: {},
    avoid: "Do not pass flattened SRT rows because English will repeat on each Chinese child cue.",
    pairs_with: ["interviewChrome", "interviewVideoArea", "progressBar9x16"],
  },
};

export function render(t, params, vp) {
  const preset = getPreset(PRESET_NAME);
  const { colors, layout, type } = preset;
  const active = findActiveSub(params.segments, t);
  if (!active) {
    return `<div style="position:absolute;left:${scaleW(vp, layout.subs.left, layout.baseW)}px;right:${scaleW(vp, layout.subs.right, layout.baseW)}px;top:${scaleH(vp, layout.subs.top, layout.baseH)}px;height:${scaleH(vp, layout.subs.height, layout.baseH)}px;"></div>`;
  }

  const top = scaleH(vp, layout.subs.top, layout.baseH);
  const left = scaleW(vp, layout.subs.left, layout.baseW);
  const right = scaleW(vp, layout.subs.right, layout.baseW);
  const height = scaleH(vp, layout.subs.height, layout.baseH);
  const cnSize = scaleW(vp, type.cnSub.size, layout.baseW);
  const enSize = scaleW(vp, type.enSub.size, layout.baseW);
  const opacity = fadeIn(t, 0, 0.18);
  const cnColor = speakerColor(colors, active.speaker);
  const speakerName = active.speaker ? String(active.speaker).toUpperCase() : "";

  return `
    <div style="position:absolute;left:${left}px;right:${right}px;top:${top}px;height:${height}px;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;text-align:center;pointer-events:none;opacity:${opacity};">
      <div style="padding:${scaleH(vp, 10, layout.baseH)}px ${scaleW(vp, 18, layout.baseW)}px;border:1px solid ${colors.tagBorder};border-radius:${scaleW(vp, 999, layout.baseW)}px;background:${colors.tagBg};font-family:${type.clipLabel.font};font-size:${scaleW(vp, 16, layout.baseW)}px;font-weight:${type.clipLabel.weight};letter-spacing:${type.clipLabel.spacing};color:${colors.tagText};text-transform:uppercase;">
        ${esc(speakerName || "Speaker")}
      </div>
      <div style="margin-top:${scaleH(vp, 18, layout.baseH)}px;font-family:${type.cnSub.font};font-size:${cnSize}px;font-weight:${type.cnSub.weight};line-height:${type.cnSub.lineHeight};color:${cnColor};text-shadow:0 ${scaleH(vp, 4, layout.baseH)}px ${scaleW(vp, 24, layout.baseW)}px rgba(0,0,0,0.38);max-width:100%;">
        ${esc(active.cn || "")}
      </div>
      <div style="margin-top:${scaleH(vp, 14, layout.baseH)}px;font-family:${type.enSub.font};font-size:${enSize}px;font-weight:${type.enSub.weight};line-height:${type.enSub.lineHeight};color:${colors.textDim};font-style:italic;max-width:100%;">
        ${esc(active.en || "")}
      </div>
    </div>
  `;
}

export function screenshots() {
  return [
    { t: 0.5, label: "subtitle-start" },
    { t: 4, label: "speaker-switch" },
    { t: 6, label: "english-and-chinese" },
  ];
}

export function lint(params) {
  const errors = [];
  if (!Array.isArray(params.segments)) {
    errors.push("segments must be an array");
  } else {
    const sample = params.segments[0];
    if (sample && (typeof sample.s !== "number" || typeof sample.e !== "number" || !Array.isArray(sample.cn))) {
      errors.push("segments must keep fine.json shape: {s,e,speaker,en,cn[]}");
    }
  }
  return { ok: errors.length === 0, errors };
}
