// quoteBlock — 金色斜体引语，居中底部。只做引语这一件事。
export const meta = {
  id: "quoteBlock", version: 1, ratio: "16:9", category: "typography",
  label: "Quote Block",
  description: "金色斜体引语，居中显示。只做引语。",
  tech: "dom", duration_hint: 10, loopable: false, z_hint: "middle",
  tags: ["引语", "quote", "金句", "斜体"],
  mood: ["reflective", "elegant"], theme: ["tech", "education"],
  default_theme: "anthropic-warm",
  themes: {
    "anthropic-warm": { color: "#d4b483", fontSize: 20 },
    "accent": { color: "#da7756", fontSize: 22 },
    "subtle": { color: "rgba(212,180,131,.7)", fontSize: 18 },
  },
  params: {
    text: { type: "string", required: true, label: "引语文字", semantic: "quote text, auto-wrapped in quotation marks", group: "content" },
    color: { type: "color", default: "#d4b483", label: "文字色", semantic: "quote text color", group: "color" },
    fontSize: { type: "number", default: 20, label: "字号(px)", semantic: "font size", group: "style", range: [14, 32], step: 1 },
    y: { type: "number", default: 0, label: "Y位置(px, 0=底部三分之二)", semantic: "vertical position", group: "style", range: [0, 1080], step: 10 },
    enterDelay: { type: "number", default: 0, label: "出现延迟(s)", semantic: "fade-in delay", group: "animation", range: [0, 15], step: 0.1 },
    maxWidth: { type: "number", default: 700, label: "最大宽度(px)", semantic: "max width for text wrapping", group: "style", range: [400, 1200], step: 50 },
  },
  ai: {
    when: "收束画面时的金句/总结。通常放在 phase 末尾。",
    how: "text 会自动加引号。搭配 headlineCenter + flowDiagram 上方。",
    example: { text: "每次动手之前，安检员先过一遍——该拦的拦，该放行的放行" },
    theme_guide: { "anthropic-warm": "金色斜体", "accent": "橙色强调", "subtle": "淡金" },
    avoid: "不用于长段文字（超过 2 句）。",
    pairs_with: ["headlineCenter", "flowDiagram", "auroraGradient"],
  },
};

function ease3(p) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3); }
function fadeIn(t, start, dur) { return ease3((t - start) / dur); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

export function render(t, params, vp) {
  var p = {};
  for (var k in meta.params) p[k] = params[k] !== undefined ? params[k] : meta.params[k].default;
  var op = fadeIn(t, p.enterDelay || 0, 0.7);
  var fs = p.fontSize || 20;
  var color = p.color || "#d4b483";
  var mw = p.maxWidth || 700;
  var yVal = p.y > 0 ? p.y : Math.round(vp.height * 0.68);
  return '<div style="position:absolute;left:0;right:0;top:' + yVal + 'px;display:flex;justify-content:center;padding:0 60px">' +
    '<div style="font:italic ' + fs + 'px Georgia,\'Noto Serif SC\',serif;color:' + color + ';text-align:center;max-width:' + mw + 'px;line-height:1.5;opacity:' + op + '">"' + esc(p.text || '') + '"</div>' +
  '</div>';
}

export function screenshots() {
  return [{ t: 0, label: "透明" }, { t: 0.5, label: "淡入" }, { t: 2, label: "显示" }];
}

export function lint(params, vp) {
  var errors = [];
  if (!params.text) errors.push("text 不能为空。Fix: 传入引语文字");
  if (params.text && params.text.length > 80) errors.push("text 超过 80 字可能溢出。Fix: 精简到 80 字以内");
  return { ok: errors.length === 0, errors: errors };
}
