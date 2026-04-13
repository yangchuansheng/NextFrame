import {
  createRoot, createNode, smoothstep, toNumber, clamp,
  MONO_FONT_STACK,
} from "../scenes-v2-shared.js";

/* ── Syntax highlight rules per language ── */
const SYNTAX = {
  javascript: {
    keywords: /\b(const|let|var|function|return|if|else|for|async|await|class|new|this|import|export|default|switch|case|break|continue|while|do|try|catch|throw|typeof|instanceof)\b/g,
    strings: /(["'`])(?:(?!\1|\\).|\\.)*?\1/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  },
  rust: {
    keywords: /\b(fn|let|mut|struct|impl|pub|use|mod|enum|match|self|Self|return|if|else|for|while|loop|break|continue|async|await|trait|where|type|const|static|ref|move|unsafe|extern|crate|super|as|in)\b/g,
    strings: /(["'])(?:(?!\1|\\).|\\.)*?\1/g,
    types: /\b(i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f32|f64|bool|char|str|String|Vec|Option|Result|Box|Rc|Arc|HashMap|HashSet|usize|isize)\b/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  },
  python: {
    keywords: /\b(def|class|import|from|return|if|elif|else|for|while|with|as|try|except|finally|raise|pass|break|continue|yield|lambda|and|or|not|in|is|True|False|None|self|print|async|await)\b/g,
    strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
    numbers: /\b(\d+\.?\d*)\b/g,
    comments: /(#.*$)/gm,
  },
};

const COLORS = {
  keyword: "#ff7b72",
  string: "#7ee787",
  number: "#ffa657",
  comment: "#6a737d",
  type: "#ffa657",
};

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightCode(code, language) {
  const rules = SYNTAX[language] || SYNTAX.javascript;
  const tokens = [];
  let id = 0;

  function placeholder(color, match) {
    const key = `__TOK${id}__`;
    id += 1;
    tokens.push({ key, html: `<span style="color:${color}">${escapeHtml(match)}</span>` });
    return key;
  }

  let result = code;

  // Order matters: comments first, then strings, then types, then keywords, then numbers
  if (rules.comments) {
    result = result.replace(rules.comments, (m) => placeholder(COLORS.comment, m));
  }
  if (rules.strings) {
    result = result.replace(rules.strings, (m) => placeholder(COLORS.string, m));
  }
  if (rules.types) {
    result = result.replace(rules.types, (m) => placeholder(COLORS.type, m));
  }
  if (rules.keywords) {
    result = result.replace(rules.keywords, (m) => placeholder(COLORS.keyword, m));
  }
  if (rules.numbers) {
    result = result.replace(rules.numbers, (m) => placeholder(COLORS.number, m));
  }

  result = escapeHtml(result);

  for (const tok of tokens) {
    result = result.replace(escapeHtml(tok.key), tok.html);
  }

  return result;
}

export default {
  id: "codeTyping",
  type: "dom",
  name: "Code Typing",
  category: "Code",
  tags: ["code", "typing", "syntax", "highlight", "cursor", "animation"],
  description: "代码打字效果，逐字符出现，带语法高亮和闪烁光标，适合编程教学和技术演示",
  params: {
    code:     { type: "string", default: "const x = 1;", desc: "代码内容" },
    language: { type: "string", default: "javascript",   desc: "语言:javascript/rust/python" },
    fontSize: { type: "number", default: 18,             desc: "字号(px)", min: 10, max: 48 },
    speed:    { type: "number", default: 30,             desc: "字符/秒" },
    theme:    { type: "string", default: "dark",         desc: "主题" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center;padding:5% 6%");
    const fontSize = toNumber(params.fontSize, 18);

    const card = createNode("div", [
      "background:#0d1117",
      "border-radius:12px",
      "border:1px solid rgba(255,255,255,0.08)",
      "padding:24px 28px",
      "max-width:780px",
      "width:100%",
      "box-shadow:0 8px 32px rgba(0,0,0,0.4)",
      "opacity:0",
      "will-change:opacity,transform",
    ].join(";"));

    const codeEl = createNode("pre", [
      `font-family:${MONO_FONT_STACK}`,
      `font-size:${fontSize}px`,
      "color:#e2e8f0",
      "margin:0",
      "white-space:pre-wrap",
      "word-break:break-all",
      "line-height:1.7",
      "min-height:1.7em",
    ].join(";"));

    const cursor = createNode("span", [
      "display:inline-block",
      "width:2px",
      `height:${fontSize * 1.2}px`,
      "background:#58a6ff",
      "vertical-align:text-bottom",
      "margin-left:1px",
    ].join(";"));

    card.appendChild(codeEl);
    root.appendChild(card);

    const rawCode = String(params.code || "const x = 1;").replace(/\\n/g, "\n");
    const lang = String(params.language || "javascript");

    return { root, card, codeEl, cursor, rawCode, lang };
  },

  update(els, localT) {
    const enterT = smoothstep(0, 0.06, localT);
    const exitT = 1 - smoothstep(0.9, 1, localT);
    els.card.style.opacity = String(enterT * exitT);
    els.card.style.transform = `translateY(${(1 - enterT) * 12}px)`;

    // Typing progress: first 80% is typing, last 20% is display
    const typeProgress = clamp(localT / 0.8, 0, 1);
    const charCount = Math.round(typeProgress * els.rawCode.length);
    const visibleCode = els.rawCode.slice(0, charCount);

    const highlighted = highlightCode(visibleCode, els.lang);
    const cursorVisible = localT < 0.9 && (Math.floor(localT * 8) % 2 === 0);
    const cursorHtml = cursorVisible
      ? '<span style="display:inline-block;width:2px;height:1.2em;background:#58a6ff;vertical-align:text-bottom;margin-left:1px"></span>'
      : "";

    els.codeEl.innerHTML = highlighted + cursorHtml;
  },

  destroy(els) { els.root.remove(); },
};
