import { TOKENS, GRID, TYPE, esc, scaleW, scaleH } from "../../../shared/design.js";

export const meta = {
  id: "interviewBiSub", version: 4, ratio: "9:16", category: "overlays",
  label: "Interview Bilingual Subtitle",
  description: "Time-synced bilingual subs matching old subs-zone.js: gold Chinese (speaker-colored) + dim italic English.",
  tech: "dom", duration_hint: 7, loopable: false, z_hint: "top",
  tags: ["overlays", "subtitle", "bilingual", "interview", "9x16"],
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    srt: { type: "array", default: [], label: "Subtitle array", semantic: "[{s,e,zh,en,speaker}] — speaker: 'dario'=gold, 'dwarkesh'=white", group: "content" },
    zh: { type: "string", default: "", label: "Static Chinese (fallback)", group: "content" },
    en: { type: "string", default: "", label: "Static English (fallback)", group: "content" },
  },
  ai: {
    when: "Interview subtitles. Use srt array for time-synced, or zh/en for static.",
    how: "srt: [{s:0, e:3, zh:'中文', en:'English', speaker:'dario'}]. Speaker colors: dario=#e8c47a, dwarkesh=#ffffff.",
  },
};

export function render(t, params, vp) {
  const srt = Array.isArray(params.srt) ? params.srt : [];
  let zh = "";
  let en = "";
  let speaker = "";

  if (srt.length > 0) {
    const entry = srt.find((e) => t >= Number(e.s || 0) && t < Number(e.e || 0));
    if (entry) {
      zh = esc(String(entry.zh || entry.t || ""));
      en = esc(String(entry.en || ""));
      speaker = String(entry.speaker || "");
    }
  } else {
    zh = esc(params.zh || "");
    en = esc(params.en || "");
  }

  if (!zh && !en) return "";

  // Speaker-based color: dario=gold, dwarkesh/default=white (matching old subs-zone.js)
  const cnColor = speaker === "dwarkesh" ? TOKENS.interview.text : TOKENS.interview.gold;
  const enColor = "rgba(255,255,255,0.45)";

  // Layout from GRID.subs: top 830, left/right 140, height 340
  const top = scaleH(vp, GRID.subs.top);
  const left = scaleW(vp, GRID.subs.left);
  const right = scaleW(vp, GRID.subs.right);
  const height = scaleH(vp, GRID.subs.height);
  const cnSize = scaleW(vp, TYPE.cnSub.size);
  const enSize = scaleW(vp, TYPE.enSub.size);
  const gap = scaleW(vp, 20);

  return `<div style="position:absolute;left:${left}px;right:${right}px;top:${top}px;height:${height}px;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:${gap}px;pointer-events:none;overflow:hidden">` +
    `<div style="width:100%;max-height:${scaleW(vp, 204)}px;overflow:hidden;font:${TYPE.cnSub.weight} ${cnSize}px/${TYPE.cnSub.lineHeight} ${TYPE.cnSub.font};color:${cnColor};text-align:center;text-shadow:0 1px 8px rgba(0,0,0,0.4);word-break:break-word">${zh}</div>` +
    (en ? `<div style="width:100%;max-height:${scaleW(vp, 72)}px;overflow:hidden;font:${TYPE.enSub.weight} ${enSize}px/${TYPE.enSub.lineHeight} ${TYPE.enSub.font};color:${enColor};text-align:center;font-style:italic;word-break:break-word">${en}</div>` : "") +
    `</div>`;
}

export function screenshots() {
  return [{ t: 1, label: "Subtitle visible" }, { t: 5, label: "Mid-clip" }];
}

export function lint(params) {
  const errors = [];
  if (!Array.isArray(params.srt) || params.srt.length === 0) {
    if (!params.zh) errors.push("Need srt array or static zh text");
  }
  return { ok: errors.length === 0, errors };
}
