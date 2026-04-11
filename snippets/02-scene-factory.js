// ============================================================
// 02. scene 函数的标准写法 — NextFrame 的组件库单位
// ============================================================
//
// scene 是纯函数：给定 (t, params)，返回/渲染一个画面元素。
// 所有 scene 都遵守相同签名，可在 timeline JSON 里任意组合。
//
// 签名：
//     function scene(t, params, ctx, gt) { ... }
//
// 参数：
//   t       - clip 内部时间 ms（0 到 clip.duration）
//   params  - JSON 里传进来的所有配置（位置/大小/文本/颜色/...）
//   ctx     - 渲染上下文（DOM 容器 或 Canvas ctx）
//   gt      - 全局时间 ms（全片时间，用于跨 clip 同步）
//
// 必须遵守的约束：
//   1. frame-pure：同样的 (t, params) 永远画出同样的东西
//   2. 不持有状态：不 setTimeout、不 requestAnimationFrame
//   3. 位置/大小来自 params，不硬编码
//   4. 尊重安全区（见下面 SAFE_ZONE）
//   5. 旋转/缩放用 CSS transform 或 canvas 变换矩阵，不自己算
//
// ============================================================

// 安全区约定（横屏 1920x1080）
export const SAFE_ZONE = {
  landscape: { top: 60, right: 120, bottom: 120, left: 120 },  // 标题党不要跨出
  portrait:  { top: 220, right: 80, bottom: 340, left: 80 },   // 竖屏避开 UI
};

// scene 注册表（由 renderAt 使用）
export const SCENES = {};

function registerScene(name, fn) {
  SCENES[name] = fn;
}

// ============================================================
// 示例 1：titleCard — 标题卡片（淡入 + 轻微位移）
// ============================================================
registerScene('titleCard', (t, params, ctx, gt) => {
  const {
    text = 'Title',
    x = 960, y = 540,         // 中心点（像素）
    size = 96,
    color = '#fff',
    fontFamily = 'Inter, system-ui',
    fadeIn = 300,             // 淡入时长 ms
  } = params;

  // 纯时间函数：不依赖外部 state
  const alpha = Math.min(1, t / fadeIn);
  const offsetY = (1 - alpha) * 20;  // 向上 20px → 0

  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: absolute;
    left: ${x}px; top: ${y + offsetY}px;
    transform: translate(-50%, -50%);
    font: 700 ${size}px ${fontFamily};
    color: ${color};
    opacity: ${alpha};
    white-space: nowrap;
  `;
  ctx.appendChild(el);
});

// ============================================================
// 示例 2：svgIcon — SVG 图标（描边动画 stroke-dashoffset）
// ============================================================
registerScene('svgIcon', (t, params, ctx, gt) => {
  const {
    path,                         // SVG path d
    x = 960, y = 540,
    size = 200,
    stroke = '#fff',
    width = 4,
    drawDuration = 800,
    total = 1000,                 // path 总长度，先用 getTotalLength 算好放 params
  } = params;

  const progress = Math.min(1, t / drawDuration);
  const dashOffset = total * (1 - progress);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);`;

  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', stroke);
  p.setAttribute('stroke-width', width);
  p.setAttribute('stroke-dasharray', total);
  p.setAttribute('stroke-dashoffset', dashOffset);
  svg.appendChild(p);

  ctx.appendChild(svg);
});

// ============================================================
// 示例 3：fourier — 傅立叶级数可视化（数学动画）
// ============================================================
registerScene('fourier', (t, params, ctx, gt) => {
  const {
    x = 960, y = 540, radius = 200,
    terms = 5,                    // 叠加几项
    speed = 0.002,                // 角速度 rad/ms
    color = '#42c8f5',
  } = params;

  const canvas = document.createElement('canvas');
  canvas.width = radius * 3;
  canvas.height = radius * 2.5;
  canvas.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%);`;
  const c = canvas.getContext('2d');

  // 绘制叠加圆（frame-pure：只依赖 t）
  let cx = radius * 0.5, cy = radius * 1.25;
  c.strokeStyle = color;
  c.lineWidth = 2;
  for (let k = 1; k <= terms; k++) {
    const n = 2 * k - 1;  // 方波级数：1, 3, 5, ...
    const r = (4 * radius) / (Math.PI * n);
    const angle = n * speed * t;
    const nx = cx + r * Math.cos(angle);
    const ny = cy + r * Math.sin(angle);
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(nx, ny);
    c.stroke();
    cx = nx; cy = ny;
  }
  ctx.appendChild(canvas);
});

// ============================================================
// 示例 4：chartBars — 柱状图（每根柱子独立缓动）
// ============================================================
registerScene('chartBars', (t, params, ctx, gt) => {
  const {
    x = 960, y = 540,
    width = 800, height = 400,
    data = [],                    // [{label, value}]
    max = 100,
    color = '#42c8f5',
    barDelay = 80,                // 每根柱依次入场
    barDuration = 500,
  } = params;

  const container = document.createElement('div');
  container.style.cssText = `
    position:absolute;left:${x}px;top:${y}px;
    transform:translate(-50%,-50%);
    width:${width}px;height:${height}px;
    display:flex;align-items:flex-end;gap:${width / data.length * 0.2}px;
  `;

  data.forEach((d, i) => {
    const local = t - i * barDelay;
    const p = Math.max(0, Math.min(1, local / barDuration));
    const eased = 1 - Math.pow(1 - p, 3);  // ease-out cubic
    const h = (d.value / max) * height * eased;

    const bar = document.createElement('div');
    bar.style.cssText = `
      flex:1; height:${h}px; background:${color};
      border-radius:4px 4px 0 0;
    `;
    container.appendChild(bar);
  });
  ctx.appendChild(container);
});

// ============================================================
// 示例 5：caption — 字幕（字级高亮，配合 audio 驱动）
// ============================================================
registerScene('caption', (t, params, ctx, gt) => {
  const {
    x = 960, y = 960,
    words = [],                   // [{text, start, end}] 相对 clip 起点
    size = 56,
    color = '#fff',
    activeColor = '#ffd34d',
  } = params;

  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute;left:${x}px;top:${y}px;
    transform:translate(-50%,-50%);
    font:600 ${size}px Inter, system-ui;
    color:${color};
    text-shadow:0 2px 8px rgba(0,0,0,0.8);
    display:flex;gap:0.35em;flex-wrap:wrap;justify-content:center;
    max-width:80%;
  `;
  for (const w of words) {
    const active = t >= w.start && t < w.end;
    const span = document.createElement('span');
    span.textContent = w.text;
    if (active) span.style.color = activeColor;
    el.appendChild(span);
  }
  ctx.appendChild(el);
});

export { registerScene };
