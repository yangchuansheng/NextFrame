export const meta = {
  id: "subtitleBar", version: 1, ratio: "16:9", category: "overlays",
  label: "Subtitle Bar", description: "底部字幕条，根据 SRT 时间数据同步显示字幕。字体大小随字数自动缩小。",
  tech: "dom", duration_hint: 0, loopable: true, z_hint: "top",
  tags: ["字幕", "subtitle", "srt", "overlay", "caption"],
  mood: ["neutral"], theme: ["tech", "education", "vlog"],
  default_theme: "anthropic-warm",
  themes: {
    "anthropic-warm": { textColor:"#f5ece0", shadowColor:"rgba(0,0,0,.9)" },
    "dark-minimal": { textColor:"#ffffff", shadowColor:"rgba(0,0,0,.95)" },
    "warm-focus": { textColor:"#f8e6cb", shadowColor:"rgba(26,21,16,.95)" }
  },
  params: {
    srt:         { type:"array",  required:true, default:[
      { s:0, e:2.5, t:"第五个，Hook。" },
      { s:3, e:6.5, t:"如果你用过 Git Hook 的话，commit 之前会先跑一遍检查。" },
      { s:7, e:10, t:"不通过就不让提交，Claude Hook 也是这个思路。" }
    ], label:"字幕数据", semantic:"array of {s,e,t} where s=start(s), e=end(s), t=text", group:"content" },
    fontSize:    { type:"number", default:22,     label:"基础字号(px)",  group:"style", range:[12,36], step:1 },
    y:           { type:"number", default:70,     label:"距底部(px)",    semantic:"distance from bottom edge", group:"style", range:[20,200], step:5 },
    textColor:   { type:"color",  default:"#f5ece0",       label:"字幕颜色", group:"color" },
    shadowColor: { type:"color",  default:"rgba(0,0,0,.9)", label:"阴影颜色", group:"color" }
  },
  ai: {
    when: "给视频添加字幕时。srt 数组来自 TTS 对齐或手动标注。",
    how: "每个条目 {s:开始秒, e:结束秒, t:文字}。render(t,...) 会自动找到当前 t 对应的字幕。",
    example: { srt:[{s:0,e:2.5,t:"这是第一句字幕"},{s:2.8,e:5.0,t:"这是第二句字幕，稍微长一点点"}], y:70 },
    theme_guide: { "anthropic-warm":"暖白文字 + 黑色阴影", "dark-minimal":"纯白字幕", "warm-focus":"暖白字幕 + 棕黑阴影" },
    avoid: "单条字幕超过 80 字建议拆分，否则字号会缩到 16px 影响可读性。",
    pairs_with: ["auroraGradient","slideChrome","progressBar16x9"]
  }
};

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

export function render(t, params, vp) {
  const p = {};
  for (const k in meta.params) p[k] = params[k] !== undefined ? params[k] : meta.params[k].default;
  const srt = Array.isArray(p.srt) ? p.srt : [];
  let current = null;
  for (let i = 0; i < srt.length; i++) {
    const entry = srt[i];
    if (t >= entry.s && t <= entry.e) { current = entry; break; }
  }
  if (!current || !current.t) return '';
  const text = String(current.t);
  const len = text.length;
  let fs;
  if (len <= 20) fs = p.fontSize || 22;
  else if (len <= 40) fs = 20;
  else if (len <= 60) fs = 18;
  else fs = 16;
  const y = p.y || 70;
  const shadow = '0 2px 8px '+p.shadowColor+',0 1px 3px '+p.shadowColor;
  const maxWidth = Math.max(320, vp.width - 160);
  return '<div style="position:absolute;bottom:'+y+'px;left:0;right:0;text-align:center;' +
    'font:500 '+fs+'px \'PingFang SC\',\'Noto Sans SC\',system-ui,sans-serif;' +
    'color:'+p.textColor+';' +
    'text-shadow:'+shadow+';' +
    'padding:0 80px;line-height:1.5;max-width:'+maxWidth+'px;margin:0 auto">' +
    esc(text) +
  '</div>';
}

export function screenshots() {
  return [
    { t: 0.5,  label: "第一条字幕" },
    { t: 2.0,  label: "字幕显示中" },
    { t: 3.5,  label: "第二条字幕（若有）" }
  ];
}

export function lint(params, vp) {
  const errors = [];
  if(!params.srt || !Array.isArray(params.srt) || params.srt.length === 0)
    errors.push("srt 不能为空。Fix: 传入 [{s,e,t}] 格式的字幕数组");
  if(Array.isArray(params.srt)) {
    params.srt.forEach(function(item, i) {
      if(item.s === undefined || item.e === undefined || !item.t)
        errors.push("srt["+i+"] 缺少 s/e/t 字段。Fix: 确保每条字幕有 {s:开始秒, e:结束秒, t:文字}");
    });
  }
  return { ok: errors.length===0, errors: errors };
}
