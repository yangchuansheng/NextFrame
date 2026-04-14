// interviewHeader — 9:16 顶部区域：系列名 + 标题 + 装饰分隔线
import { TOKENS, GRID, TYPE, scaleW, scaleH, esc, decoLine, fadeIn } from "../../../shared/design.js";

export const meta = {
  id: "interviewHeader",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Header",
  description: "顶部系列名 + 集数标题，含两条装饰分隔线",
  tech: "dom",
  duration_hint: 60,
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    seriesName: { type: "string", default: "速通硅谷访谈", label: "系列名（顶部金字）", group: "content" },
    episode: { type: "string", default: "E01", label: "集数", group: "content" },
    guest: { type: "string", default: "", label: "嘉宾名", group: "content" },
    title: { type: "string", default: "指数快到头了，大众浑然不知", label: "标题", group: "content" },
    clipLabel: { type: "string", default: "CLIP 1/1", label: "片段标签（如 CLIP 1/3）", group: "content" },
  },
  ai: {
    when: "9:16 访谈视频顶部区域，显示系列名、集数、标题",
    how: "传入 seriesName、episode、guest、title；clipLabel 用于视频区角标",
  },
};

export function render(t, params, vp) {
  const p = params;
  const tok = TOKENS.interview;
  const headerH = scaleH(vp, GRID.header.height);
  const sidePad = scaleW(vp, GRID.sidePad);

  // Series line: "速通硅谷访谈 · E01 · Dario Amodei"
  const seriesFull = [p.seriesName, p.episode, p.guest].filter(Boolean).join(" · ");

  const alpha = fadeIn(t, 0, 0.4);

  const seriesSize = scaleW(vp, TYPE.seriesName.size);
  const titleSize = scaleW(vp, TYPE.title.size);

  return `<div style="position:absolute;left:0;right:0;top:0;height:${headerH}px;
    display:flex;flex-direction:column;justify-content:flex-end;
    padding:0 ${sidePad}px ${scaleH(vp,24)}px;
    opacity:${alpha.toFixed(3)};pointer-events:none;">
  <!-- series name -->
  <div style="font-size:${seriesSize}px;font-weight:${TYPE.seriesName.weight};
    color:${tok.gold};letter-spacing:${TYPE.seriesName.spacing};
    text-align:center;margin-bottom:${scaleH(vp,12)}px;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    font-family:${TYPE.seriesName.font};">${esc(seriesFull)}</div>
  <!-- title -->
  <div style="font-size:${titleSize}px;font-weight:${TYPE.title.weight};
    color:${tok.text};line-height:${TYPE.title.lineHeight};
    text-align:center;letter-spacing:${TYPE.title.spacing};
    font-family:${TYPE.title.font};
    overflow:hidden;">${esc(p.title)}</div>
</div>
${decoLine(vp, GRID.decoLine1)}`;
}

export function screenshots() {
  return [
    { t: 0.1, label: "header-fadein" },
    { t: 1, label: "header-full" },
  ];
}

export function lint(params, _vp) {
  const errors = [];
  if (!params.title || params.title.trim() === "") errors.push("title 不能为空");
  return { ok: errors.length === 0, errors };
}
