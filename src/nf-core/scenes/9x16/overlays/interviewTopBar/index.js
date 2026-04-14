export const meta = {
  id: "interviewTopBar",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Top Bar",
  description: "访谈视频顶部信息栏。显示节目名称（带 logo 圆点）+ 嘉宾姓名 + 期号标签。淡入动画。",
  tags: ["interview", "header", "topbar", "podcast", "title", "overlay"],
  mood: ["professional", "broadcast", "clean"],
  theme: ["interview", "podcast", "news"],
  tech: "dom",
  duration_hint: 81,
  loopable: true,
  z_hint: "top",
  default_theme: "silicon-valley",
  themes: {
    "silicon-valley": { accentHue: 200, showTag: true },
    "warm-podcast":   { accentHue: 35,  showTag: true },
    "minimal-white":  { accentHue: 0,   showTag: false },
  },
  params: {
    seriesName:   { type: "string",  default: "硅谷访谈",  required: true,  label: "节目名称",   semantic: "series/show name displayed in top bar", group: "content" },
    guestName:    { type: "string",  default: "Dario Amodei", required: true, label: "嘉宾姓名",  semantic: "guest name displayed prominently", group: "content" },
    episodeTag:   { type: "string",  default: "EP.01",    label: "期号标签",  semantic: "episode label shown as a tag", group: "content" },
    accentHue:    { type: "number",  default: 200, range: [0, 360], step: 1, label: "强调色色相", semantic: "hue for accent elements (dot, tag)", group: "color" },
    showTag:      { type: "boolean", default: true,  label: "显示期号标签",  semantic: "whether to show episode tag", group: "style" },
  },
  ai: {
    when: "访谈/播客视频顶部固定信息栏。放最顶层，全程显示。",
    example: { seriesName: "硅谷访谈", guestName: "Dario Amodei", episodeTag: "EP.01" },
    avoid: "seriesName 不超过 8 个字，guestName 不超过 20 个字符",
  },
};

export function render(t, params, vp) {
  const { seriesName, guestName, episodeTag, accentHue, showTag } = params;
  const W = vp.width, H = vp.height;

  const fadeIn = Math.min(1, t / 0.5);
  const px = W * 0.055;
  const barH = H * 0.095;

  const accentColor = `hsl(${accentHue},70%,60%)`;
  const accentBg = `hsla(${accentHue},60%,50%,0.15)`;
  const accentBorder = `hsla(${accentHue},60%,50%,0.3)`;

  const seriesFontSize = W * 0.035;
  const guestFontSize = W * 0.05;
  const tagFontSize = W * 0.028;

  return `<div style="width:${W}px;height:${H}px;position:relative;opacity:${fadeIn}">
  <div style="position:absolute;top:0;left:0;right:0;height:${barH}px;padding:0 ${px}px;display:flex;flex-direction:column;justify-content:center;gap:${H * 0.006}px">
    <!-- series row -->
    <div style="display:flex;align-items:center;gap:${W * 0.02}px">
      <div style="width:${W * 0.014}px;height:${W * 0.014}px;border-radius:50%;background:${accentColor};box-shadow:0 0 ${W * 0.01}px ${accentColor}"></div>
      <span style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;font-size:${seriesFontSize}px;color:rgba(255,255,255,0.55);letter-spacing:0.06em;font-weight:500">${seriesName}</span>
      ${showTag ? `<div style="margin-left:auto;padding:${H * 0.003}px ${W * 0.022}px;background:${accentBg};border:1px solid ${accentBorder};border-radius:${W * 0.025}px">
        <span style="font-size:${tagFontSize}px;color:${accentColor};font-weight:600;letter-spacing:0.08em">${episodeTag}</span>
      </div>` : ""}
    </div>
    <!-- guest name row -->
    <div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;font-size:${guestFontSize}px;font-weight:700;color:rgba(255,255,255,0.92);letter-spacing:0.01em">${guestName}</div>
  </div>
  <!-- thin separator line -->
  <div style="position:absolute;top:${barH}px;left:${px}px;right:${px}px;height:1px;background:rgba(255,255,255,0.07)"></div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0.1, label: "淡入中" },
    { t: 1,   label: "完全显示" },
    { t: 40,  label: "持续显示中段" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (!params.seriesName || params.seriesName.length === 0) errors.push("seriesName 不能为空。Fix: 设置节目名称");
  if (!params.guestName  || params.guestName.length === 0)  errors.push("guestName 不能为空。Fix: 设置嘉宾姓名");
  if (params.guestName && params.guestName.length > 30)     errors.push("guestName 超过 30 字符可能溢出。Fix: 缩短嘉宾名");
  if (params.seriesName && params.seriesName.length > 12)   errors.push("seriesName 超过 12 字符可能溢出。Fix: 缩短节目名");
  return { ok: errors.length === 0, errors };
}
