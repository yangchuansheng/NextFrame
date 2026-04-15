// interviewChrome — 9:16 访谈静态层合集
// 合并了 interviewBg + interviewHeader + interviewMeta + interviewBrand
// 这些元素在整个视频中不随时间变化，放在一个组件里维护。
import { TOKENS, GRID, TYPE, scaleW, scaleH, esc, decoLine } from "../../../shared/design.js";

export const meta = {
  id: "interviewChrome",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Chrome",
  description: "9:16 访谈视频的全部静态元素：背景(网格+光晕+暗角) + 顶部标题 + 中部元信息 + 底部品牌。一个组件搞定所有不随时间变化的画面。",
  tech: "dom",
  duration_hint: 60,
  loopable: true,
  z_hint: "bottom",
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    // Header
    series:    { type: "string", default: "速通硅谷访谈", label: "系列名", group: "header" },
    episode:   { type: "string", default: "E01", label: "期号", group: "header" },
    guest:     { type: "string", default: "", label: "嘉宾", group: "header" },
    title:     { type: "string", default: "标题文字", label: "标题", group: "header" },
    // Meta
    origRange: { type: "string", default: "", label: "原片时间范围", group: "meta" },
    topicLabel:{ type: "string", default: "正在聊", label: "话题标签", group: "meta" },
    topic:     { type: "string", default: "", label: "话题内容", group: "meta" },
    tags:      { type: "string", default: "", label: "标签(逗号分隔)", group: "meta" },
    // Brand
    brand:     { type: "string", default: "OPC · 王宇轩", label: "品牌名", group: "brand" },
    teamLine:  { type: "string", default: "该视频由数字员工 Alysa 全自动负责剪辑 · 翻译 · 字幕 · 讲解 · 封面 · 发布", label: "团队署名", group: "brand" },
  },
  ai: {
    when: "9:16 访谈视频必选。一个 layer 搞定所有静态元素。动态元素（字幕/进度条/视频）用单独的 layer。",
    how: "传 header 信息 + meta 信息 + brand 信息。这些在整个视频中不变。",
    pairs_with: ["interviewBiSub", "progressBar9x16", "interviewVideoArea"],
  },
};

// ── Background ──
function renderBg(vp) {
  const t = TOKENS.interview;
  return `<div style="position:absolute;inset:0;background:${t.bg};overflow:hidden">` +
    `<div style="position:absolute;left:0;right:0;top:0;height:${scaleH(vp, 600)}px;background:radial-gradient(ellipse 80% 50% at 50% 0%,${t.glowTop},transparent)"></div>` +
    `<div style="position:absolute;left:0;right:0;bottom:0;height:${scaleH(vp, 500)}px;background:radial-gradient(ellipse 80% 40% at 50% 100%,${t.glowBottom},transparent)"></div>` +
    `<div style="position:absolute;inset:0;background-image:radial-gradient(circle,${t.gridDot} 1px,transparent 1px);background-size:${scaleW(vp, 32)}px ${scaleH(vp, 32)}px"></div>` +
    `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 120% 100% at 50% 50%,transparent 40%,${t.vignette} 100%)"></div>` +
    `</div>`;
}

// ── Header (top zone) ──
function renderHeader(params, vp) {
  const gold = TOKENS.interview.gold;
  const text = TOKENS.interview.text;
  const pad = scaleW(vp, GRID.sidePad);
  const seriesLine = [params.series, params.episode, params.guest].filter(Boolean).join(" · ");
  const seriesSize = scaleW(vp, TYPE.seriesName.size);
  const titleSize = scaleW(vp, TYPE.title.size);

  return `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${scaleH(vp, GRID.header.top)}px;pointer-events:none">` +
    `<div style="font:${TYPE.seriesName.weight} ${seriesSize}px ${TYPE.seriesName.font};color:${gold};letter-spacing:${TYPE.seriesName.spacing};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2">${esc(seriesLine)}</div>` +
    `<div style="margin-top:${scaleH(vp, 16)}px;font:${TYPE.title.weight} ${titleSize}px/${TYPE.title.lineHeight || 1.2} ${TYPE.title.font};color:${text};letter-spacing:${TYPE.title.spacing};word-break:break-all">${esc(params.title || "")}</div>` +
    `</div>` +
    decoLine(vp, GRID.decoLine1);
}

// ── Meta (time info + topic + tags) ──
function renderMeta(params, vp) {
  const gold = TOKENS.interview.gold;
  const textDim = TOKENS.interview.textDim;
  const pad = scaleW(vp, GRID.sidePad);
  const timeTop = scaleH(vp, GRID.timeInfo);
  const topicTop = scaleH(vp, GRID.topic.top);
  const tagList = String(params.tags || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);

  const tagsHtml = tagList.map((tag) =>
    `<span style="flex-shrink:0;font:${TYPE.tag.weight} ${scaleW(vp, TYPE.tag.size)}px ${TYPE.tag.font};color:${TOKENS.interview.tagText};background:${TOKENS.interview.tagBg};border:0.5px solid ${TOKENS.interview.tagBorder};padding:${scaleH(vp, 4)}px ${scaleW(vp, 10)}px;border-radius:${scaleW(vp, 4)}px;letter-spacing:${TYPE.tag.spacing};white-space:nowrap">${esc(tag)}</span>`
  ).join("");

  let html = decoLine(vp, GRID.decoLine2);

  if (params.origRange) {
    html += `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${timeTop}px;font:${TYPE.timeInfo.weight} ${scaleW(vp, TYPE.timeInfo.size)}px ${TYPE.timeInfo.font};color:rgba(232,196,122,.4);text-align:center;letter-spacing:${TYPE.timeInfo.spacing};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none">${esc(params.origRange)}</div>`;
  }

  html += `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${topicTop}px;height:${scaleH(vp, GRID.topic.height)}px;padding-top:${scaleH(vp, 6)}px;pointer-events:none">` +
    `<div style="font:${TYPE.topicLabel.weight} ${scaleW(vp, TYPE.topicLabel.size)}px ${TYPE.topicLabel.font};color:${gold};letter-spacing:${TYPE.topicLabel.spacing};display:flex;align-items:center;gap:${scaleW(vp, 8)}px">${esc(params.topicLabel || "正在聊")}<span style="flex:1;height:0.5px;background:linear-gradient(90deg,rgba(232,196,122,.25),transparent)"></span></div>`;

  if (params.topic) {
    html += `<div style="margin-top:${scaleH(vp, 8)}px;font:${TYPE.topicText.weight} ${scaleW(vp, TYPE.topicText.size)}px/${TYPE.topicText.lineHeight} ${TYPE.topicText.font};color:${textDim};overflow:hidden;max-height:${scaleH(vp, 80)}px">${esc(params.topic)}</div>`;
  }
  if (tagList.length > 0) {
    html += `<div style="margin-top:${scaleH(vp, 10)}px;display:flex;flex-wrap:nowrap;gap:${scaleW(vp, 6)}px;overflow:hidden">${tagsHtml}</div>`;
  }
  html += `</div>`;
  return html;
}

// ── Brand (bottom) ──
function renderBrand(params, vp) {
  const gold = TOKENS.interview.gold;
  const textFaint = TOKENS.interview.textFaint;
  const pad = scaleW(vp, GRID.sidePad);
  const brandTop = scaleH(vp, GRID.brand);
  const teamTop = scaleH(vp, GRID.teamLine);

  return decoLine(vp, GRID.decoLine3) +
    `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${brandTop}px;text-align:center;pointer-events:none"><span style="font:${TYPE.brand.weight} ${scaleW(vp, TYPE.brand.size)}px ${TYPE.brand.font};color:${gold};letter-spacing:${TYPE.brand.spacing}">${esc(params.brand || "OPC · 王宇轩")}</span></div>` +
    `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${teamTop}px;text-align:center;font:${TYPE.teamLine.weight} ${scaleW(vp, TYPE.teamLine.size)}px ${TYPE.teamLine.font};color:${textFaint};letter-spacing:${TYPE.teamLine.spacing};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none">${esc(params.teamLine || "")}</div>`;
}

// ── Main render ──
export function render(t, params, vp) {
  return renderBg(vp) + renderHeader(params, vp) + renderMeta(params, vp) + renderBrand(params, vp);
}

export function screenshots() {
  return [
    { t: 0, label: "全部静态元素" },
    { t: 5, label: "确认不变" },
  ];
}

export function lint(params) {
  const errors = [];
  if (!params.title) errors.push("title 标题不能为空");
  if (params.title && String(params.title).length > 30) errors.push("title > 30 字符可能溢出");
  if (params.topic && String(params.topic).length > 60) errors.push("topic > 60 字符可能溢出");
  return { ok: errors.length === 0, errors };
}
