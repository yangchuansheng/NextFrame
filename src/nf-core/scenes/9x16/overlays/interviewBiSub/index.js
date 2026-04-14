/**
 * interviewBiSub — 访谈双语字幕层
 *
 * 根据时间轴显示当前字幕段。每段包含：
 *   - speaker: 说话人标签（如 "DARIO" / "DWARKESH"）
 *   - en:      英文原文
 *   - zh:      中文翻译
 *   - start:   字幕开始时间（秒）
 *   - end:     字幕结束时间（秒）
 *
 * 设计：底部卡片式，半透明深色背景，EN 大字 + ZH 小字，左侧说话人标签。
 */

export const meta = {
  id: "interviewBiSub",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Bilingual Subtitle",
  description: "访谈双语字幕。底部卡片式，显示英文原文 + 中文翻译 + 说话人标签。按时间轴自动切换。",
  tags: ["subtitle", "bilingual", "interview", "caption", "en-zh", "overlay"],
  mood: ["professional", "broadcast", "informative"],
  theme: ["interview", "podcast", "educational"],
  tech: "dom",
  duration_hint: 81,
  loopable: false,
  z_hint: "top",
  default_theme: "dark-glass",
  themes: {
    "dark-glass": { cardOpacity: 0.82, enHue: 0, zhHue: 200, speakerHue: 35 },
    "warm-glass": { cardOpacity: 0.80, enHue: 0, zhHue: 35,  speakerHue: 200 },
    "cool-glass": { cardOpacity: 0.85, enHue: 0, zhHue: 180, speakerHue: 260 },
  },
  params: {
    segments: {
      type: "array",
      default: [
        { speaker: "DWARKESH", en: "So we talked three years ago.", zh: "我们三年前谈过一次。", start: 2, end: 8 },
        { speaker: "DARIO",    en: "The underlying technology exponential has gone about as I expected.", zh: "底层技术的指数增长，基本跟我预期差不多。", start: 10, end: 20 },
      ],
      label: "字幕段落",
      semantic: "array of subtitle segments each with speaker/en/zh/start/end",
      group: "content",
    },
    cardOpacity: { type: "number", default: 0.82, range: [0.4, 1], step: 0.02, label: "卡片透明度", semantic: "card background opacity", group: "style" },
    enHue:       { type: "number", default: 0,   range: [0, 360],  step: 1,    label: "英文色相",   semantic: "hue for english text, 0=white", group: "color" },
    zhHue:       { type: "number", default: 200, range: [0, 360],  step: 1,    label: "中文色相",   semantic: "hue for chinese text", group: "color" },
    speakerHue:  { type: "number", default: 35,  range: [0, 360],  step: 1,    label: "说话人色相", semantic: "hue for speaker label badge", group: "color" },
  },
  ai: {
    when: "访谈视频的双语字幕层。放最顶层，叠加在视频区和背景之上。",
    how: "segments 数组传入字幕时间轴，每段有 start/end 时间（秒）。组件自动按 t 显示当前段。",
    example: {
      segments: [
        { speaker: "DWARKESH", en: "So we talked three years ago.", zh: "我们三年前谈过一次。", start: 2, end: 8 },
      ],
    },
    avoid: "en 文字不超过 80 字符，zh 文字不超过 40 字符，否则可能溢出",
  },
};

export function render(t, params, vp) {
  const { segments, cardOpacity, enHue, zhHue, speakerHue } = params;
  const W = vp.width, H = vp.height;

  // Find current segment
  const seg = (segments || []).find(s => t >= s.start && t < s.end);

  if (!seg) {
    // No subtitle — render transparent placeholder
    return `<div style="width:${W}px;height:${H}px;position:relative"></div>`;
  }

  // Fade in/out
  const fadeDur = 0.25;
  const segDur = seg.end - seg.start;
  const localT = t - seg.start;
  const fadeIn  = Math.min(1, localT / fadeDur);
  const fadeOut = localT > segDur - fadeDur ? Math.min(1, (segDur - localT) / fadeDur) : 1;
  const opacity = fadeIn * fadeOut;

  const px = W * 0.05;
  const cardPx = W * 0.055;
  const cardPy = H * 0.018;
  const cardBottom = H * 0.045;
  const cardMaxW = W - px * 2;

  const speakerColor = `hsl(${speakerHue},80%,65%)`;
  const speakerBg    = `hsla(${speakerHue},60%,50%,0.18)`;
  const speakerBorder= `hsla(${speakerHue},60%,50%,0.35)`;
  const enColor      = enHue === 0 ? "rgba(255,255,255,0.95)" : `hsl(${enHue},20%,90%)`;
  const zhColor      = `hsl(${zhHue},55%,72%)`;
  const cardBg       = `rgba(8,10,18,${cardOpacity})`;

  const enFontSize   = W * 0.042;
  const zhFontSize   = W * 0.034;
  const speakerSize  = W * 0.025;

  return `<div style="width:${W}px;height:${H}px;position:relative;opacity:${opacity}">
  <div style="position:absolute;bottom:${cardBottom}px;left:${px}px;width:${cardMaxW}px;background:${cardBg};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:${W * 0.03}px;border:1px solid rgba(255,255,255,0.07);padding:${cardPy}px ${cardPx}px">
    <!-- speaker badge -->
    <div style="display:inline-flex;align-items:center;padding:${H * 0.004}px ${W * 0.028}px;background:${speakerBg};border:1px solid ${speakerBorder};border-radius:${W * 0.02}px;margin-bottom:${H * 0.008}px">
      <span style="font-size:${speakerSize}px;font-weight:700;color:${speakerColor};letter-spacing:0.1em;font-family:-apple-system,sans-serif">${seg.speaker}</span>
    </div>
    <!-- English text -->
    <div style="font-size:${enFontSize}px;color:${enColor};line-height:1.45;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;font-weight:500;margin-bottom:${H * 0.007}px">${seg.en}</div>
    <!-- Chinese text -->
    <div style="font-size:${zhFontSize}px;color:${zhColor};line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC',sans-serif;font-weight:400">${seg.zh}</div>
  </div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0,    label: "无字幕（片头）" },
    { t: 2.2,  label: "第一段字幕（淡入）" },
    { t: 5,    label: "第一段字幕显示中" },
    { t: 10.2, label: "第二段字幕" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (!params.segments || !Array.isArray(params.segments)) {
    errors.push("segments 必须是数组。Fix: 传入字幕段落数组");
    return { ok: false, errors };
  }
  params.segments.forEach((seg, i) => {
    if (!seg.speaker) errors.push(`segments[${i}] 缺少 speaker。Fix: 添加说话人名称`);
    if (!seg.en)      errors.push(`segments[${i}] 缺少 en（英文字幕）。Fix: 添加英文文本`);
    if (!seg.zh)      errors.push(`segments[${i}] 缺少 zh（中文字幕）。Fix: 添加中文翻译`);
    if (seg.start === undefined || seg.end === undefined) {
      errors.push(`segments[${i}] 缺少 start/end 时间。Fix: 添加 start 和 end（秒）`);
    } else if (seg.end <= seg.start) {
      errors.push(`segments[${i}] end(${seg.end}) 必须大于 start(${seg.start})。Fix: 修正时间区间`);
    }
    if (seg.en && seg.en.length > 120) errors.push(`segments[${i}] en 超过 120 字符，可能溢出。Fix: 缩短英文字幕`);
    if (seg.zh && seg.zh.length > 60)  errors.push(`segments[${i}] zh 超过 60 字符，可能溢出。Fix: 缩短中文字幕`);
  });
  return { ok: errors.length === 0, errors };
}
