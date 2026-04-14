export const meta = {
  id: "progressBar9x16",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Progress Bar 9:16",
  description: "底部进度条 9:16，根据 t/duration 自动推进，带橙色强调色",
  tech: "dom",
  duration_hint: 20,
  loopable: false,
  z_hint: "top",
  tags: ["overlays", "progressbar", "9x16"],
  mood: ["professional"],
  theme: ["interview", "tech"],
  default_theme: "dark-interview",
  themes: {
    "dark-interview": { color: "#da7756", trackColor: "rgba(245,236,224,0.1)", height: 4 },
  },
  params: {
    duration: { type: "number", default: 20, label: "总时长(秒)", group: "timing" },
    color: { type: "color", default: "#da7756", label: "进度条颜色", group: "color" },
    trackColor: { type: "color", default: "rgba(245,236,224,0.1)", label: "轨道颜色", group: "color" },
    height: { type: "number", default: 4, label: "高度(px)", group: "style", range: [2, 12], step: 1 },
  },
  ai: {
    when: "访谈切片底部进度条，全程显示播放进度",
    how: "{ scene: \"progressBar9x16\", start: 0, dur: 20, params: { duration: 20 } }",
    example: { duration: 20, color: "#da7756", height: 4 },
    avoid: "不要同时显示两条进度条",
    pairs_with: ["interviewBg", "interviewTopBar", "interviewBiSub"],
  },
};

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export function render(t, params, vp) {
  const duration = Number.isFinite(params.duration) && params.duration > 0 ? params.duration : 20;
  const color = params.color || "#da7756";
  const trackColor = params.trackColor || "rgba(245,236,224,0.1)";
  const height = Number.isFinite(params.height) ? Math.max(2, params.height) : 4;
  const progress = Math.max(0, Math.min(1, t / duration));
  const progressW = Math.round(vp.width * progress);

  return `<div style="position:absolute;left:0;bottom:0;width:${vp.width}px;height:${height}px;background:${trackColor};pointer-events:none">
  <div style="position:absolute;left:0;top:0;height:100%;width:${progressW}px;background:${color}"></div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0, label: "进度条开始" },
    { t: 10, label: "进度50%" },
    { t: 19.9, label: "进度条结束" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.duration <= 0) errors.push("duration 必须大于0。Fix: 传入视频总时长");
  return { ok: errors.length === 0, errors };
}
