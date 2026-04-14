export const meta = {
  id: "interviewBg",
  version: 1,
  ratio: "9:16",
  category: "backgrounds",
  label: "Interview Background",
  description: "访谈节目深色背景。纯色 + 底部渐变光晕，营造专业访谈节目感。",
  tags: ["interview", "background", "dark", "podcast", "talk-show"],
  mood: ["professional", "serious", "broadcast"],
  theme: ["interview", "podcast", "news"],
  tech: "dom",
  duration_hint: 81,
  loopable: true,
  z_hint: "bottom",
  default_theme: "midnight-blue",
  themes: {
    "midnight-blue":  { bgHue: 220, accentHue: 200, bgLightness: 7 },
    "charcoal-warm":  { bgHue: 25,  accentHue: 35,  bgLightness: 8 },
    "deep-purple":    { bgHue: 270, accentHue: 250, bgLightness: 7 },
    "pure-black":     { bgHue: 0,   accentHue: 0,   bgLightness: 5 },
  },
  params: {
    bgHue:       { type: "number", default: 220, range: [0, 360], step: 1, label: "背景色相", semantic: "hue for the dark background color", group: "color" },
    accentHue:   { type: "number", default: 200, range: [0, 360], step: 1, label: "光晕色相", semantic: "hue for the subtle bottom glow", group: "color" },
    bgLightness: { type: "number", default: 7,   range: [3, 20],  step: 1, label: "背景亮度", semantic: "background lightness 3=near-black 10=dark-gray", group: "color" },
  },
  ai: {
    when: "访谈/播客类视频的底层背景。放最底层，上面叠视频区、字幕等。",
    example: { bgHue: 220, accentHue: 200, bgLightness: 7 },
    avoid: "不要用于亮色背景场景",
  },
};

export function render(t, params, vp) {
  const { bgHue, accentHue, bgLightness } = params;
  const W = vp.width, H = vp.height;
  const bg = `hsl(${bgHue},18%,${bgLightness}%)`;
  const glow = `radial-gradient(ellipse 80% 30% at 50% 100%, hsla(${accentHue},60%,25%,0.4) 0%, transparent 70%)`;
  return `<div style="width:${W}px;height:${H}px;background:${bg};position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:${glow}"></div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0,  label: "初始背景" },
    { t: 20, label: "静态背景中段" },
    { t: 60, label: "背景末尾" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.bgHue < 0 || params.bgHue > 360) errors.push("bgHue 超出范围 [0, 360]。Fix: 设为 0–360");
  if (params.bgLightness < 3 || params.bgLightness > 20) errors.push("bgLightness 超出范围 [3, 20]。Fix: 设为 3–20");
  return { ok: errors.length === 0, errors };
}
