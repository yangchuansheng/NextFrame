export const meta = {
  id: "circleRipple",
  ratio: "9:16",
  category: "shapes",
  label: "Circle Ripple",
  description: "从中心扩散的同心圆波纹",
  tech: "canvas2d",
  duration_hint: 6,
  loopable: true,
  tags: ["circle", "ripple", "wave", "ambient"],
  params: {
    hueStart:  { type: "number", default: 185, range: [0, 360], step: 1, label: "起始色相", semantic: "first ring hue", group: "color" },
    hueSpan:   { type: "number", default: 180, range: [30, 300], step: 5, label: "色相跨度", semantic: "hue range across rings", group: "color" },
    ringCount: { type: "number", default: 9, range: [4, 16], step: 1, label: "环数", semantic: "max concurrent rings", group: "shape" },
    interval:  { type: "number", default: 0.26, range: [0.08, 1], step: 0.02, label: "生成间隔(s)", semantic: "time between new rings", group: "animation" },
    lifespan:  { type: "number", default: 2.1, range: [0.5, 6], step: 0.1, label: "存活时间(s)", semantic: "ring lifetime before fade", group: "animation" },
    thickness: { type: "number", default: 0.012, range: [0.004, 0.03], step: 0.001, label: "环宽", semantic: "ring thickness as ratio of min dimension", group: "shape" },
  },
  ai: {
    when: "需要节奏感/脉冲感的装饰背景时使用",
    example: { hueStart: 185, hueSpan: 180, ringCount: 9 },
    avoid: "不适合需要强烈视觉焦点的场景",
  },
};

export function render(t, params, vp) {
  const { hueStart, hueSpan, ringCount, interval, lifespan, thickness } = params;
  const W = vp.width, H = vp.height;
  const minDim = Math.min(W, H);
  const maxR = minDim * 0.45;
  const lineW = minDim * thickness;

  return `<canvas width="${W}" height="${H}" style="width:100%;height:100%;display:block" id="__sc"></canvas>
<script>(function(){
  var c=document.getElementById("__sc"),x=c.getContext("2d"),W=${W},H=${H},t=${t};
  var hS=${hueStart},hSpan=${hueSpan},rc=${ringCount},iv=${interval},ls=${lifespan},lw=${lineW},mR=${maxR};
  x.fillStyle="#0a0a12";x.fillRect(0,0,W,H);
  var cx=W/2,cy=H/2;
  for(var i=0;i<rc;i++){
    var age=(t-i*iv)%((rc)*iv);
    if(age<0) age+=rc*iv;
    var p=age/ls;
    if(p>1||p<0) continue;
    var ease=p*(2-p);
    var r=ease*mR;
    var alpha=1-p;
    var hue=hS+(hSpan*i/rc)%360;
    x.beginPath();
    x.arc(cx,cy,Math.max(1,r),0,Math.PI*2);
    x.strokeStyle="hsla("+hue+",70%,60%,"+alpha+")";
    x.lineWidth=lw*(1-p*0.5);
    x.stroke();
  }
})()<\/script>`;
}

export function screenshots() {
  return [
    { t: 0.5, label: "第一个环" },
    { t: 2, label: "多个环扩散" },
    { t: 5, label: "稳定状态" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.ringCount > 16) errors.push("ringCount 超过 16 上限。Fix: 设为 16 以内");
  if (params.lifespan < params.interval * 2) errors.push("lifespan 太短，环还没展开就消失了。Fix: lifespan 至少是 interval 的 2 倍");
  return { ok: errors.length === 0, errors };
}
