export const meta = {
  id: "lowerThirdVelvet",
  ratio: "9:16",
  category: "overlays",
  label: "Lower Third Velvet",
  description: "下方标题栏，擦入 + 打字机 + 脉冲点",
  tech: "dom",
  duration_hint: 6,
  loopable: false,
  tags: ["lower-third", "title", "overlay", "wipe", "name", "caption"],
  mood: ["professional", "elegant", "broadcast"],
  theme: ["broadcast", "news", "brand", "vlog"],
  z_hint: "top",

  default_theme: "warm-accent",
  themes: {
    "warm-accent":   { hueA: 20,  hueB: 320, holdEnd: 4, fadeOut: 0.6 },
    "cool-blue":     { hueA: 210, hueB: 240, holdEnd: 4, fadeOut: 0.5 },
    "neon-pink":     { hueA: 330, hueB: 280, holdEnd: 3, fadeOut: 0.4 },
    "green-nature":  { hueA: 130, hueB: 160, holdEnd: 5, fadeOut: 0.8 },
    "mono-white":    { hueA: 0,   hueB: 0,   holdEnd: 4, fadeOut: 0.6 },
  },

  params: {
    title:    { type: "string", default: "NEXTFRAME", required: true, label: "标题", semantic: "main title text", group: "content" },
    subtitle: { type: "string", default: "AI Video Engine", label: "副标题", semantic: "subtitle text", group: "content" },
    hueA:     { type: "number", default: 20, range: [0, 360], step: 1, label: "主色相", semantic: "primary accent hue", group: "color" },
    hueB:     { type: "number", default: 320, range: [0, 360], step: 1, label: "副色相", semantic: "secondary accent hue", group: "color" },
    holdEnd:  { type: "number", default: 4, range: [0.5, 20], step: 0.5, label: "持续到(s)", semantic: "when to start exit animation", group: "animation" },
    fadeOut:  { type: "number", default: 0.6, range: [0.1, 4], step: 0.1, label: "淡出时长(s)", semantic: "exit animation duration", group: "animation" },
  },
  ai: {
    when: "画面下方显示标题/人名/标注/品牌。适合：人物介绍、章节标注、品牌 watermark。",
    how: "放在最上层（z_hint: top）。title 是主文字，subtitle 是辅助信息。自带擦入/打字机/脉冲点动画。",
    example: { title: "NEXTFRAME", subtitle: "AI Video Engine" },
    theme_guide: "warm-accent=暖色调, cool-blue=冷蓝, neon-pink=霓虹粉, green-nature=自然绿, mono-white=白色极简",
    avoid: "标题超过 20 字符会溢出。holdEnd 太短标题还没打完就退出。",
    pairs_with: ["auroraGradient", "kineticHeadline", "barChartReveal"],
  },
};

export function render(t, params, vp) {
  const { title, subtitle, hueA, hueB, holdEnd, fadeOut } = params;
  const W = vp.width, H = vp.height;

  // phases: wipe-in (0-0.4), hold (0.4-holdEnd), wipe-out (holdEnd-holdEnd+fadeOut)
  const wipeInDur = 0.4;
  const wipeIn = Math.min(1, t / wipeInDur);
  const wipeOut = t > holdEnd ? Math.min(1, (t - holdEnd) / fadeOut) : 0;
  const barVisible = wipeIn * (1 - wipeOut);

  const typeProgress = Math.max(0, Math.min(1, (t - 0.2) / (title.length * 0.06)));
  const visibleChars = Math.round(typeProgress * title.length);
  const titleText = title.substring(0, visibleChars);

  const subOpacity = Math.max(0, Math.min(1, (t - wipeInDur - 0.3) / 0.4)) * (1 - wipeOut);
  const dotPulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 3));

  const barY = H * 0.78;
  const barH = H * 0.1;
  const clipRight = barVisible * 100;
  const fontSize = W * 0.042;

  return `<div style="width:${W}px;height:${H}px;position:relative;background:transparent;overflow:hidden;font-family:Inter,-apple-system,sans-serif">
  <div style="position:absolute;left:${W * 0.06}px;top:${barY}px;width:${W * 0.88}px;height:${barH}px;clip-path:inset(0 ${100 - clipRight}% 0 0);background:rgba(10,10,18,0.7);backdrop-filter:blur(20px);border-radius:${W * 0.015}px;border:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;justify-content:center;padding:0 ${W * 0.05}px">
    <div style="display:flex;align-items:center;gap:${W * 0.02}px">
      <div style="width:${W * 0.012}px;height:${W * 0.012}px;border-radius:50%;background:hsl(${hueA},80%,60%);opacity:${dotPulse};box-shadow:0 0 ${W * 0.01}px hsl(${hueA},80%,60%)"></div>
      <span style="font-size:${fontSize}px;font-weight:700;color:rgba(255,255,255,0.92);letter-spacing:0.05em">${titleText}<span style="opacity:${(t * 4) % 1 > 0.5 ? 0 : 0.7};color:hsl(${hueB},70%,65%)">|</span></span>
    </div>
    <span style="font-size:${fontSize * 0.55}px;color:rgba(255,255,255,${subOpacity * 0.5});margin-top:${H * 0.005}px;margin-left:${W * 0.034}px;letter-spacing:0.08em">${subtitle}</span>
  </div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0.3, label: "擦入中" },
    { t: 2, label: "标题显示" },
    { t: 4.5, label: "即将退出" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (!params.title || params.title.trim().length === 0) {
    errors.push("title 不能为空。Fix: 传入标题文字");
  }
  const titleW = params.title.length * vp.width * 0.042 * 0.6;
  const safeW = vp.width * 0.75;
  if (titleW > safeW) {
    errors.push(`标题"${params.title}"预估宽度 ${Math.round(titleW)}px 超出栏内安全区 ${Math.round(safeW)}px。Fix: 缩短到 ${Math.floor(safeW / (vp.width * 0.042 * 0.6))} 字符以内`);
  }
  if (params.holdEnd < 1) {
    errors.push("holdEnd 太短，标题还没打完字就退出了。Fix: 至少设为 1 秒");
  }
  return { ok: errors.length === 0, errors };
}
