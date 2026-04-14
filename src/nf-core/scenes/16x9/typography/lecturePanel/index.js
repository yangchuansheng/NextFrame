// lecturePanel — Right-side explanation panel for dual-pane lecture layout.
// Shows: category label + large title + accent subtitle + description text.
// Pairs with codeTerminal on the left side.
export const meta = {
  id: "lecturePanel",
  version: 1,
  ratio: "16:9",
  category: "typography",
  label: "Lecture Panel",
  description: "Right-side explanation panel for dual-pane lecture layout: category label, large title, accent subtitle, description text",
  tech: "dom",
  duration_hint: 10,
  loopable: false,
  z_hint: "middle",
  tags: ["typography", "panel", "explanation", "lecture", "16x9"],
  mood: ["professional", "educational"],
  theme: ["tech", "education"],
  default_theme: "anthropic-warm",
  themes: {
    "anthropic-warm": {
      categoryColor: "rgba(245,236,224,0.4)",
      titleColor: "#f5ece0",
      subtitleColor: "#da7756",
      descColor: "rgba(245,236,224,0.65)",
    },
  },
  params: {
    category: { type: "string", default: "CLAUDE/FILE #3", label: "Category label (small, top)", group: "content" },
    title: { type: "string", default: "Hook", label: "Large title", group: "content" },
    subtitle: { type: "string", default: "AI 操作的拦门", label: "Accent subtitle", group: "content" },
    desc: { type: "string", default: "", label: "Description text", group: "content" },
    x: { type: "number", default: 55, label: "X position (% of viewport)", group: "layout", range: [0, 100], step: 1 },
    width: { type: "number", default: 40, label: "Width (% of viewport)", group: "layout", range: [10, 100], step: 1 },
    y: { type: "number", default: 30, label: "Y position (% of viewport)", group: "layout", range: [0, 100], step: 1 },
    categoryColor: { type: "color", default: "rgba(245,236,224,0.4)", label: "Category color", group: "color" },
    titleColor: { type: "color", default: "#f5ece0", label: "Title color", group: "color" },
    subtitleColor: { type: "color", default: "#da7756", label: "Subtitle color", group: "color" },
    descColor: { type: "color", default: "rgba(245,236,224,0.65)", label: "Description color", group: "color" },
    enterDelay: { type: "number", default: 0, label: "Enter delay (s)", group: "animation", range: [0, 10], step: 0.1 },
  },
  ai: {
    when: "Dual-pane lecture layout: right panel explaining what the code on the left demonstrates",
    how: '{ scene: "lecturePanel", start: 0, dur: 10, params: { category: "CLAUDE/FILE #3", title: "Hook", subtitle: "AI 操作的拦门", desc: "说明文字" } }',
    example: { category: "CLAUDE/FILE #3", title: "Hook", subtitle: "AI 操作的拦门", desc: "如果你用过 Git Hook——commit 之前跑个检查，不通过就不让提交——Claude Code 的 Hook 是同样的意思。", x: 55, width: 40, y: 30 },
    avoid: "Don't use for standalone titles (use headlineCenter). Only for dual-pane with codeTerminal.",
    pairs_with: ["codeTerminal", "darkGradient", "subtitleBar", "slideChrome"],
  },
};

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function ease3(p) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3); }

export function render(t, params, vp) {
  const category = esc(params.category || "");
  const title = esc(params.title || "");
  const subtitle = esc(params.subtitle || "");
  const desc = esc(params.desc || "");
  const categoryColor = params.categoryColor || "rgba(245,236,224,0.4)";
  const titleColor = params.titleColor || "#f5ece0";
  const subtitleColor = params.subtitleColor || "#da7756";
  const descColor = params.descColor || "rgba(245,236,224,0.65)";
  const enterDelay = Number(params.enterDelay) || 0;

  const xPct = Number.isFinite(params.x) ? params.x : 55;
  const widthPct = Number.isFinite(params.width) ? params.width : 40;
  const yPct = Number.isFinite(params.y) ? params.y : 30;

  const left = Math.round(vp.width * xPct / 100);
  const areaWidth = Math.round(vp.width * widthPct / 100);
  const top = Math.round(vp.height * yPct / 100);
  const pad = Math.round(vp.width * 30 / 1920);

  const localT = Math.max(0, t - enterDelay);
  const fadeAlpha = Math.min(1, ease3(Math.min(1, localT * 2)));
  const slideX = (1 - ease3(Math.min(1, localT * 1.5))) * 30;

  const catSize = Math.round(vp.width * 12 / 1920);
  const titleSize = Math.round(vp.width * 48 / 1920);
  const subSize = Math.round(vp.width * 28 / 1920);
  const descSize = Math.round(vp.width * 16 / 1920);
  const gap = Math.round(vp.height * 12 / 1080);

  let html = `<div style="position:absolute;left:${left}px;top:${top}px;width:${areaWidth}px;padding:0 ${pad}px;opacity:${fadeAlpha};transform:translateX(${slideX}px);pointer-events:none">`;

  if (category) {
    html += `<div style="font-family:system-ui,'SF Mono','Consolas',monospace;font-size:${catSize}px;font-weight:500;color:${categoryColor};letter-spacing:0.12em;text-transform:uppercase;margin-bottom:${gap}px">${category}</div>`;
  }

  if (title) {
    html += `<div style="font-family:Georgia,'Noto Serif SC',serif;font-size:${titleSize}px;font-weight:700;color:${titleColor};line-height:1.2;margin-bottom:${Math.round(gap * 0.5)}px">${title}</div>`;
  }

  if (subtitle) {
    html += `<div style="font-family:'PingFang SC','Noto Sans SC',system-ui,sans-serif;font-size:${subSize}px;font-weight:600;color:${subtitleColor};line-height:1.3;margin-bottom:${gap * 2}px">${subtitle}</div>`;
  }

  if (desc) {
    html += `<div style="font-family:'PingFang SC','Noto Sans SC',system-ui,sans-serif;font-size:${descSize}px;font-weight:400;color:${descColor};line-height:1.7;letter-spacing:0.01em">${desc}</div>`;
  }

  html += `</div>`;
  return html;
}

export function screenshots() {
  return [
    { t: 0.1, label: "Panel fade in" },
    { t: 2, label: "Panel visible" },
    { t: 8, label: "Panel stable" },
  ];
}

export function lint(params) {
  const errors = [];
  if (!params.title) errors.push("title is required. Fix: provide the main title text");
  return { ok: errors.length === 0, errors };
}
