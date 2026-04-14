export const meta = {
  // ─── 身份 ───
  id: "starBurst",
  version: 1,
  ratio: "9:16",

  // ─── 分类与发现 ───
  category: "shapes",
  label: "Star Burst",
  description: "星芒爆炸：多角星从中心向四周爆裂弹射，尾迹拖光，循环往复。适合开场、高潮转场、能量感画面。",
  tags: ["star", "burst", "explosion", "particle", "energy", "radial", "dynamic"],
  mood: ["energetic", "dramatic", "exciting"],
  theme: ["celebration", "tech", "action"],

  // ─── 渲染 ───
  tech: "canvas2d",
  duration_hint: 8,
  loopable: true,
  z_hint: "middle",

  // ─── 主题预设（5 个）───
  default_theme: "gold-burst",
  themes: {
    "gold-burst":    { hueCenter: 45,  hueSpread: 30,  starCount: 12, points: 6, speed: 1.0, trailLength: 0.35, glowRadius: 0.018, bgAlpha: 0.18 },
    "neon-cyan":     { hueCenter: 185, hueSpread: 40,  starCount: 10, points: 5, speed: 1.2, trailLength: 0.40, glowRadius: 0.020, bgAlpha: 0.15 },
    "fire-red":      { hueCenter: 10,  hueSpread: 25,  starCount: 14, points: 8, speed: 1.5, trailLength: 0.30, glowRadius: 0.022, bgAlpha: 0.20 },
    "violet-plasma": { hueCenter: 280, hueSpread: 50,  starCount: 11, points: 7, speed: 0.9, trailLength: 0.45, glowRadius: 0.016, bgAlpha: 0.16 },
    "rainbow-nova":  { hueCenter: 0,   hueSpread: 180, starCount: 16, points: 5, speed: 1.1, trailLength: 0.38, glowRadius: 0.019, bgAlpha: 0.12 },
  },

  // ─── 参数 ───
  params: {
    hueCenter:   { type: "number", default: 45,   range: [0, 360],   step: 1,    label: "主色相",     semantic: "center hue for star colors, 45=gold 185=cyan 10=red 280=violet", group: "color" },
    hueSpread:   { type: "number", default: 30,   range: [0, 180],   step: 5,    label: "色相扩散",   semantic: "hue variation range across stars: 0=monochrome, 180=full rainbow", group: "color" },
    starCount:   { type: "number", default: 12,   range: [4, 24],    step: 1,    label: "星芒数量",   semantic: "number of stars bursting per cycle, 4=sparse 24=dense", group: "shape" },
    points:      { type: "number", default: 6,    range: [3, 12],    step: 1,    label: "角数",       semantic: "number of points per star shape: 3=triangle 5=classic 8=complex", group: "shape" },
    speed:       { type: "number", default: 1.0,  range: [0.3, 3.0], step: 0.1,  label: "爆发速度",   semantic: "star travel speed: 0.3=slow float, 1=normal burst, 3=fast explosion", group: "animation" },
    trailLength: { type: "number", default: 0.35, range: [0.05, 0.7], step: 0.05, label: "尾迹长度",  semantic: "motion trail as fraction of max radius: 0.05=short, 0.5=long comet tail", group: "animation" },
    glowRadius:  { type: "number", default: 0.018, range: [0.005, 0.05], step: 0.001, label: "光晕半径", semantic: "glow halo size as fraction of min dimension: small=tight point, large=diffuse glow", group: "style" },
    bgAlpha:     { type: "number", default: 0.18, range: [0.05, 0.5], step: 0.01, label: "背景透明度", semantic: "per-frame background clear alpha: low=long trails, high=clean fade. 0.5=instant clear", group: "style" },
  },

  // ─── AI 使用指南 ───
  ai: {
    when: "需要能量感、爆炸感、庆祝感的中间层装饰。适合：开场爆发、高潮转场、数字庆典、倒计时结束。",
    how: "叠在背景层之上（z_hint=middle）。搭配 auroraGradient 做底色，kineticHeadline 做文字叠加。speed 控制节奏，starCount 控制密度。",
    example: { hueCenter: 45, hueSpread: 30, starCount: 12, points: 6, speed: 1.0, trailLength: 0.35, glowRadius: 0.018, bgAlpha: 0.18 },
    theme_guide: "gold-burst=金色爆裂, neon-cyan=霓虹青, fire-red=火焰红, violet-plasma=紫色等离子, rainbow-nova=彩虹新星",
    avoid: "不要叠两个 starBurst。不适合需要静谧/沉稳感的场景。bgAlpha 过低（<0.05）时尾迹会堆叠模糊，bgAlpha 过高（>0.45）时尾迹消失。",
    pairs_with: ["auroraGradient", "kineticHeadline", "lowerThirdVelvet"],
  },
};

// ─── deterministic pseudo-random (seed-based) ───
function seededRng(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function render(t, params, vp) {
  const { hueCenter, hueSpread, starCount, points, speed, trailLength, glowRadius, bgAlpha } = params;
  const W = vp.width, H = vp.height;
  const minDim = Math.min(W, H);
  const maxR = minDim * 0.48;
  const glowR = minDim * glowRadius;

  // Serialize star initial angles + hues using seed so render is pure
  const stars = [];
  const rng = seededRng(42);
  for (let i = 0; i < starCount; i++) {
    const angle = (2 * Math.PI * i) / starCount + rng() * 0.3 - 0.15;
    const hue = ((hueCenter + (rng() - 0.5) * hueSpread * 2) + 360) % 360;
    const phaseOffset = rng(); // each star starts at a different point in the cycle
    stars.push({ angle, hue, phaseOffset });
  }

  const starsJson = JSON.stringify(stars);

  return `<canvas width="${W}" height="${H}" style="width:100%;height:100%;display:block" id="__sc"></canvas>
<script>(function(){
  const c=document.getElementById("__sc"),x=c.getContext("2d"),W=${W},H=${H},t=${t};
  const cx=W/2,cy=H/2,maxR=${maxR},glowR=${glowR},spd=${speed},trail=${trailLength},bg=${bgAlpha},pts=${points};
  const stars=${starsJson};

  // Per-frame dim (motion trail effect via semi-transparent overlay)
  x.fillStyle="rgba(10,10,18,"+bg+")";
  x.fillRect(0,0,W,H);

  function drawStar(sx,sy,r,hue,alpha,npts){
    if(r<1) return;
    const outer=r,inner=r*0.42;
    x.beginPath();
    for(let i=0;i<npts*2;i++){
      const a=(Math.PI/npts)*i - Math.PI/2;
      const rr=i%2===0?outer:inner;
      if(i===0) x.moveTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr);
      else x.lineTo(sx+Math.cos(a)*rr,sy+Math.sin(a)*rr);
    }
    x.closePath();
    x.fillStyle="hsla("+hue+",85%,68%,"+alpha+")";
    x.fill();
  }

  function drawGlow(sx,sy,hue,alpha){
    const g=x.createRadialGradient(sx,sy,0,sx,sy,glowR*2.5);
    g.addColorStop(0,"hsla("+hue+",90%,80%,"+(alpha*0.9)+")");
    g.addColorStop(0.4,"hsla("+hue+",80%,65%,"+(alpha*0.5)+")");
    g.addColorStop(1,"hsla("+hue+",70%,55%,0)");
    x.fillStyle=g;
    x.beginPath();
    x.arc(sx,sy,glowR*2.5,0,Math.PI*2);
    x.fill();
  }

  stars.forEach(function(star){
    // Each star has its own phase cycle (period = 1/spd seconds normalized)
    const cycleDuration=1/spd;
    const phase=((t*spd)+star.phaseOffset)%1; // 0..1 cycle progress
    // Travel: 0→maxR over first 70% of cycle, then fade 70%→100%
    const travelPhase=phase<0.7?phase/0.7:1;
    const fadePhase=phase>=0.7?(phase-0.7)/0.3:0;
    const r=travelPhase*maxR;
    const alpha=phase<0.7?1:1-fadePhase;
    const sx=cx+Math.cos(star.angle)*r;
    const sy=cy+Math.sin(star.angle)*r;

    // Draw trail (smaller stars behind)
    const trailR=r-trail*maxR;
    if(trailR>0&&alpha>0.05){
      const tAlpha=alpha*0.35;
      const tSize=glowR*1.2;
      x.globalCompositeOperation="lighter";
      const tg=x.createRadialGradient(
        cx+Math.cos(star.angle)*trailR,cy+Math.sin(star.angle)*trailR,0,
        cx+Math.cos(star.angle)*trailR,cy+Math.sin(star.angle)*trailR,tSize*3);
      tg.addColorStop(0,"hsla("+star.hue+",80%,70%,"+tAlpha+")");
      tg.addColorStop(1,"hsla("+star.hue+",70%,55%,0)");
      x.fillStyle=tg;
      x.beginPath();
      x.arc(cx+Math.cos(star.angle)*trailR,cy+Math.sin(star.angle)*trailR,tSize*3,0,Math.PI*2);
      x.fill();
      x.globalCompositeOperation="source-over";
    }

    // Draw glow halo
    if(alpha>0.05){
      x.globalCompositeOperation="lighter";
      drawGlow(sx,sy,star.hue,alpha*0.6);
      x.globalCompositeOperation="source-over";
    }

    // Draw star shape
    if(alpha>0.05){
      const starSize=glowR*1.8*(0.5+travelPhase*0.5);
      drawStar(sx,sy,starSize,star.hue,alpha,pts);
    }
  });
})()<\/script>`;
}

export function screenshots() {
  return [
    { t: 0.2, label: "爆炸开始" },
    { t: 0.5, label: "星芒扩散中" },
    { t: 2.0, label: "完整爆发效果" },
    { t: 5.0, label: "循环稳定状态" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.starCount > 24) errors.push("starCount 超过上限 24。Fix: 设为 24 以内");
  if (params.starCount < 4) errors.push("starCount 低于下限 4。Fix: 设为 4 以上");
  if (params.points < 3) errors.push("points 不能低于 3。Fix: 至少设为 3");
  if (params.points > 12) errors.push("points 超过上限 12。Fix: 设为 12 以内");
  if (params.bgAlpha < 0.05) errors.push("bgAlpha 过低（<0.05），尾迹会堆叠模糊。Fix: 设为 0.05 以上");
  if (params.bgAlpha > 0.5) errors.push("bgAlpha 超出范围 [0.05, 0.5]。Fix: 设为 0.5 以内");
  if (params.speed <= 0) errors.push("speed 必须大于 0。Fix: 设为 0.3 以上");
  if (params.glowRadius > 0.05) errors.push("glowRadius 超出范围，光晕会过大。Fix: 设为 0.05 以内");
  return { ok: errors.length === 0, errors };
}
