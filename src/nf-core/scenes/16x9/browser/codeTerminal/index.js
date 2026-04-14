// codeTerminal — 终端风格代码块 scene
// 技术：DOM。macOS 终端窗口 + 语法高亮 + 逐行出现动画。
// 用于讲解视频中展示代码片段、命令行操作、配置文件。

export const meta = {
  id: "codeTerminal",
  version: 1,
  ratio: "16:9",
  category: "browser",
  label: "Code Terminal",
  description: "终端风格代码块，带 macOS 窗口装饰、语法高亮、逐行出现动画。适合讲解代码、展示命令行操作。",
  tech: "dom",
  duration_hint: 15,
  loopable: false,
  z_hint: "middle",
  tags: ["terminal", "code", "命令行", "代码块", "编辑器"],
  mood: ["professional", "technical", "focused"],
  theme: ["tech", "education", "devtools"],
  default_theme: "github-dark",
  themes: {
    "github-dark": { bg: "#0d1117", barBg: "#21262d", text: "#e6edf3", prompt: "#7ee787", comment: "#8b949e", keyword: "#ff7b72", string: "#7ee787", variable: "#ffa657", error: "#ff7b72" },
    "anthropic-warm": { bg: "#1a1510", barBg: "#2a2319", text: "#f5ece0", prompt: "#da7756", comment: "rgba(245,236,224,.35)", keyword: "#da7756", string: "#7ec699", variable: "#d4b483", error: "#e06c75" },
    "monokai": { bg: "#272822", barBg: "#3e3d32", text: "#f8f8f2", prompt: "#a6e22e", comment: "#75715e", keyword: "#f92672", string: "#e6db74", variable: "#66d9ef", error: "#f92672" },
  },
  params: {
    title: { type: "string", default: "Terminal", label: "窗口标题", semantic: "macOS title bar text", group: "content" },
    lines: {
      type: "array", required: true, default: [
        { text: "$ git commit -m \"ship hook guard\"", type: "prompt" },
        { text: "", type: "separator" },
        { text: "Running pre-commit hook...", type: "dim" },
        { text: "Checking code style... OK", type: "output" },
        { text: "Lint check...          FAILED", type: "error" },
        { text: "hook rejected: commit blocked", type: "error" },
      ], label: "代码行",
      semantic: "Array of {text, type?} where type is prompt|output|comment|error|keyword|string|variable|dim|separator. Default type is plain text.",
      group: "content"
    },
    lineDelay: { type: "number", default: 0.4, label: "每行出现间隔(s)", semantic: "stagger delay between lines appearing", group: "animation", range: [0, 2], step: 0.1 },
    fontSize: { type: "number", default: 15, label: "字号", semantic: "font size in px", group: "style", range: [12, 24], step: 1 },
    width: { type: "number", default: 560, label: "窗口宽(px)", semantic: "terminal window width", group: "style", range: [300, 1200], step: 10 },
    height: { type: "number", default: 0, label: "窗口高(px, 0=自适应)", semantic: "terminal window height, 0 for auto", group: "style", range: [0, 800], step: 10 },
    x: { type: "number", default: 60, label: "X 偏移(px)", semantic: "horizontal offset from left", group: "style", range: [0, 1920], step: 10 },
    y: { type: "number", default: 0, label: "Y 偏移(px, 0=居中)", semantic: "vertical offset, 0 for centered", group: "style", range: [0, 1080], step: 10 },
    showDots: { type: "boolean", default: true, label: "显示红绿灯", semantic: "show macOS traffic light dots", group: "style" },
    borderRadius: { type: "number", default: 12, label: "圆角(px)", semantic: "window border radius", group: "style", range: [0, 24], step: 2 },
    // theme colors (overridden by theme presets)
    bg: { type: "color", default: "#0d1117", label: "背景色", semantic: "terminal background color", group: "color" },
    barBg: { type: "color", default: "#21262d", label: "标题栏色", semantic: "title bar background", group: "color" },
    text: { type: "color", default: "#e6edf3", label: "文字色", semantic: "default text color", group: "color" },
    prompt: { type: "color", default: "#7ee787", label: "提示符色", semantic: "prompt $ color", group: "color" },
    comment: { type: "color", default: "#8b949e", label: "注释色", semantic: "comment text color", group: "color" },
    keyword: { type: "color", default: "#ff7b72", label: "关键字色", semantic: "keyword/error highlight color", group: "color" },
    string: { type: "color", default: "#7ee787", label: "字符串色", semantic: "string literal color", group: "color" },
    variable: { type: "color", default: "#ffa657", label: "变量色", semantic: "variable name color", group: "color" },
    error: { type: "color", default: "#ff7b72", label: "错误色", semantic: "error message color", group: "color" },
  },
  ai: {
    when: "需要展示代码片段、命令行操作、配置文件、终端输出时使用。讲解视频中展示技术细节的首选组件。",
    how: "在 timeline layer 中引用，params.lines 传入代码行数组。每行可指定 type 来高亮。配合 titleCard 或 splitLayout 使用效果最佳。",
    example: {
      lines: [
        { text: "$ git commit -m \"add feature\"", type: "prompt" },
        { text: "", type: "separator" },
        { text: "Running pre-commit hook...", type: "dim" },
        { text: "Checking code style... OK", type: "output" },
        { text: "Lint check...          FAILED", type: "error" },
        { text: "", type: "separator" },
        { text: "hook rejected: commit blocked", type: "error" },
        { text: "// 不通过就不让提交", type: "comment" },
      ],
      title: "Git Hook 演示",
      width: 560,
    },
    theme_guide: {
      "github-dark": "GitHub 风格深色终端，适合展示 Git 操作",
      "anthropic-warm": "暖棕色调，搭配 Anthropic 系列视频主题",
      "monokai": "经典 Monokai 配色，适合通用代码展示",
    },
    avoid: "不适合展示大段文字说明、非代码内容。文字说明用 titleCard 或 stackedCards。",
    pairs_with: ["titleCard", "splitLayout", "auroraGradient", "slideChrome"],
  },
};

/**
 * render(t, params, vp) → HTML string
 * Frame-pure: same (t, params, vp) → same output.
 */
export function render(t, params, vp) {
  const p = { ...meta.params };
  // Resolve defaults
  for (const [k, v] of Object.entries(p)) {
    if (params[k] === undefined && v.default !== undefined) p[k] = v.default;
    else p[k] = params[k];
  }
  // Override with actual params
  Object.assign(p, params);

  const lines = p.lines || [];
  const w = p.width || 560;
  const h = p.height || 0;
  const x = p.x || 60;
  const yCenter = !p.y;
  const yVal = p.y || 0;
  const fs = p.fontSize || 15;
  const delay = p.lineDelay || 0.4;
  const br = p.borderRadius || 12;
  const showDots = p.showDots !== false;

  // Color tokens
  const bg = p.bg || "#0d1117";
  const barBg = p.barBg || "#21262d";
  const textC = p.text || "#e6edf3";
  const promptC = p.prompt || "#7ee787";
  const commentC = p.comment || "#8b949e";
  const keywordC = p.keyword || "#ff7b72";
  const stringC = p.string || "#7ee787";
  const variableC = p.variable || "#ffa657";
  const errorC = p.error || "#ff7b72";

  // Map line type to color
  function lineColor(type) {
    switch (type) {
      case "prompt": return promptC;
      case "comment": return commentC;
      case "keyword": return keywordC;
      case "string": return stringC;
      case "variable": return variableC;
      case "error": return errorC;
      case "dim": return commentC;
      case "output": return textC;
      default: return textC;
    }
  }

  // Build lines HTML
  let linesHtml = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineT = i * delay; // time this line appears
    const visible = t >= lineT;
    const opacity = visible ? 1 : 0;
    const text = line.text || "";
    const type = line.type || "plain";

    if (type === "separator") {
      linesHtml += `<div style="margin:10px 0;border-top:1px dashed rgba(255,255,255,.08);opacity:${opacity}"></div>`;
      continue;
    }

    const color = lineColor(type);
    const fontWeight = type === "error" || type === "keyword" || type === "prompt" ? "700" : "400";
    const fontStyle = type === "comment" ? "italic" : "normal";

    // For prompt type, highlight the "$ " prefix
    let displayText = text;
    if (type === "prompt" && text.startsWith("$ ")) {
      displayText = `<span style="color:${promptC};font-weight:700">$ </span><span style="color:${textC}">${escHtml(text.slice(2))}</span>`;
    } else {
      displayText = escHtml(text);
    }

    linesHtml += `<div style="opacity:${opacity};color:${color};font-weight:${fontWeight};font-style:${fontStyle};line-height:1.75;min-height:${fs * 1.75}px;white-space:pre-wrap">${displayText}</div>`;
  }

  // Dots
  const dotsHtml = showDots
    ? `<div style="display:flex;gap:8px;align-items:center">
        <div style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#febc2e"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:#28c840"></div>
       </div>`
    : "";

  const titleText = p.title || "";
  const safeMaxWidth = Math.max(320, vp.width - x - 60);

  // Window positioning
  const posStyle = yCenter
    ? `position:absolute;left:${x}px;top:50%;transform:translateY(-50%);width:${w}px;max-width:${safeMaxWidth}px`
    : `position:absolute;left:${x}px;top:${yVal}px;width:${w}px;max-width:${safeMaxWidth}px`;

  const heightStyle = h > 0 ? `height:${h}px;` : "";

  return `<div style="${posStyle};${heightStyle}background:${bg};border-radius:${br}px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,.65);display:flex;flex-direction:column;font-family:'SF Mono','JetBrains Mono','Fira Code',Consolas,monospace">
  <div style="background:${barBg};padding:11px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0">
    ${dotsHtml}
    <div style="flex:1;text-align:center;font-size:14px;color:rgba(255,255,255,.3)">${escHtml(titleText)}</div>
  </div>
  <div style="padding:20px 24px;font-size:${fs}px;flex:1;overflow:hidden">
    ${linesHtml}
  </div>
</div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function screenshots() {
  return [
    { t: 0, label: "初始状态（空终端）" },
    { t: 2, label: "前几行出现" },
    { t: 6, label: "全部行可见" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (!params.lines || !Array.isArray(params.lines) || params.lines.length === 0) {
    errors.push("lines 不能为空。Fix: 传入至少一行 {text, type} 数组");
  }
  if (params.lines && params.lines.length > 30) {
    errors.push("lines 超过 30 行可能溢出。Fix: 减少到 30 行以内或减小 fontSize");
  }
  if (params.width && params.width > vp.width * 0.9) {
    errors.push(`width ${params.width}px 超出安全区 (${vp.width * 0.9}px)。Fix: 减小 width`);
  }
  return { ok: errors.length === 0, errors };
}
