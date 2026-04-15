import { getPreset, esc, scaleW, scaleH } from "../../../shared/design.js";

const PRESET_NAME = "interview-dark";
const preset = getPreset(PRESET_NAME);
const layout = preset.layout || {};

function pct(value, total) {
  return Number((((value || 0) / (total || 1)) * 100).toFixed(4));
}

function pctString(value, total) {
  return `${pct(value, total)}%`;
}

export const meta = {
  id: "interviewVideoArea",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Video Area",
  description: "Portrait interview video slot placeholder with recorder overlay metadata for the real clip.",
  tech: "dom",
  duration_hint: 81,
  videoOverlay: {
    x: pctString(layout.video?.left, layout.baseW),
    y: pctString(layout.video?.top, layout.baseH),
    w: pctString((layout.baseW || 0) - (layout.video?.left || 0) - (layout.video?.right || 0), layout.baseW),
    h: pctString(layout.video?.height, layout.baseH),
  },
  tags: ["interview", "video", "portrait"],
  mood: ["editorial"],
  theme: ["interview-dark"],
  default_theme: PRESET_NAME,
  themes: {
    "interview-dark": {},
    "interview-soft": {},
    "interview-contrast": {},
  },
  params: {
    src: { type: "string", default: "/absolute/path/to/clip_01.mp4", label: "视频源", group: "content" },
    clipLabel: { type: "string", default: "CLIP 01 / 01", label: "片段标签", group: "content" },
  },
  ai: {
    when: "Use for the interview clip video window inside a 9:16 composition.",
    how: "Keep it full-duration and pass the real clip path through params.src; recorder will overlay the source video into this slot.",
    example: {},
    avoid: "Do not use as a fullscreen background video layer.",
    pairs_with: ["interviewChrome", "interviewBiSub", "progressBar9x16"],
  },
};

export function render(t, params, vp) {
  const presetNow = getPreset(PRESET_NAME);
  const colors = presetNow.colors || {};
  const currentLayout = presetNow.layout || {};
  const left = scaleW(vp, currentLayout.video.left, currentLayout.baseW);
  const right = scaleW(vp, currentLayout.video.right, currentLayout.baseW);
  const top = scaleH(vp, currentLayout.video.top, currentLayout.baseH);
  const height = scaleH(vp, currentLayout.video.height, currentLayout.baseH);
  const radius = scaleW(vp, 12, currentLayout.baseW);
  const labelSize = scaleW(vp, presetNow.type?.clipLabel?.size || 14, currentLayout.baseW);
  const labelPadY = scaleH(vp, 7, currentLayout.baseH);
  const labelPadX = scaleW(vp, 12, currentLayout.baseW);
  const shineOffset = Math.round((t * 60) % Math.max(scaleW(vp, 360, currentLayout.baseW), 1));

  return `
    <div style="position:absolute;left:${left}px;right:${right}px;top:${top}px;height:${height}px;border-radius:${radius}px;overflow:hidden;background:
      linear-gradient(135deg, rgba(0,0,0,0.95), ${colors.bg}),
      radial-gradient(circle at 30% 20%, ${colors.glowTop}, transparent 50%);
      box-shadow:0 ${scaleH(vp, 16, currentLayout.baseH)}px ${scaleW(vp, 40, currentLayout.baseW)}px rgba(0,0,0,0.35), inset 0 0 0 1px ${colors.decoLineDiamond};">
      <div style="position:absolute;inset:0;background:
        linear-gradient(90deg, transparent, ${colors.decoLine} ${Math.max(18, shineOffset)}%, transparent ${Math.max(28, shineOffset + 14)}%),
        linear-gradient(180deg, rgba(255,255,255,0.03), transparent 45%);
      "></div>
      <div style="position:absolute;inset:${scaleW(vp, 18, currentLayout.baseW)}px;border:1px solid ${colors.decoLineDiamond};border-radius:${Math.max(radius - 6, 2)}px;"></div>
      <div style="position:absolute;left:${scaleW(vp, 18, currentLayout.baseW)}px;top:${scaleH(vp, 18, currentLayout.baseH)}px;padding:${labelPadY}px ${labelPadX}px;border-radius:${scaleW(vp, 8, currentLayout.baseW)}px;border:1px solid ${colors.tagBorder};background:${colors.tagBg};font-family:${presetNow.type?.clipLabel?.font};font-size:${labelSize}px;font-weight:${presetNow.type?.clipLabel?.weight || 500};letter-spacing:${presetNow.type?.clipLabel?.spacing || "0.08em"};color:${colors.primary};">
        ${esc(params.clipLabel)}
      </div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%, -50%);display:flex;flex-direction:column;align-items:center;gap:${scaleH(vp, 16, currentLayout.baseH)}px;color:${colors.textDim};text-align:center;">
        <div style="width:${scaleW(vp, 96, currentLayout.baseW)}px;height:${scaleW(vp, 96, currentLayout.baseW)}px;border-radius:50%;border:1px solid ${colors.decoLineDiamond};display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.02);font-family:${presetNow.type?.brand?.font};font-size:${scaleW(vp, 28, currentLayout.baseW)}px;color:${colors.primary};">
          ▶
        </div>
        <div style="font-family:${presetNow.type?.timeInfo?.font};font-size:${scaleW(vp, 18, currentLayout.baseW)}px;letter-spacing:${presetNow.type?.timeInfo?.spacing || "0.05em"};text-transform:uppercase;">
          Recorder will composite source video here
        </div>
      </div>
    </div>
  `;
}

export function screenshots() {
  return [
    { t: 0.5, label: "slot" },
    { t: 5, label: "placeholder" },
    { t: 40, label: "video-overlay-zone" },
  ];
}

export function lint(params) {
  const errors = [];
  if (!params.src || typeof params.src !== "string") errors.push("src is required");
  if (!params.clipLabel) errors.push("clipLabel is required");
  return { ok: errors.length === 0, errors };
}
