export const meta = {
  id: "interviewTopBar",
  version: 1,
  ratio: "9:16",
  category: "overlays",
  label: "Interview Top Bar",
  description: "顶部系列标题栏，显示系列名和期号，带橙色强调线",
  tech: "dom",
  duration_hint: 20,
  loopable: true,
  z_hint: "top",
  tags: ["overlays", "interview", "topbar", "9x16"],
  mood: ["professional"],
  theme: ["interview", "tech"],
  default_theme: "dark-interview",
  themes: {
    "dark-interview": { accentColor: "#da7756", textColor: "#f5ece0", bgColor: "rgba(10,10,10,0.8)" },
  },
  params: {
    series: { type: "string", default: "硅谷访谈", label: "系列名", group: "content" },
    episode: { type: "string", default: "E01", label: "期号", group: "content" },
    accentColor: { type: "color", default: "#da7756", label: "强调色", group: "color" },
    textColor: { type: "color", default: "#f5ece0", label: "文字颜色", group: "color" },
    bgColor: { type: "color", default: "rgba(10,10,10,0.8)", label: "背景色", group: "color" },
  },
  ai: {
    when: "访谈切片顶部系列标题栏，显示系列名和期号",
    how: "{ scene: \"interviewTopBar\", start: 0, dur: 20, params: { series: \"硅谷访谈\", episode: \"E01\" } }",
    example: { series: "硅谷访谈", episode: "E01" },
    avoid: "不要同时使用两个顶部bar",
    pairs_with: ["interviewBg", "interviewBiSub", "progressBar9x16"],
  },
};

function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function ease3(p) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, p)), 3); }

export function render(t, params, vp) {
  const series = esc(params.series || "硅谷访谈");
  const episode = esc(params.episode || "E01");
  const accentColor = params.accentColor || "#da7756";
  const textColor = params.textColor || "#f5ece0";
  const bgColor = params.bgColor || "rgba(10,10,10,0.8)";
  const barH = Math.round(vp.height * 0.072);
  const fontSize = Math.round(vp.width * 0.044);
  const accentBarH = Math.round(vp.height * 0.004);
  const pad = Math.round(vp.width * 0.06);
  const fadeAlpha = Math.min(1, t * 3);

  return `<div style="position:absolute;left:0;top:0;width:${vp.width}px;opacity:${fadeAlpha};pointer-events:none">
  <div style="width:${vp.width}px;height:${barH}px;background:${bgColor};display:flex;align-items:center;padding:0 ${pad}px;box-sizing:border-box;gap:${Math.round(vp.width*0.025)}px">
    <div style="width:3px;height:${Math.round(barH*0.55)}px;background:${accentColor};flex-shrink:0;border-radius:2px"></div>
    <span style="font-family:'PingFang SC','Helvetica Neue',sans-serif;font-size:${fontSize}px;font-weight:700;color:${accentColor};letter-spacing:0.02em">${series}</span>
    <span style="font-family:'Helvetica Neue',sans-serif;font-size:${Math.round(fontSize*0.8)}px;font-weight:400;color:${textColor};opacity:0.5;margin:0 2px">·</span>
    <span style="font-family:'Helvetica Neue',sans-serif;font-size:${Math.round(fontSize*0.82)}px;font-weight:600;color:${textColor};opacity:0.8;letter-spacing:0.06em">${episode}</span>
  </div>
  <div style="width:${vp.width}px;height:${accentBarH}px;background:linear-gradient(90deg,${accentColor} 0%,${accentColor}44 60%,transparent 100%)"></div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0.1, label: "顶部标题栏淡入" },
    { t: 10, label: "中段显示" },
  ];
}

export function lint(params, vp) {
  return { ok: true, errors: [] };
}
