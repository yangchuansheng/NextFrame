export const meta = {
  // ─── 身份 ───
  id: "typewriterText",
  version: 1,
  ratio: "9:16",

  // ─── 分类与发现 ───
  category: "typography",
  label: "Typewriter Text",
  description: "多行文字逐行出现，带打字机效果和闪烁光标。每行打完后停顿，再开始下一行。适合诗句、引言、逐步披露的信息。",
  tags: ["typewriter", "text", "reveal", "lines", "cursor", "poem", "quote", "stagger"],
  mood: ["thoughtful", "dramatic", "literary", "calm"],
  theme: ["poetry", "quote", "storytelling", "tech"],

  // ─── 渲染 ───
  tech: "dom",
  duration_hint: 12,
  loopable: false,
  z_hint: "middle",

  // ─── 主题预设（5 个）───
  default_theme: "obsidian-white",
  themes: {
    "obsidian-white":  { hue: 0,   saturation: 0,  lightness: 92, bgOpacity: 0, charDelay: 0.06, lineGap: 0.5 },
    "aurora-cyan":     { hue: 180, saturation: 75, lightness: 70, bgOpacity: 0, charDelay: 0.07, lineGap: 0.6 },
    "neon-green":      { hue: 120, saturation: 80, lightness: 55, bgOpacity: 0, charDelay: 0.05, lineGap: 0.4 },
    "warm-amber":      { hue: 38,  saturation: 90, lightness: 68, bgOpacity: 0, charDelay: 0.08, lineGap: 0.6 },
    "violet-dream":    { hue: 270, saturation: 70, lightness: 72, bgOpacity: 0, charDelay: 0.06, lineGap: 0.5 },
  },

  // ─── 参数 ───
  params: {
    lines: {
      type: "array",
      default: ["In the beginning", "there was nothing.", "Then came light.", "And then, video."],
      label: "文字行数组",
      semantic: "array of text lines, each line appears one by one with typewriter effect, max 8 lines recommended",
      group: "content",
    },
    hue: {
      type: "number",
      default: 0,
      range: [0, 360],
      step: 1,
      label: "文字色相",
      semantic: "text color hue angle, 0=white/gray when saturation=0, 180=cyan, 120=green",
      group: "color",
    },
    saturation: {
      type: "number",
      default: 0,
      range: [0, 100],
      step: 1,
      label: "文字饱和度",
      semantic: "text color saturation percentage, 0=white/gray, 80+=vivid color",
      group: "color",
    },
    lightness: {
      type: "number",
      default: 92,
      range: [30, 100],
      step: 1,
      label: "文字亮度",
      semantic: "text color lightness percentage, 90+=near white, 50=mid brightness",
      group: "color",
    },
    fontSize: {
      type: "number",
      default: 0.055,
      range: [0.03, 0.1],
      step: 0.005,
      label: "字号比例",
      semantic: "font size as ratio of viewport width, 0.04=small, 0.055=medium, 0.08=large",
      group: "style",
    },
    charDelay: {
      type: "number",
      default: 0.06,
      range: [0.02, 0.2],
      step: 0.01,
      label: "每字延迟(s)",
      semantic: "seconds per character typed, 0.03=fast, 0.06=normal, 0.12=slow dramatic",
      group: "animation",
    },
    lineGap: {
      type: "number",
      default: 0.5,
      range: [0.1, 2],
      step: 0.1,
      label: "行间停顿(s)",
      semantic: "pause seconds between finishing one line and starting the next",
      group: "animation",
    },
    cursorChar: {
      type: "string",
      default: "|",
      label: "光标字符",
      semantic: "cursor character shown while typing, common values: | _ █",
      group: "style",
    },
    cursorBlink: {
      type: "number",
      default: 1.8,
      range: [0.5, 4],
      step: 0.1,
      label: "光标闪烁频率(Hz)",
      semantic: "cursor blink frequency in Hz, 1=one blink per second, 2=faster",
      group: "animation",
    },
    align: {
      type: "enum",
      default: "left",
      options: ["left", "center"],
      label: "文字对齐",
      semantic: "text alignment: left=classic typewriter feel, center=poetic/cinematic",
      group: "style",
    },
    bgOpacity: {
      type: "number",
      default: 0,
      range: [0, 0.8],
      step: 0.05,
      label: "背景遮罩透明度",
      semantic: "semi-transparent background behind text block, 0=none, 0.5=readable on complex backgrounds",
      group: "style",
    },
  },

  // ─── AI 指南 ───
  ai: {
    when: "展示诗句、名言、逐步披露的引言或故事段落。适合开场白、结尾金句、章节导引。",
    how: "叠在背景 scene 上面（z_hint: middle）。lines 数组传入 2-6 行文字。charDelay 控制打字速度，lineGap 控制行间停顿。",
    example: {
      lines: ["In the beginning", "there was nothing.", "Then came light.", "And then, video."],
      hue: 180,
      saturation: 75,
      lightness: 70,
      charDelay: 0.06,
    },
    theme_guide: "obsidian-white=白色经典, aurora-cyan=青色科技, neon-green=霓虹绿, warm-amber=暖琥珀, violet-dream=紫色梦幻",
    avoid: "单行超过 30 字符会导致溢出。lines 超过 8 行在 12s 内来不及全部显示。不适合需要快速阅读的场景。",
    pairs_with: ["auroraGradient", "circleRipple", "lowerThirdVelvet"],
  },
};

export function render(t, params, vp) {
  const {
    lines,
    hue,
    saturation,
    lightness,
    fontSize,
    charDelay,
    lineGap,
    cursorChar,
    cursorBlink,
    align,
    bgOpacity,
  } = params;

  const W = vp.width;
  const H = vp.height;
  const fs = Math.round(W * fontSize);
  const lineHeight = fs * 1.7;
  const paddingX = W * 0.08;
  const color = `hsl(${hue},${saturation}%,${lightness}%)`;
  const cursorColor = `hsl(${hue},${saturation}%,${Math.min(100, lightness + 10)}%)`;

  // Calculate which chars are visible at time t
  // Build a flat schedule: each (lineIdx, charIdx) has a start time
  const safeLines = Array.isArray(lines) ? lines : [];

  // Precompute: when does each line start typing?
  const lineStartTimes = [];
  let cursor = 0;
  for (let i = 0; i < safeLines.length; i++) {
    lineStartTimes.push(cursor);
    cursor += safeLines[i].length * charDelay + lineGap;
  }

  // For each line, how many chars are visible at t?
  const visibleCharsPerLine = safeLines.map((line, i) => {
    const elapsed = t - lineStartTimes[i];
    if (elapsed < 0) return 0;
    return Math.min(line.length, Math.floor(elapsed / charDelay));
  });

  // Which line is currently being typed?
  let activeLineIdx = -1;
  for (let i = 0; i < safeLines.length; i++) {
    const elapsed = t - lineStartTimes[i];
    if (elapsed >= 0 && visibleCharsPerLine[i] < safeLines[i].length) {
      activeLineIdx = i;
      break;
    }
  }
  // If all lines done, keep cursor on last line
  if (activeLineIdx === -1 && safeLines.length > 0) {
    activeLineIdx = safeLines.length - 1;
  }

  // Cursor blink: show cursor on active line when typing or at end
  const blinkPeriod = 1 / cursorBlink;
  const showCursor = (t % blinkPeriod) < blinkPeriod * 0.5;

  // Calculate total text block height to center vertically
  const blockH = safeLines.length * lineHeight;
  const startY = (H - blockH) / 2;

  // Build line divs
  const textAlign = align === "center" ? "center" : "left";
  const justifyContent = align === "center" ? "center" : "flex-start";

  let linesHtml = "";
  for (let i = 0; i < safeLines.length; i++) {
    const visible = visibleCharsPerLine[i];
    const text = safeLines[i].substring(0, visible);
    const isActive = i === activeLineIdx;
    const cursorSpan =
      isActive && showCursor
        ? `<span style="opacity:1;color:${cursorColor}">${cursorChar}</span>`
        : `<span style="opacity:0">${cursorChar}</span>`;

    // Lines that haven't started yet are invisible
    const lineOpacity = visible > 0 || isActive ? 1 : 0;

    linesHtml += `<div style="height:${lineHeight}px;display:flex;align-items:center;justify-content:${justifyContent};opacity:${lineOpacity};white-space:pre">${text}${cursorSpan}</div>`;
  }

  const bgStyle =
    bgOpacity > 0
      ? `background:rgba(0,0,0,${bgOpacity});border-radius:${W * 0.02}px;padding:${H * 0.02}px ${paddingX}px;`
      : `padding:0 ${paddingX}px;`;

  return `<div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:ui-monospace,'JetBrains Mono','Fira Code',monospace">
  <div style="position:absolute;top:${startY}px;left:0;right:0;display:flex;flex-direction:column;align-items:${align === "center" ? "center" : "flex-start"};${bgStyle}font-size:${fs}px;font-weight:400;color:${color};letter-spacing:0.02em;line-height:${lineHeight}px">
    ${linesHtml}
  </div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0.5, label: "第一行打字中" },
    { t: 3,   label: "第二行出现" },
    { t: 8,   label: "多行显示完成" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  const safeLines = Array.isArray(params.lines) ? params.lines : [];

  if (safeLines.length === 0) {
    errors.push("lines 不能为空。Fix: 传入至少一行文字");
  }

  if (safeLines.length > 10) {
    errors.push(`lines 有 ${safeLines.length} 行，超过推荐上限 10 行。Fix: 减少到 10 行以内`);
  }

  const maxLineW = vp.width * 0.84; // safe zone = 84% of width
  const charW = vp.width * (params.fontSize || 0.055) * 0.6;
  for (let i = 0; i < safeLines.length; i++) {
    const lineW = safeLines[i].length * charW;
    if (lineW > maxLineW) {
      errors.push(
        `第 ${i + 1} 行"${safeLines[i].substring(0, 20)}..."预估宽度 ${Math.round(lineW)}px 超出安全区 ${Math.round(maxLineW)}px。Fix: 缩短到 ${Math.floor(maxLineW / charW)} 字符以内`
      );
    }
  }

  if (params.charDelay < 0.02) {
    errors.push("charDelay 太短（< 0.02s），打字太快看不清。Fix: 设为 0.03 以上");
  }

  if (params.lineGap < 0) {
    errors.push("lineGap 不能为负数。Fix: 设为 0.1 以上");
  }

  const themeNames = Object.keys(meta.themes);
  if (params.theme && !themeNames.includes(params.theme)) {
    errors.push(`主题"${params.theme}"不存在。Fix: 使用 ${themeNames.join(" / ")} 之一`);
  }

  return { ok: errors.length === 0, errors };
}
