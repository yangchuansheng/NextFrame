// interviewBrand — 9:16 底部品牌区：装饰线 + 品牌名 + 团队署名
import { TOKENS, GRID, TYPE, scaleW, scaleH, esc, decoLine } from "../../../shared/design.js";

export const meta = {
  id: "interviewBrand",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Brand Bar",
  description: "底部品牌区：装饰分隔线 + 品牌名 + 数字员工署名行",
  tech: "dom",
  duration_hint: 60,
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    brand: { type: "string", default: "OPC · 王宇轩", label: "品牌名", group: "content" },
    teamLine: {
      type: "string",
      default: "该视频由数字员工 Alysa 全自动负责剪辑 · 翻译 · 字幕 · 讲解 · 封面 · 发布",
      label: "团队署名行",
      group: "content",
    },
  },
  ai: {
    when: "9:16 访谈视频底部品牌区",
    how: "传入 brand（品牌名）和 teamLine（数字员工署名）",
  },
};

export function render(_t, params, vp) {
  const tok = TOKENS.interview;
  const brandTop = scaleH(vp, GRID.brand);
  const teamTop = scaleH(vp, GRID.teamLine);
  const brandSize = scaleW(vp, TYPE.brand.size);
  const teamSize = scaleW(vp, TYPE.teamLine.size);

  return `${decoLine(vp, GRID.decoLine3)}
<div style="position:absolute;left:0;right:0;top:${brandTop}px;height:${scaleH(vp,30)}px;
    display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10;">
  <span style="font-size:${brandSize}px;color:${tok.gold};
    font-family:${TYPE.brand.font};
    letter-spacing:${TYPE.brand.spacing};font-weight:${TYPE.brand.weight};">${esc(params.brand)}</span>
</div>
<div style="position:absolute;left:0;right:0;top:${teamTop}px;
    text-align:center;
    font-size:${teamSize}px;color:${tok.textFaint};
    font-family:${TYPE.teamLine.font};
    letter-spacing:${TYPE.teamLine.spacing};
    pointer-events:none;z-index:10;">${esc(params.teamLine)}</div>`;
}

export function screenshots() {
  return [{ t: 0, label: "brand-bar" }];
}

export function lint(_params, _vp) {
  return { ok: true, errors: [] };
}
