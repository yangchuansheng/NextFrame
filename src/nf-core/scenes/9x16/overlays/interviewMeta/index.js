import { TOKENS, GRID, TYPE, esc, scaleW, scaleH, fadeIn, decoLine } from "../../../shared/design.js";

export const meta = {
  id: "interviewMeta", version: 3, ratio: "9:16", category: "overlays",
  label: "Interview Meta",
  description: "Time info + topic zone + tags, matching old clip-slide layout: time at 1186, topic at 1224, tags below.",
  tech: "dom", duration_hint: 20, loopable: true, z_hint: "top",
  tags: ["overlays", "interview", "meta", "tags", "9x16"],
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    origRange: { type: "string", default: "", label: "Time range text", group: "content" },
    topicLabel: { type: "string", default: "正在聊", label: "Topic label", group: "content" },
    topic: { type: "string", default: "", label: "Topic text", group: "content" },
    tags: { type: "string", default: "", label: "Tags (comma-separated)", group: "content" },
  },
  ai: { when: "Shows time info, topic, and tags between video area and progress bar." },
};

export function render(t, params, vp) {
  const origRange = esc(params.origRange || "");
  const topicLabel = esc(params.topicLabel || "正在聊");
  const topic = esc(params.topic || "");
  const tagsRaw = params.tags || "";
  const tagList = Array.isArray(tagsRaw)
    ? tagsRaw
    : String(tagsRaw).split(",").map((s) => s.trim()).filter(Boolean);
  const alpha = fadeIn(t, 0.08, 0.5);
  const pad = scaleW(vp, GRID.sidePad);
  // Time info row
  const timeY = scaleH(vp, GRID.timeInfo);
  const timeSize = scaleW(vp, TYPE.timeInfo.size);
  // Topic zone
  const topicY = scaleH(vp, GRID.topic.top);
  const labelSize = scaleW(vp, TYPE.topicLabel.size);
  const textSize = scaleW(vp, TYPE.topicText.size);
  // Tags
  const tagsY = topicY + scaleW(vp, 90);
  const tagSize = scaleW(vp, TYPE.tag.size);
  const tagPadX = scaleW(vp, 20);
  const tagPadY = scaleW(vp, 8);
  const tagGap = scaleW(vp, 12);
  const tagRadius = scaleW(vp, 8);

  const tagsHtml = tagList.slice(0, 3).map((tag) =>
    `<span style="flex-shrink:0;display:inline-flex;align-items:center;padding:${tagPadY}px ${tagPadX}px;border-radius:${tagRadius}px;background:${TOKENS.interview.tagBg};border:1px solid ${TOKENS.interview.tagBorder};font:${TYPE.tag.weight} ${tagSize}px ${TYPE.tag.font};color:${TOKENS.interview.tagText};letter-spacing:${TYPE.tag.spacing};white-space:nowrap">${esc(tag)}</span>`
  ).join("");

  return `<div style="position:absolute;inset:0;pointer-events:none;opacity:${alpha}">` +
    // Deco line above meta zone
    decoLine(vp, GRID.decoLine2) +
    // Time info (centered)
    (origRange ? `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${timeY}px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="font:${TYPE.timeInfo.weight} ${timeSize}px ${TYPE.timeInfo.font};color:rgba(232,196,122,0.4);letter-spacing:${TYPE.timeInfo.spacing}">${origRange}</span></div>` : "") +
    // Topic label + text
    `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${topicY}px">` +
    `<div style="display:flex;align-items:center;gap:${scaleW(vp, 16)}px">` +
    `<span style="font:${TYPE.topicLabel.weight} ${labelSize}px ${TYPE.topicLabel.font};color:${TOKENS.interview.gold};letter-spacing:${TYPE.topicLabel.spacing}">${topicLabel}</span>` +
    `<span style="flex:1;height:1px;background:linear-gradient(90deg,rgba(232,196,122,0.25),transparent)"></span>` +
    `</div>` +
    (topic ? `<div style="margin-top:${scaleW(vp, 16)}px;font:${TYPE.topicText.weight} ${textSize}px/${TYPE.topicText.lineHeight} ${TYPE.topicText.font};color:${TOKENS.interview.textDim};max-height:${scaleW(vp, 80)}px;overflow:hidden">${topic}</div>` : "") +
    `</div>` +
    // Tags
    (tagsHtml ? `<div style="position:absolute;left:${pad}px;right:${pad}px;top:${tagsY}px;display:flex;gap:${tagGap}px;flex-wrap:nowrap;overflow:hidden">${tagsHtml}</div>` : "") +
    `</div>`;
}

export function screenshots() {
  return [{ t: 0.1, label: "Meta fade in" }, { t: 10, label: "Meta visible" }];
}

export function lint(params) {
  return { ok: true, errors: [] };
}
