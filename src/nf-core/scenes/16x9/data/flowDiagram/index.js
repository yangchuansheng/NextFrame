export const meta = {
  id: "flowDiagram", version: 2, ratio: "16:9", category: "data",
  label: "Flow Diagram", description: "流程图：一排圆形节点加箭头，末尾可分叉。主节点用圆形（短文字/emoji），分叉节点用药丸标签（适合长文字如 PASS/BLOCK）。",
  tech: "dom", duration_hint: 12, loopable: false, z_hint: "middle",
  tags: ["流程", "flow", "diagram", "节点", "箭头", "pipeline"],
  mood: ["technical", "structured"], theme: ["tech", "education"],
  default_theme: "anthropic-warm",
  themes: {
    "anthropic-warm": {},
    "dark-blue": {},
    "minimal": {}
  },
  params: {
    nodes:         { type:"array",  required:true, default:[
      { icon:"AI", label:"AI 请求", sub:"要执行操作", color:"blue" },
      { icon:"H", label:"Hook 安检", sub:"脚本检查", color:"orange" }
    ], label:"主节点列表", semantic:"array of {icon,label,sub,color}. icon should be 1-2 chars or emoji", group:"content" },
    forkNodes:     { type:"array",  default:[
      { label:"PASS", sub:"放行执行", color:"green" },
      { label:"BLOCK", sub:"拦截拒绝", color:"red" }
    ], label:"分叉节点", semantic:"array of {label,sub,color}. label can be longer text like PASS/BLOCK", group:"content" },
    enterDelay:    { type:"number", default:0,    label:"出现延迟(s)",  group:"animation", range:[0,10], step:0.1 },
    y:             { type:"number", default:0,    label:"Y偏移(px, 0=居中)", semantic:"vertical position, 0 for centered", group:"style", range:[0,1080], step:10 }
  },
  ai: {
    when: "展示多步流程、决策分叉。主节点用短 icon（emoji/1-2字母），分叉节点用 label（可长文字）。",
    how: "color: 'blue'=#8ab4cc, 'orange'=#da7756, 'green'=#7ec699, 'red'=#e06c75。",
    example: {
      nodes:[
        {icon:"AI",label:"AI 请求",sub:"要执行操作",color:"blue"},
        {icon:"H",label:"Hook 安检",sub:"脚本检查",color:"orange"}
      ],
      forkNodes:[
        {label:"PASS",sub:"放行执行",color:"green"},
        {label:"BLOCK",sub:"拦截拒绝",color:"red"}
      ],
      enterDelay: 0.6,
      y: 540
    },
    theme_guide: { "anthropic-warm":"暖色调，金色引语", "dark-blue":"冷蓝", "minimal":"极简" },
    avoid: "nodes 超过 4 个会挤。icon 用 emoji 或 1-2 个字母，不要用长单词。",
    pairs_with: ["auroraGradient","slideChrome","subtitleBar"]
  }
};

function ease3(p){return 1-Math.pow(1-Math.max(0,Math.min(1,p)),3)}
function fadeIn(t,start,dur){return ease3((t-start)/dur)}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

const COLOR_MAP = { blue:"#8ab4cc", orange:"#da7756", green:"#7ec699", red:"#e06c75" };
function rc(c){ return COLOR_MAP[c] || c || "#8ab4cc"; }

// 主节点：圆形，icon 居中（auto font-size），下方 label + sub
function nodeCircle(icon, label, sub, color) {
  const c = rc(color);
  const iconLen = (icon||'').length;
  const fs = iconLen <= 2 ? 20 : iconLen <= 4 ? 14 : 11;
  return '<div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:90px">' +
    '<div style="width:72px;height:72px;border-radius:50%;border:2px solid '+c+';background:'+c+'15;' +
      'display:flex;align-items:center;justify-content:center;font:800 '+fs+'px \'SF Mono\',monospace;color:'+c+';flex-shrink:0;letter-spacing:.02em">' +
      esc(icon||'') +
    '</div>' +
    (label ? '<div style="font:600 14px system-ui,sans-serif;color:#f5ece0;text-align:center">'+esc(label)+'</div>' : '') +
    (sub   ? '<div style="font:400 12px \'SF Mono\',monospace;color:rgba(245,236,224,.45);text-align:center">'+esc(sub)+'</div>' : '') +
  '</div>';
}

// 箭头
function arrow() {
  return '<svg viewBox="0 0 60 24" style="width:60px;flex-shrink:0;margin:0 4px;align-self:center;margin-bottom:30px">' +
    '<line x1="4" y1="12" x2="48" y2="12" stroke="rgba(245,236,224,.25)" stroke-width="2"/>' +
    '<polygon points="46,6 58,12 46,18" fill="rgba(245,236,224,.25)"/>' +
  '</svg>';
}

// 分叉节点：药丸标签，label + sub 横排
function forkPill(label, sub, color) {
  const c = rc(color);
  return '<div style="display:flex;align-items:center;gap:12px;padding:8px 0">' +
    '<div style="padding:6px 18px;border-radius:20px;border:2px solid '+c+';background:'+c+'12;' +
      'font:700 14px \'SF Mono\',monospace;color:'+c+';letter-spacing:.05em;white-space:nowrap">' +
      esc(label||'') +
    '</div>' +
    (sub ? '<div style="font:400 13px system-ui,sans-serif;color:rgba(245,236,224,.6)">'+esc(sub)+'</div>' : '') +
  '</div>';
}

export function render(t, params, vp) {
  const p = {};
  for (const k in meta.params) p[k] = params[k] !== undefined ? params[k] : meta.params[k].default;
  const nodes = Array.isArray(p.nodes) ? p.nodes : [];
  const forkNodes = Array.isArray(p.forkNodes) ? p.forkNodes : [];
  const flowOp = fadeIn(t, p.enterDelay || 0, 0.8);
  const yPos = p.y || 0;

  // Main row: circle nodes with arrows
  const mainRow = nodes.map(function(n, i) {
    return (i > 0 ? arrow() : '') + nodeCircle(n.icon, n.label, n.sub, n.color);
  }).join('');

  // Fork: arrow + stacked pill tags
  let forkHtml = '';
  if (forkNodes.length > 0) {
    const pills = forkNodes.map(function(fn) {
      return forkPill(fn.label||fn.icon||'', fn.sub, fn.color);
    }).join('');
    forkHtml = '<div style="display:flex;align-items:center">' +
      arrow() +
      '<div style="display:flex;flex-direction:column;gap:4px">' + pills + '</div>' +
    '</div>';
  }

  const posStyle = yPos > 0
    ? 'position:absolute;left:0;right:0;top:'+yPos+'px;display:flex;justify-content:center'
    : 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center';
  const safeWidth = Math.max(360, vp.width - 120);

  return '<div style="'+posStyle+'">' +
    '<div style="display:flex;align-items:center;opacity:'+flowOp+';max-width:'+safeWidth+'px">' +
      mainRow + forkHtml +
    '</div>' +
  '</div>';
}

export function screenshots() {
  return [
    { t: 0.5, label: "标题淡入" },
    { t: 3.0, label: "流程节点出现" },
    { t: 6.5, label: "引语出现" }
  ];
}

export function lint(params, vp) {
  const errors = [];
  if(!params.nodes || !Array.isArray(params.nodes) || params.nodes.length === 0)
    errors.push("nodes 不能为空。Fix: 传入至少一个 {icon,label,sub,color} 对象");
  if(params.nodes && params.nodes.length > 4)
    errors.push("nodes 超过 4 个会溢出。Fix: 精简到 4 个以内");
  if(params.nodes) {
    params.nodes.forEach(function(n,i) {
      if(n.icon && n.icon.length > 4) errors.push("nodes["+i+"].icon '"+n.icon+"' 超过 4 字符会溢出圆圈。Fix: 用 1-2 字符或 emoji");
    });
  }
  return { ok: errors.length===0, errors: errors };
}
