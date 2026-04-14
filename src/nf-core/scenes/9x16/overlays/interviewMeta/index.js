// interviewMeta — 9:16 中间信息区：时间信息 + 话题 + 标签
import { TOKENS, GRID, TYPE, scaleW, scaleH, esc, decoLine } from "../../../shared/design.js";

export const meta = {
  id: "interviewMeta",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Meta (Time/Topic/Tags)",
  description: "时间信息行 + 话题区 + 标签行，位于字幕区和进度条之间",
  tech: "dom",
  duration_hint: 60,
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    origRange: { type: "string", default: "", label: "原片时间范围（如 原片 2:22:19 ｜ 内容来源：01:58）", group: "content" },
    topicLabel: { type: "string", default: "正在聊", label: "话题标签", group: "content" },
    topic: { type: "string", default: "", label: "话题正文（≤40字）", group: "content" },
    tags: { type: "array", default: [], label: "标签列表（最多3个）", group: "content" },
  },
  ai: {
    when: "9:16 访谈视频的话题信息区，显示时间范围、话题和标签",
    how: "传入 origRange、topicLabel、topic、tags（字符串数组，最多3个）",
  },
};

export function render(_t, params, vp) {
  const tok = TOKENS.interview;
  const sidePad = scaleW(vp, GRID.sidePad);
  const timeInfoTop = scaleH(vp, GRID.timeInfo);
  const topicTop = scaleH(vp, GRID.topic.top);

  const timeSize = scaleW(vp, TYPE.timeInfo.size);
  const labelSize = scaleW(vp, TYPE.topicLabel.size);
  const topicSize = scaleW(vp, TYPE.topicText.size);
  const tagSize = scaleW(vp, TYPE.tag.size);

  const tagsHtml = (params.tags || []).slice(0, 3).map(tag =>
    `<span style="flex-shrink:0;font-size:${tagSize}px;color:${tok.tagText};
      font-family:${TYPE.tag.font};
      background:${tok.tagBg};border:0.5px solid ${tok.tagBorder};
      padding:${scaleH(vp,4)}px ${scaleW(vp,10)}px;border-radius:${scaleW(vp,4)}px;
      letter-spacing:${TYPE.tag.spacing};white-space:nowrap;">${esc(tag)}</span>`
  ).join("");

  return `
${params.origRange ? `<div style="position:absolute;left:${sidePad}px;right:${sidePad}px;top:${timeInfoTop}px;
    font-size:${timeSize}px;color:rgba(232,196,122,0.4);
    font-family:${TYPE.timeInfo.font};
    text-align:center;letter-spacing:${TYPE.timeInfo.spacing};
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    pointer-events:none;z-index:10;">${esc(params.origRange)}</div>` : ""}
<div style="position:absolute;left:${sidePad}px;right:${sidePad}px;top:${topicTop}px;
    height:${scaleH(vp,GRID.topic.height)}px;
    padding-top:${scaleH(vp,6)}px;pointer-events:none;z-index:10;">
  <!-- topic label -->
  <div style="font-size:${labelSize}px;color:${tok.gold};font-weight:${TYPE.topicLabel.weight};
    letter-spacing:${TYPE.topicLabel.spacing};
    display:flex;align-items:center;gap:${scaleW(vp,8)}px;
    font-family:${TYPE.topicLabel.font};">
    ${esc(params.topicLabel || "正在聊")}
    <span style="flex:1;height:0.5px;background:linear-gradient(90deg,rgba(232,196,122,0.25),transparent);"></span>
  </div>
  <!-- topic text -->
  ${params.topic ? `<div style="font-size:${topicSize}px;color:${tok.textDim};
    font-weight:${TYPE.topicText.weight};line-height:${TYPE.topicText.lineHeight};
    margin-top:${scaleH(vp,8)}px;max-height:${scaleH(vp,80)}px;overflow:hidden;
    font-family:${TYPE.topicText.font};">${esc(params.topic)}</div>` : ""}
  <!-- tags -->
  ${tagsHtml ? `<div style="margin-top:${scaleH(vp,10)}px;display:flex;flex-wrap:nowrap;gap:${scaleW(vp,6)}px;overflow:hidden;">${tagsHtml}</div>` : ""}
</div>`;
}

export function screenshots() {
  return [{ t: 0, label: "meta-zone" }];
}

export function lint(_params, _vp) {
  return { ok: true, errors: [] };
}
