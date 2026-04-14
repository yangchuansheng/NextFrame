export const meta = {
  // ─── 身份 ───
  id: "particleField",
  version: 1,
  ratio: "4:3",

  // ─── 分类与发现 ───
  category: "backgrounds",
  label: "Particle Field",
  description: "漂浮粒子场背景。大量小粒子缓慢漂移，相邻粒子之间绘制半透明连线，形成动态星图网络效果。",
  tags: ["particles", "network", "ambient", "looping", "tech", "dark", "constellation"],
  mood: ["calm", "mysterious", "futuristic"],
  theme: ["tech", "science", "data", "space"],

  // ─── 渲染 ───
  tech: "canvas2d",
  duration_hint: 15,
  loopable: true,
  z_hint: "bottom",

  // ─── 主题预设 ───
  default_theme: "deep-space",
  themes: {
    "deep-space":   { hue: 220, saturation: 70, count: 80, speed: 0.4, connectDist: 0.18, particleSize: 1.5, lineOpacity: 0.3 },
    "neon-web":     { hue: 160, saturation: 90, count: 100, speed: 0.6, connectDist: 0.2, particleSize: 1.8, lineOpacity: 0.4 },
    "warm-dust":    { hue: 35,  saturation: 60, count: 70, speed: 0.3, connectDist: 0.15, particleSize: 1.2, lineOpacity: 0.25 },
    "violet-haze":  { hue: 280, saturation: 80, count: 90, speed: 0.5, connectDist: 0.17, particleSize: 1.6, lineOpacity: 0.35 },
    "ice-crystal":  { hue: 195, saturation: 50, count: 60, speed: 0.25, connectDist: 0.22, particleSize: 1.3, lineOpacity: 0.2 },
  },

  // ─── 参数 ───
  params: {
    hue:          { type: "number", default: 220, range: [0, 360], step: 1, label: "粒子色相", semantic: "hue of particles and connections, 220=blue, 160=cyan, 280=purple", group: "color" },
    saturation:   { type: "number", default: 70, range: [20, 100], step: 1, label: "饱和度", semantic: "color saturation 20=muted, 70=normal, 100=vivid neon", group: "color" },
    count:        { type: "number", default: 80, range: [20, 150], step: 5, label: "粒子数量", semantic: "number of floating particles, 40=sparse, 80=normal, 120=dense", group: "content" },
    speed:        { type: "number", default: 0.4, range: [0, 2], step: 0.05, label: "漂移速度", semantic: "particle drift speed: 0=frozen, 0.4=slow ambient, 1=noticeable, 2=fast", group: "animation" },
    connectDist:  { type: "number", default: 0.18, range: [0.05, 0.35], step: 0.01, label: "连线距离", semantic: "max connection distance as fraction of canvas width, 0.1=short 0.2=medium 0.3=long", group: "style" },
    particleSize: { type: "number", default: 1.5, range: [0.5, 4], step: 0.1, label: "粒子大小", semantic: "radius of each particle in pixels at 1440 width, 1=small dot, 2=medium, 4=large", group: "style" },
    lineOpacity:  { type: "number", default: 0.3, range: [0, 0.8], step: 0.05, label: "连线透明度", semantic: "opacity of connection lines, 0=no lines, 0.3=subtle, 0.8=strong", group: "style" },
  },

  // ─── AI 使用指南 ───
  ai: {
    when: "需要科技感/数据感背景时使用。适合：产品演示铺垫、数据报告底层、AI/科技主题开场、教育视频背景",
    how: "放在 z-index 最底层，全屏铺满。上面叠文字或图表。调整 hue 控制整体色调，count 控制密度。",
    example: { hue: 220, saturation: 70, count: 80, speed: 0.4, connectDist: 0.18, particleSize: 1.5, lineOpacity: 0.3 },
    theme_guide: "deep-space=深蓝科技, neon-web=青绿霓虹, warm-dust=暖色尘埃, violet-haze=紫色雾感, ice-crystal=冰蓝极简",
    avoid: "不要和其他背景 scene 叠加；count>120 在低性能设备可能掉帧；不适合需要亮色背景的场景",
    pairs_with: ["kineticHeadline", "lowerThirdVelvet", "barChartReveal"],
  },
};

// Deterministic particle seed — generates stable positions from index
function seedParticle(i, W, H, T, speed) {
  // Use fixed seed offsets per particle so render is deterministic for same t
  const sx = Math.sin(i * 127.1) * 0.5 + 0.5;
  const sy = Math.sin(i * 311.7) * 0.5 + 0.5;
  const vx = (Math.sin(i * 43.3) * 2 - 1) * speed * 0.02;
  const vy = (Math.sin(i * 79.6) * 2 - 1) * speed * 0.02;
  // Wrap around with fract
  const px = ((sx + vx * T) % 1 + 1) % 1;
  const py = ((sy + vy * T) % 1 + 1) % 1;
  return { x: px * W, y: py * H };
}

export function render(t, params, vp) {
  const { hue, saturation, count, speed, connectDist, particleSize, lineOpacity } = params;
  const W = vp.width, H = vp.height;
  const T = t * speed;
  const maxDist = connectDist * W;
  const n = Math.round(count);

  // Build particle list as JSON to pass into inline script
  const particles = [];
  for (let i = 0; i < n; i++) {
    const p = seedParticle(i, W, H, T, speed);
    particles.push(p);
  }
  const particlesJson = JSON.stringify(particles);

  return `<canvas width="${W}" height="${H}" style="width:100%;height:100%;display:block" id="__pf"></canvas>
<script>(function(){
  const c=document.getElementById("__pf"),x=c.getContext("2d");
  const W=${W},H=${H},maxD=${maxDist},ps=${particleSize},lo=${lineOpacity};
  const sat=${saturation},hue=${hue};
  const pts=${particlesJson};
  x.fillStyle="#0a0a12";x.fillRect(0,0,W,H);
  // draw connections
  if(lo>0){
    for(let i=0;i<pts.length;i++){
      for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<maxD){
          const a=lo*(1-d/maxD);
          x.strokeStyle="hsla("+hue+","+sat+"%,65%,"+a+")";
          x.lineWidth=0.6;
          x.beginPath();x.moveTo(pts[i].x,pts[i].y);x.lineTo(pts[j].x,pts[j].y);x.stroke();
        }
      }
    }
  }
  // draw particles
  for(let i=0;i<pts.length;i++){
    const bright=55+Math.sin(i*1.7)*15;
    x.beginPath();x.arc(pts[i].x,pts[i].y,ps,0,Math.PI*2);
    x.fillStyle="hsla("+hue+","+sat+"%,"+bright+"%,0.85)";x.fill();
  }
})()</` + `script>`;
}

export function screenshots() {
  return [
    { t: 0, label: "初始状态" },
    { t: 5, label: "漂移中" },
    { t: 12, label: "接近循环点" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.count < 20 || params.count > 150) {
    errors.push(`count=${params.count} 超出范围 [20, 150]。Fix: 设为 20-150 之间的值`);
  }
  if (params.speed < 0 || params.speed > 2) {
    errors.push(`speed=${params.speed} 超出范围 [0, 2]。Fix: 设为 0-2 之间的值`);
  }
  if (params.connectDist < 0.05 || params.connectDist > 0.35) {
    errors.push(`connectDist=${params.connectDist} 超出范围 [0.05, 0.35]。Fix: 设为 0.05-0.35 之间的值`);
  }
  if (params.lineOpacity < 0 || params.lineOpacity > 0.8) {
    errors.push(`lineOpacity=${params.lineOpacity} 超出范围 [0, 0.8]。Fix: 设为 0-0.8 之间的值`);
  }
  if (params.particleSize < 0.5 || params.particleSize > 4) {
    errors.push(`particleSize=${params.particleSize} 超出范围 [0.5, 4]。Fix: 设为 0.5-4 之间的值`);
  }
  if (params.saturation < 20 || params.saturation > 100) {
    errors.push(`saturation=${params.saturation} 超出范围 [20, 100]。Fix: 设为 20-100 之间的值`);
  }
  return { ok: errors.length === 0, errors };
}
