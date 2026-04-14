export const meta = {
  id: "auroraGradient",
  ratio: "9:16",
  category: "backgrounds",
  label: "Aurora Gradient",
  description: "极光渐变背景，带胶片颗粒感",
  tech: "canvas2d",
  duration_hint: 12,
  loopable: true,
  tags: ["gradient", "ambient", "looping"],
  params: {
    hueA:      { type: "number", default: 270, range: [0, 360], step: 1, label: "主色相", semantic: "primary hue angle on color wheel", group: "color" },
    hueB:      { type: "number", default: 200, range: [0, 360], step: 1, label: "副色相", semantic: "secondary hue", group: "color" },
    hueC:      { type: "number", default: 320, range: [0, 360], step: 1, label: "第三色相", semantic: "tertiary hue", group: "color" },
    intensity: { type: "number", default: 1, range: [0, 1.5], step: 0.05, label: "色彩强度", semantic: "saturation intensity, 0=gray 1.5=vivid", group: "color" },
    grain:     { type: "number", default: 0.04, range: [0, 0.15], step: 0.005, label: "颗粒感", semantic: "film grain overlay intensity, 0=clean", group: "style" },
    speed:     { type: "number", default: 0.3, range: [0, 2], step: 0.05, label: "流动速度", semantic: "animation speed multiplier", group: "animation" },
  },
  ai: {
    when: "需要氛围感背景时使用，放在最底层",
    example: { hueA: 270, hueB: 200, hueC: 320, intensity: 1.2 },
    avoid: "不要和其他背景 scene 叠加",
  },
};

export function render(t, params, vp) {
  const { hueA, hueB, hueC, intensity, grain, speed } = params;
  const W = vp.width, H = vp.height, T = t * speed;
  return `<canvas width="${W}" height="${H}" style="width:100%;height:100%;display:block" id="__sc"></canvas>
<script>(function(){
  var c=document.getElementById("__sc"),x=c.getContext("2d"),W=${W},H=${H},T=${T};
  var hA=${hueA},hB=${hueB},hC=${hueC},I=${intensity},G=${grain};
  function blob(cx,cy,r,h,a){var g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,"hsla("+h+","+Math.round(70*I)+"%,55%,"+a+")");g.addColorStop(1,"hsla("+h+","+Math.round(70*I)+"%,55%,0)");x.fillStyle=g;x.fillRect(0,0,W,H)}
  x.fillStyle="#0a0a12";x.fillRect(0,0,W,H);x.globalCompositeOperation="lighter";
  blob(W*(0.3+0.2*Math.sin(T*0.7)),H*(0.2+0.12*Math.cos(T*0.5)),W*0.8,hA,0.6);
  blob(W*(0.7+0.15*Math.cos(T*0.6)),H*(0.45+0.15*Math.sin(T*0.4)),W*0.7,hB,0.5);
  blob(W*(0.5+0.2*Math.sin(T*0.8)),H*(0.7+0.1*Math.cos(T*0.9)),W*0.75,hC,0.45);
  blob(W*(0.4+0.1*Math.cos(T*1.1)),H*(0.9+0.05*Math.sin(T*0.6)),W*0.5,hA+40,0.3);
  x.globalCompositeOperation="source-over";
  if(G>0.001){var d=x.getImageData(0,0,W,H),p=d.data,g2=255*G;for(var i=0;i<p.length;i+=16){var n=(Math.random()-0.5)*g2;p[i]+=n;p[i+1]+=n;p[i+2]+=n}x.putImageData(d,0,0)}
})()<\/script>`;
}

export function screenshots() {
  return [
    { t: 0, label: "初始状态" },
    { t: 4, label: "流动中" },
    { t: 10, label: "接近循环点" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.intensity > 1.5) errors.push("intensity 超出范围 [0, 1.5]。Fix: 设为 1.5 以内");
  if (params.grain > 0.15) errors.push("grain 超出范围 [0, 0.15]。Fix: 设为 0.15 以内");
  return { ok: errors.length === 0, errors };
}
