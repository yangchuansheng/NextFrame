export const meta = {
  id: "interviewBg",
  version: 1,
  ratio: "9:16",
  category: "backgrounds",
  label: "Interview Background",
  description: "深黑访谈背景，纯黑底色带微弱橙色光晕，营造访谈氛围",
  tech: "dom",
  duration_hint: 20,
  loopable: true,
  z_hint: "bottom",
  tags: ["backgrounds", "interview", "dark", "9x16"],
  mood: ["professional", "focused"],
  theme: ["interview", "tech"],
  default_theme: "dark-interview",
  themes: {
    "dark-interview": { bg: "#0a0a0a", glowColor: "rgba(218,119,86,0.10)", glowX: 50, glowY: 45, glowSize: 60 },
  },
  params: {
    bg: { type: "color", default: "#0a0a0a", label: "背景色", group: "color" },
    glowColor: { type: "color", default: "rgba(218,119,86,0.10)", label: "光晕色", group: "color" },
    glowX: { type: "number", default: 50, label: "光晕 X(%)", group: "layout", range: [0, 100], step: 1 },
    glowY: { type: "number", default: 45, label: "光晕 Y(%)", group: "layout", range: [0, 100], step: 1 },
    glowSize: { type: "number", default: 60, label: "光晕尺寸(%)", group: "style", range: [10, 120], step: 1 },
  },
  ai: {
    when: "访谈切片竖屏视频的背景层，9:16比例",
    how: "放在最底层作为全屏背景。{ scene: \"interviewBg\", start: 0, dur: 20, params: {} }",
    example: { bg: "#0a0a0a", glowColor: "rgba(218,119,86,0.10)", glowX: 50, glowY: 45, glowSize: 60 },
    avoid: "不要叠加其他背景；glowColor太亮会影响字幕可读性",
    pairs_with: ["interviewTopBar", "interviewBiSub", "progressBar9x16"],
  },
};

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function ease3(p) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3); }

export function render(t, params, vp) {
  const bg = params.bg || "#0a0a0a";
  const glowColor = params.glowColor || "rgba(218,119,86,0.10)";
  const glowX = Number.isFinite(params.glowX) ? params.glowX : 50;
  const glowY = Number.isFinite(params.glowY) ? params.glowY : 45;
  const glowSize = Number.isFinite(params.glowSize) ? params.glowSize : 60;
  const glow = `radial-gradient(circle at ${glowX}% ${glowY}%, ${glowColor} 0%, transparent ${glowSize}%)`;
  const vignette = "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.0) 70%, rgba(0,0,0,0.5) 100%)";
  return `<div style="position:absolute;left:0;top:0;width:${vp.width}px;height:${vp.height}px;overflow:hidden;background:${bg}">
  <div style="position:absolute;inset:0;background:${glow}"></div>
  <div style="position:absolute;inset:0;background:${vignette}"></div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0, label: "访谈背景" },
    { t: 10, label: "中段静帧" },
    { t: 19, label: "结尾" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (!params.bg) errors.push("bg 不能为空。Fix: 传入背景色");
  return { ok: errors.length === 0, errors };
}
