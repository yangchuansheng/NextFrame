// ==========================================
// Fourier project — scene library.
// Each scene is a factory (params, api) → { tick, draw, op, cleanup }.
// The engine does not know anything about what's inside.
// ==========================================

const TAU = Math.PI * 2;
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

function dashedLine(ctx, x0, y0, x1, y1, dash, color, width) {
  ctx.save();
  ctx.setLineDash(dash || [4, 4]);
  ctx.strokeStyle = color || '#4a4a5c';
  ctx.lineWidth = width || 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

// ---------- 2D shape library (DFT of parametric curves) ----------
function sampleHeart(N) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push([x * 9, y * 9]);
  }
  return pts;
}
function sampleCat(N) {
  const ctrl = [
    [0, -92], [22, -118], [38, -92], [58, -116], [82, -94], [96, -66],
    [102, -36], [86, -8], [98, 22], [82, 54], [54, 72], [18, 80],
    [-18, 80], [-54, 72], [-82, 54], [-98, 22], [-86, -8], [-102, -36],
    [-96, -66], [-82, -94], [-58, -116], [-38, -92], [-22, -118],
  ];
  const n = ctrl.length;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * n;
    const i0 = Math.floor(t) % n;
    const i1 = (i0 + 1) % n;
    const i2 = (i0 + 2) % n;
    const im = (i0 - 1 + n) % n;
    const f = t - Math.floor(t);
    const [p0x, p0y] = ctrl[im];
    const [p1x, p1y] = ctrl[i0];
    const [p2x, p2y] = ctrl[i1];
    const [p3x, p3y] = ctrl[i2];
    const x = 0.5 * ((2 * p1x) + (-p0x + p2x) * f + (2 * p0x - 5 * p1x + 4 * p2x - p3x) * f * f + (-p0x + 3 * p1x - 3 * p2x + p3x) * f * f * f);
    const y = 0.5 * ((2 * p1y) + (-p0y + p2y) * f + (2 * p0y - 5 * p1y + 4 * p2y - p3y) * f * f + (-p0y + 3 * p1y - 3 * p2y + p3y) * f * f * f);
    pts.push([x * 1.7, y * 1.7]);
  }
  return pts;
}
function dft(pts) {
  const N = pts.length;
  const out = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const [x, y] = pts[n];
      const phi = (TAU * k * n) / N;
      const c = Math.cos(phi), s = Math.sin(phi);
      re += x * c + y * s;
      im += -x * s + y * c;
    }
    re /= N; im /= N;
    const freq = k < N / 2 ? k : k - N;
    out.push({ freq, radius: Math.hypot(re, im), phase: Math.atan2(im, re) });
  }
  return out.sort((a, b) => b.radius - a.radius);
}
const SHAPES = {};
function ensureShape(name) {
  if (SHAPES[name]) return SHAPES[name];
  const pts = name === 'heart' ? sampleHeart(256) : name === 'cat' ? sampleCat(256) : null;
  if (!pts) return null;
  SHAPES[name] = dft(pts);
  return SHAPES[name];
}

// ============================================================
// HERO scene — big centered title + optional square wave
// ============================================================
export function heroScene(params, api) {
  const state = {
    t: 0,
    pulse: 0,
    shake: 0,
    revealHint: 0,
  };
  const dom = {};

  // Inject DOM
  api.overlay.innerHTML = `
    <div class="hero-root">
      <div class="hero-main" data-ref="main">${params.title || ''}</div>
      <div class="hero-sub" data-ref="sub">${params.subtitle || ''}</div>
    </div>
  `;
  dom.main = api.overlay.querySelector('[data-ref="main"]');
  dom.sub  = api.overlay.querySelector('[data-ref="sub"]');

  // Scoped CSS
  injectCss('hero-scene', `
    .hero-root {
      position: absolute;
      left: 50%; top: 22%;
      transform: translate(-50%, 0);
      text-align: center;
      max-width: 90%;
    }
    .hero-main {
      font-size: clamp(64px, 8vw, 120px);
      font-weight: 800;
      letter-spacing: -0.01em;
      background: linear-gradient(135deg, #ffffff 0%, #ffd58c 50%, #ff9a3c 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      line-height: 1.15;
      opacity: 0;
      transform: translateY(14px);
      animation: hero-rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    .hero-sub {
      margin-top: 22px;
      font-size: clamp(22px, 2.2vw, 34px);
      color: #b5a8c8;
      font-weight: 500;
      letter-spacing: 0.02em;
      opacity: 0;
      animation: hero-rise 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s forwards;
    }
    .hero-root.flash .hero-main {
      animation: hero-flash 0.6s ease-out;
    }
    @keyframes hero-rise {
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes hero-flash {
      0% { filter: brightness(1); }
      30% { filter: brightness(1.8) saturate(1.3); transform: scale(1.02); }
      100% { filter: brightness(1); transform: scale(1); }
    }
  `);

  return {
    tick(dt) {
      state.t += dt;
      state.pulse *= Math.exp(-dt * 2);
      state.shake *= Math.exp(-dt * 4);
    },
    draw(ctx, W, H) {
      if (!params.showWave) return;
      const wy = H * 0.66;
      const ww = Math.min(W * 0.52, 640);
      const wx0 = W / 2 - ww / 2;
      const amp = Math.min(H * 0.15, 100);
      ctx.save();
      const shakeX = (Math.random() - 0.5) * state.shake * 10;
      ctx.translate(shakeX, 0);

      // backdrop glow
      const grad = ctx.createLinearGradient(wx0, wy - amp, wx0 + ww, wy + amp);
      grad.addColorStop(0, 'rgba(255, 154, 60, 0)');
      grad.addColorStop(0.5, 'rgba(255, 154, 60, 0.08)');
      grad.addColorStop(1, 'rgba(255, 154, 60, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(wx0 - 40, wy - amp - 40, ww + 80, amp * 2 + 80);

      // wave stroke
      ctx.strokeStyle = '#ff9a3c';
      ctx.lineWidth = 4 + state.pulse * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 154, 60, 0.8)';
      ctx.shadowBlur = 22 + state.pulse * 28;
      ctx.beginPath();
      const periods = 3;
      for (let i = 0; i <= periods * 2; i++) {
        const x = wx0 + (i / (periods * 2)) * ww;
        const y = wy + (i % 2 === 0 ? -amp : amp);
        if (i === 0) ctx.moveTo(x, y);
        else {
          const yPrev = wy + ((i - 1) % 2 === 0 ? -amp : amp);
          ctx.lineTo(x, yPrev);
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Hidden ghost circles
      if (state.revealHint > 0) {
        const a = state.revealHint;
        ctx.save();
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = '#6ba5ff';
        ctx.lineWidth = 1.4;
        let gx = wx0 + 20;
        const gy = wy;
        for (const r of [46, 16, 10, 7]) {
          ctx.beginPath();
          ctx.arc(gx, gy, r, 0, TAU);
          ctx.stroke();
          gx += r * 1.1;
        }
        ctx.restore();
      }
      ctx.restore();
    },
    op(name, args) {
      if (name === 'pulse') state.pulse = 1;
      if (name === 'shake') state.shake = 1;
      if (name === 'set_title') {
        dom.main.style.transition = 'opacity 0.35s, transform 0.35s';
        dom.main.style.opacity = '0';
        dom.main.style.transform = 'translateY(8px)';
        setTimeout(() => {
          dom.main.textContent = args;
          dom.main.style.opacity = '1';
          dom.main.style.transform = 'translateY(0)';
          api.overlay.querySelector('.hero-root').classList.add('flash');
          setTimeout(() => api.overlay.querySelector('.hero-root')?.classList.remove('flash'), 700);
        }, 360);
      }
      if (name === 'set_subtitle') dom.sub.textContent = args;
      if (name === 'reveal') {
        const t0 = state.t;
        const from = state.revealHint;
        const tween = () => {
          const p = clamp((state.t - t0) / 0.8, 0, 1);
          state.revealHint = lerp(from, 1, easeOutCubic(p));
          if (p < 1) requestAnimationFrame(tween);
        };
        requestAnimationFrame(tween);
      }
    },
    cleanup() { removeCss('hero-scene'); },
  };
}

// ============================================================
// FOURIER scene — epicycle chain (1D or 2D)
// ============================================================
export function fourierScene(params, api) {
  const state = {
    mode: params.mode || 'real-square',
    numCircles: params.numCircles || 1,
    circlesVisible: 0,
    t: 0,
    speed: params.speed || 0.28,
    shapeName: params.shapeName || 'heart',
    shapeTermCount: params.shapeTermCount || 80,

    baseR: 110,
    chainCx: 300,
    chainCy: 300,
    traceX0: 500,
    traceWidth: 500,
    traceY: 300,
    traceBuffer: [],
    traceSamples: 420,

    shapeTrace: [],
    shapeMaxTrace: 900,

    showTarget: params.showTarget || false,
    targetAlpha: 0,
  };

  if (state.mode === 'shape-2d') ensureShape(state.shapeName);

  const dom = {};
  api.overlay.innerHTML = `
    <div class="stage-title">
      <span class="stc-dot"></span>
      <span class="stc-tag">${params.stageTag || ''}</span>
      <span class="stc-title">${params.stageTitle || ''}</span>
    </div>
    <div class="count-badge" data-ref="badge">
      <span class="num" data-ref="num">1</span>
      <span class="label" data-ref="label"></span>
    </div>
    ${params.formula ? `<div class="formula" data-ref="formula">${params.formula}</div>` : ''}
    <div class="rule-callout" data-ref="rule"></div>
    <div class="shape-label" data-ref="shapeLabel"></div>
  `;
  dom.badge = api.overlay.querySelector('[data-ref="badge"]');
  dom.num = api.overlay.querySelector('[data-ref="num"]');
  dom.label = api.overlay.querySelector('[data-ref="label"]');
  dom.formula = api.overlay.querySelector('[data-ref="formula"]');
  dom.rule = api.overlay.querySelector('[data-ref="rule"]');
  dom.shapeLabel = api.overlay.querySelector('[data-ref="shapeLabel"]');
  dom.annos = {};

  injectCss('fourier-scene', `
    .stage-title {
      position: absolute;
      left: 8px; top: 8px;
      display: flex; gap: 14px; align-items: center;
      opacity: 0;
      animation: stg-rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s forwards;
    }
    @keyframes stg-rise { to { opacity: 1; } }
    .stage-title .stc-dot {
      width: 12px; height: 12px; border-radius: 50%;
      background: #ff9a3c;
      box-shadow: 0 0 16px #ff9a3c;
    }
    .stage-title .stc-tag {
      font-size: clamp(15px, 1.2vw, 19px); color: #9a8eb5;
      letter-spacing: 0.22em; text-transform: uppercase;
      font-weight: 700;
    }
    .stage-title .stc-title {
      font-size: clamp(24px, 2.2vw, 34px); color: #fff; font-weight: 800;
      letter-spacing: 0.01em;
    }
    .count-badge {
      position: absolute;
      right: 3%; top: 8%;
      text-align: center;
      opacity: 0;
      transform: scale(0.7);
      transition: opacity 0.4s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .count-badge.show { opacity: 1; transform: scale(1); }
    .count-badge .num {
      font-size: clamp(140px, 18vw, 280px);
      font-weight: 900;
      line-height: 0.85;
      background: linear-gradient(180deg, #ffd58c 0%, #ff9a3c 55%, #d86a1f 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 0 120px rgba(255, 154, 60, 0.5);
      font-variant-numeric: tabular-nums;
      display: block;
    }
    .count-badge .label {
      font-size: clamp(17px, 1.4vw, 22px);
      color: #b5a8c8;
      margin-top: 12px;
      letter-spacing: 0.2em;
      font-weight: 700;
    }
    .count-badge.flash .num {
      animation: num-flash 0.5s ease-out;
    }
    @keyframes num-flash {
      0% { transform: scale(1); }
      40% { transform: scale(1.15); filter: brightness(1.4); }
      100% { transform: scale(1); }
    }
    .formula {
      position: absolute;
      left: 50%; bottom: 3%;
      transform: translate(-50%, 10px);
      font-family: "SF Mono", "JetBrains Mono", Menlo, monospace;
      font-size: clamp(22px, 1.8vw, 30px);
      font-weight: 600;
      padding: 18px 32px;
      background: rgba(23, 23, 42, 0.82);
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      letter-spacing: 0.04em;
      opacity: 0;
      transition: opacity 0.5s, transform 0.5s;
      white-space: nowrap;
      max-width: 92%;
    }
    .formula.show { opacity: 1; transform: translate(-50%, 0); }
    .formula .term { color: #c4c0d4; transition: color 0.35s, text-shadow 0.35s; }
    .formula .term.hi {
      color: #ffc98a;
      text-shadow: 0 0 24px rgba(255, 154, 60, 0.9);
    }
    .rule-callout {
      position: absolute;
      left: 50%; bottom: 20%;
      transform: translateX(-50%);
      font-size: clamp(20px, 1.8vw, 28px);
      color: #ffc98a;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 14px 26px;
      background: rgba(255, 154, 60, 0.12);
      border: 1.5px solid rgba(255, 154, 60, 0.5);
      border-radius: 999px;
      opacity: 0;
      transition: opacity 0.4s;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 0 40px rgba(255, 154, 60, 0.2);
      white-space: nowrap;
    }
    .rule-callout.show { opacity: 1; }
    .shape-label {
      position: absolute;
      left: 50%; top: 5%;
      transform: translate(-50%, 0);
      font-size: clamp(44px, 5vw, 72px);
      font-weight: 800;
      letter-spacing: 0.02em;
      background: linear-gradient(135deg, #ff9a3c 0%, #ff6bb5 50%, #8b6dff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      opacity: 0;
      transition: opacity 0.5s;
      text-align: center;
    }
    .shape-label.show { opacity: 1; }
    .anno {
      position: absolute;
      padding: 18px 26px;
      background: rgba(255, 154, 60, 0.16);
      border: 2px solid rgba(255, 154, 60, 0.6);
      color: #ffe4c2;
      border-radius: 16px;
      font-size: clamp(22px, 1.8vw, 30px);
      font-weight: 700;
      letter-spacing: 0.02em;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 18px 40px rgba(0,0,0,0.45), 0 0 44px rgba(255,154,60,0.25);
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.35s, transform 0.35s;
      max-width: 360px;
      line-height: 1.35;
    }
    .anno.show { opacity: 1; transform: translateY(0); }
  `);

  function updateLayout(W, H) {
    const landscape = W > H * 1.15;
    if (state.mode === 'real-square') {
      if (landscape) {
        // Horizontal: chain left, trace right — push chain smaller; trace uses ~half width
        state.chainCx = W * 0.24;
        state.chainCy = H * 0.55;
        state.baseR = Math.max(130, Math.min(H * 0.38, W * 0.16, 240));
        state.traceX0 = W * 0.5;
        state.traceWidth = W * 0.46;
        state.traceY = H * 0.55;
      } else {
        // Portrait: chain top-center, trace below
        state.chainCx = W * 0.5;
        state.chainCy = H * 0.3;
        state.baseR = Math.max(90, Math.min(W * 0.26, H * 0.22, 180));
        state.traceX0 = W * 0.06;
        state.traceWidth = W * 0.88;
        state.traceY = H * 0.68;
      }
    } else {
      state.chainCx = landscape ? W * 0.42 : W * 0.5 - (W * 0.18);
      state.chainCy = H * 0.55;
    }
  }

  function computeRealSquareChain() {
    const chain = [];
    let x = state.chainCx, y = state.chainCy;
    const omega = TAU * state.speed;
    const maxVisible = Math.min(state.numCircles, Math.floor(state.circlesVisible) + 1);
    for (let k = 0; k < maxVisible; k++) {
      const n = 2 * k + 1;
      let r = state.baseR / n;
      if (k === maxVisible - 1 && state.circlesVisible < state.numCircles) {
        const frac = state.circlesVisible - Math.floor(state.circlesVisible);
        r *= easeOutCubic(frac);
      }
      const angle = n * omega * state.t;
      chain.push({ x, y, r, angle, n });
      x += r * Math.cos(angle);
      y += r * Math.sin(angle);
    }
    return chain;
  }

  function computeShapeChain() {
    const shape = ensureShape(state.shapeName);
    if (!shape) return [];
    const chain = [];
    let x = state.chainCx + 150, y = state.chainCy;
    const omega = TAU * state.speed * 0.55;
    const N = Math.min(state.shapeTermCount, shape.length);
    for (let i = 0; i < N; i++) {
      const c = shape[i];
      const r = c.radius;
      const angle = c.phase + c.freq * omega * state.t;
      chain.push({ x, y, r, angle });
      x += r * Math.cos(angle);
      y += r * Math.sin(angle);
    }
    return chain;
  }

  function drawRealSquare(ctx) {
    const chain = computeRealSquareChain();
    ctx.save();
    for (const c of chain) {
      ctx.strokeStyle = 'rgba(170, 185, 235, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, TAU);
      ctx.stroke();
    }
    for (const c of chain) {
      const tx = c.x + c.r * Math.cos(c.angle);
      const ty = c.y + c.r * Math.sin(c.angle);
      ctx.strokeStyle = '#c0d0ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.fillStyle = '#c0d0ff';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, TAU);
      ctx.fill();
    }
    let tipX = state.chainCx, tipY = state.chainCy;
    if (chain.length > 0) {
      const last = chain[chain.length - 1];
      tipX = last.x + last.r * Math.cos(last.angle);
      tipY = last.y + last.r * Math.sin(last.angle);
      ctx.fillStyle = '#ff4d5e';
      ctx.shadowColor = 'rgba(255, 77, 94, 0.95)';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 10, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      const sampleY = state.traceY + (tipY - state.chainCy);
      const headX = state.traceX0 + state.traceWidth;
      dashedLine(ctx, tipX, tipY, headX, sampleY, [7, 6], 'rgba(255, 77, 94, 0.58)', 2);
    }
    ctx.restore();

    // trace area (axis centered at traceY)
    ctx.save();
    ctx.strokeStyle = 'rgba(110, 110, 140, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.moveTo(state.traceX0, state.traceY);
    ctx.lineTo(state.traceX0 + state.traceWidth, state.traceY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.targetAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = state.targetAlpha * 0.6;
      ctx.strokeStyle = '#6ba5ff';
      ctx.lineWidth = 3.4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      const amp = state.baseR * (Math.PI / 4);
      const periods = 2;
      const periodW = state.traceWidth / periods;
      let first = true;
      for (let p = 0; p < periods; p++) {
        const x0 = state.traceX0 + p * periodW;
        const x1 = x0 + periodW / 2;
        const x2 = x0 + periodW;
        if (first) { ctx.moveTo(x0, state.traceY - amp); first = false; }
        ctx.lineTo(x1, state.traceY - amp);
        ctx.lineTo(x1, state.traceY + amp);
        ctx.lineTo(x2, state.traceY + amp);
        ctx.lineTo(x2, state.traceY - amp);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (state.traceBuffer.length > 1) {
      ctx.strokeStyle = '#ff9a3c';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 154, 60, 0.65)';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      const dx = state.traceWidth / (state.traceSamples - 1);
      const startI = state.traceSamples - state.traceBuffer.length;
      // each sample stored as offset-from-chainCy → plot at traceY + offset
      for (let i = 0; i < state.traceBuffer.length; i++) {
        const x = state.traceX0 + (startI + i) * dx;
        const y = state.traceY + state.traceBuffer[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawShape2D(ctx) {
    const chain = computeShapeChain();
    if (chain.length === 0) return;
    ctx.save();
    for (const c of chain) {
      if (c.r < 1.5) continue;
      ctx.strokeStyle = 'rgba(150, 165, 220, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, TAU);
      ctx.stroke();
    }
    for (const c of chain) {
      const tx = c.x + c.r * Math.cos(c.angle);
      const ty = c.y + c.r * Math.sin(c.angle);
      ctx.strokeStyle = 'rgba(165, 191, 255, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    const last = chain[chain.length - 1];
    const tipX = last.x + last.r * Math.cos(last.angle);
    const tipY = last.y + last.r * Math.sin(last.angle);
    ctx.strokeStyle = '#ff9a3c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 154, 60, 0.5)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < state.shapeTrace.length; i++) {
      const [x, y] = state.shapeTrace[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (state.shapeTrace.length > 0) ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff4d5e';
    ctx.shadowColor = 'rgba(255, 77, 94, 0.85)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5.5, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  return {
    tick(dt) {
      state.t += dt;
      updateLayout(api.W, api.H);
      if (state.circlesVisible < state.numCircles) {
        state.circlesVisible = Math.min(state.numCircles, state.circlesVisible + dt * 3);
      }
      if (state.showTarget) state.targetAlpha = Math.min(1, state.targetAlpha + dt * 1.5);
      else state.targetAlpha = Math.max(0, state.targetAlpha - dt * 1.5);

      if (state.mode === 'real-square') {
        const chain = computeRealSquareChain();
        if (chain.length > 0) {
          const last = chain[chain.length - 1];
          const ty = last.y + last.r * Math.sin(last.angle);
          // store offset from chain center so trace can be drawn at any traceY
          state.traceBuffer.push(ty - state.chainCy);
          if (state.traceBuffer.length > state.traceSamples) state.traceBuffer.shift();
        }
      } else if (state.mode === 'shape-2d') {
        const chain = computeShapeChain();
        if (chain.length > 0) {
          const last = chain[chain.length - 1];
          const tipX = last.x + last.r * Math.cos(last.angle);
          const tipY = last.y + last.r * Math.sin(last.angle);
          state.shapeTrace.push([tipX, tipY]);
          if (state.shapeTrace.length > state.shapeMaxTrace) state.shapeTrace.shift();
        }
      }
    },
    draw(ctx) {
      if (state.mode === 'real-square') drawRealSquare(ctx);
      else if (state.mode === 'shape-2d') drawShape2D(ctx);
    },
    op(name, args) {
      if (name === 'set_circles') {
        state.numCircles = args.n;
        if (args.snap) state.circlesVisible = args.n;
      }
      if (name === 'show_target') state.showTarget = true;
      if (name === 'hide_target') state.showTarget = false;
      if (name === 'count') {
        dom.num.textContent = args.num;
        if (args.label != null) dom.label.textContent = args.label;
        dom.badge.classList.add('show');
        dom.badge.classList.remove('flash');
        void dom.badge.offsetWidth;
        dom.badge.classList.add('flash');
      }
      if (name === 'count_hide') dom.badge.classList.remove('show');
      if (name === 'anno') {
        let a = dom.annos[args.id];
        if (!a) {
          a = api.el(`<div class="anno"></div>`);
          api.overlay.appendChild(a);
          dom.annos[args.id] = a;
        }
        a.textContent = args.text;
        if (args.x != null) a.style.left = args.x;
        if (args.y != null) a.style.top = args.y;
        if (args.right != null) a.style.right = args.right;
        if (args.bottom != null) a.style.bottom = args.bottom;
        requestAnimationFrame(() => a.classList.add('show'));
      }
      if (name === 'anno_hide') dom.annos[args]?.classList.remove('show');
      if (name === 'formula_show') dom.formula?.classList.add('show');
      if (name === 'formula_hi') {
        if (!dom.formula) return;
        dom.formula.querySelectorAll('.term').forEach(t => t.classList.remove('hi'));
        for (const id of args) {
          dom.formula.querySelector(`[data-term="${id}"]`)?.classList.add('hi');
        }
      }
      if (name === 'rule') {
        dom.rule.textContent = args;
        dom.rule.classList.add('show');
      }
      if (name === 'rule_hide') dom.rule.classList.remove('show');
      if (name === 'morph_shape') {
        state.mode = 'shape-2d';
        state.shapeName = args.shape;
        state.shapeTrace = [];
        ensureShape(args.shape);
        dom.shapeLabel.innerHTML = args.label || '';
        dom.shapeLabel.classList.add('show');
        dom.formula?.classList.remove('show');
        dom.rule.classList.remove('show');
        dom.badge.classList.remove('show');
      }
      if (name === 'shape_terms') state.shapeTermCount = args;
    },
    cleanup() { removeCss('fourier-scene'); },
  };
}

// ============================================================
// SPECTRUM scene — wave → arrow → spectrum bars
// ============================================================
export function spectrumScene(params, api) {
  const state = { t: 0, phase: 'wave', barProgress: 0, wavePts: [] };
  const bars = [
    { mag: 0.62 }, { mag: 0.34 }, { mag: 0.55 }, { mag: 0.22 },
    { mag: 0.42 }, { mag: 0.17 }, { mag: 0.29 }, { mag: 0.12 },
    { mag: 0.2 }, { mag: 0.14 },
  ];
  (function genWave() {
    const N = 520;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * 10;
      const v = Math.sin(t * 1.2) * 0.6 + Math.sin(t * 2.7 + 0.5) * 0.35 +
                Math.sin(t * 4.1 + 1.2) * 0.25 + Math.sin(t * 7.3 + 2) * 0.15;
      state.wavePts.push(v);
    }
  })();

  api.overlay.innerHTML = `
    <div class="stage-title">
      <span class="stc-dot"></span>
      <span class="stc-tag">INVERSE</span>
      <span class="stc-title">反过来：从波形算出藏着的圆</span>
    </div>
    <div class="spec-col wave-col show" data-ref="waveCol">
      <div class="tag">SIGNAL</div>
      <div class="val">一句话的声音</div>
    </div>
    <div class="spec-col arrow-col" data-ref="arrowCol">
      <div class="tag">TRANSFORM</div>
      <div class="val">傅里叶变换</div>
    </div>
    <div class="spec-col spec-col-right" data-ref="specCol">
      <div class="tag">SPECTRUM</div>
      <div class="val">藏着的圆</div>
    </div>
  `;
  const dom = {
    waveCol: api.overlay.querySelector('[data-ref="waveCol"]'),
    arrowCol: api.overlay.querySelector('[data-ref="arrowCol"]'),
    specCol: api.overlay.querySelector('[data-ref="specCol"]'),
  };

  injectCss('spectrum-scene', `
    .spec-col {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.5s, transform 0.5s;
    }
    .spec-col.show { opacity: 1; transform: translateY(0); }
    .spec-col .tag {
      font-size: 11px; color: #7a7190;
      letter-spacing: 0.22em; text-transform: uppercase;
      font-weight: 700;
    }
    .spec-col .val {
      font-size: clamp(20px, 2vw, 28px);
      font-weight: 700;
      color: #fff;
    }
    .wave-col { left: 15%; top: 20%; }
    .arrow-col { left: 50%; top: 20%; transform: translate(-50%, 8px); }
    .arrow-col.show { transform: translate(-50%, 0); }
    .arrow-col .val {
      background: linear-gradient(135deg,#b8d4ff,#6ba5ff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .spec-col-right { right: 10%; top: 20%; }
  `);

  return {
    tick(dt) {
      state.t += dt;
      if (state.phase === 'bars' && state.barProgress < 1) {
        state.barProgress = Math.min(1, state.barProgress + dt * 1.1);
      }
    },
    draw(ctx, W, H) {
      // waveform (left)
      const wx = W * 0.22;
      const wy = H * 0.62;
      const ww = W * 0.22;
      const amp = Math.min(H * 0.13, 80);
      ctx.save();
      ctx.strokeStyle = '#ff9a3c';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = 'rgba(255, 154, 60, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const off = Math.floor(state.t * 15);
      for (let i = 0; i < state.wavePts.length; i++) {
        const x = wx - ww / 2 + (i / state.wavePts.length) * ww;
        const idx = (i + off) % state.wavePts.length;
        const y = wy + state.wavePts[idx] * amp;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // arrow (center)
      if (state.phase !== 'wave') {
        ctx.save();
        const ax = W * 0.5;
        const ay = H * 0.62;
        ctx.strokeStyle = '#6ba5ff';
        ctx.fillStyle = '#6ba5ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(107, 165, 255, 0.5)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(ax - 44, ay);
        ctx.lineTo(ax + 44, ay);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + 44, ay);
        ctx.lineTo(ax + 28, ay - 9);
        ctx.lineTo(ax + 28, ay + 9);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // bars (right)
      if (state.phase === 'bars') {
        ctx.save();
        const sx0 = W * 0.66;
        const sy = H * 0.72;
        const barW = 24, gap = 14;
        const maxH = Math.min(H * 0.32, 200);
        for (let i = 0; i < bars.length; i++) {
          const progress = clamp(state.barProgress * bars.length - i, 0, 1);
          const h = bars[i].mag * maxH * easeOutCubic(progress);
          const x = sx0 + i * (barW + gap);
          const grad = ctx.createLinearGradient(x, sy - h, x, sy);
          grad.addColorStop(0, '#ffd58c');
          grad.addColorStop(1, '#ff9a3c');
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(255, 154, 60, 0.5)';
          ctx.shadowBlur = 10;
          ctx.fillRect(x, sy - h, barW, h);
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
    },
    op(name, args) {
      if (name === 'phase') {
        state.phase = args;
        if (args === 'arrow') dom.arrowCol.classList.add('show');
        if (args === 'bars') dom.specCol.classList.add('show');
      }
    },
    cleanup() { removeCss('spectrum-scene'); },
  };
}

// ============================================================
// GRID scene — application card grid (frame 8)
// ============================================================
export function gridScene(params, api) {
  const state = { t: 0 };
  const items = params.items || [];

  const itemsHtml = items.map(it => `
    <div class="app-card" data-item>
      <div class="big">${it.label}</div>
      <div class="small">${it.sub}</div>
    </div>
  `).join('');
  api.overlay.innerHTML = `
    <div class="stage-title">
      <span class="stc-dot"></span>
      <span class="stc-tag">IN THE WILD</span>
      <span class="stc-title">一切的底层</span>
    </div>
    <div class="app-grid">${itemsHtml}</div>
    <div class="tagline" data-ref="tagline">${params.tagline || ''}</div>
  `;
  const cards = [...api.overlay.querySelectorAll('[data-item]')];
  const dom = { tagline: api.overlay.querySelector('[data-ref="tagline"]') };

  injectCss('grid-scene', `
    .app-grid {
      position: absolute;
      inset: 12% 6% 18%;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 22px;
    }
    .app-card {
      border-radius: 18px;
      padding: 24px;
      background: rgba(23, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(14px) saturate(140%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.92);
      transition: opacity 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
                  transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .app-card.show { opacity: 1; transform: translateY(0) scale(1); }
    .app-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at top left, rgba(255, 154, 60, 0.22), transparent 60%);
      pointer-events: none;
    }
    .app-card .big {
      font-size: clamp(28px, 3.2vw, 46px);
      font-weight: 800;
      background: linear-gradient(135deg, #ffd58c, #ff9a3c 60%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      position: relative;
      z-index: 1;
    }
    .app-card .small {
      font-size: 13px;
      color: #7a7190;
      margin-top: 10px;
      letter-spacing: 0.15em;
      position: relative;
      z-index: 1;
    }
    .app-card:nth-child(2)::before { background: radial-gradient(ellipse at top left, rgba(107, 165, 255, 0.22), transparent 60%); }
    .app-card:nth-child(2) .big { background: linear-gradient(135deg, #b8d4ff, #6ba5ff 60%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .app-card:nth-child(3)::before { background: radial-gradient(ellipse at top left, rgba(183, 104, 255, 0.22), transparent 60%); }
    .app-card:nth-child(3) .big { background: linear-gradient(135deg, #e0b8ff, #b768ff 60%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .app-card:nth-child(4)::before { background: radial-gradient(ellipse at top left, rgba(92, 220, 165, 0.2), transparent 60%); }
    .app-card:nth-child(4) .big { background: linear-gradient(135deg, #b5f0d6, #5cdca5 60%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .app-card:nth-child(5)::before { background: radial-gradient(ellipse at top left, rgba(255, 120, 180, 0.22), transparent 60%); }
    .app-card:nth-child(5) .big { background: linear-gradient(135deg, #ffc0dc, #ff7ab5 60%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .app-card:nth-child(6)::before { background: radial-gradient(ellipse at top left, rgba(255, 215, 0, 0.2), transparent 60%); }
    .app-card:nth-child(6) .big { background: linear-gradient(135deg, #fff0a8, #ffd04a 60%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .tagline {
      position: absolute;
      left: 50%; bottom: 6%;
      transform: translate(-50%, 10px);
      font-size: clamp(20px, 2vw, 28px);
      font-weight: 700;
      letter-spacing: 0.02em;
      background: linear-gradient(90deg, #ff9a3c, #ff7ab8, #b878ff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      opacity: 0;
      transition: opacity 0.7s, transform 0.7s;
      text-align: center;
      white-space: nowrap;
    }
    .tagline.show { opacity: 1; transform: translate(-50%, 0); }
  `);

  return {
    tick(dt) { state.t += dt; },
    draw(ctx, W, H) {
      // subtle rotating background circles
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.strokeStyle = '#6ba5ff';
      ctx.lineWidth = 1;
      const cx = W * 0.5, cy = H * 0.5;
      for (let i = 0; i < 5; i++) {
        const r = 100 + i * 70;
        const ang = state.t * 0.2 + i * 0.8;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 24, cy + Math.sin(ang) * 16, r, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    },
    op(name, args) {
      if (name === 'show') cards[args]?.classList.add('show');
      if (name === 'tagline') dom.tagline.classList.add('show');
    },
    cleanup() { removeCss('grid-scene'); },
  };
}

// ============================================================
// CSS utilities — per-scene styles, removed on cleanup
// ============================================================
const cssIds = {};
function injectCss(id, css) {
  if (cssIds[id]) return;
  const style = document.createElement('style');
  style.id = `scene-css-${id}`;
  style.textContent = css;
  document.head.appendChild(style);
  cssIds[id] = style;
}
function removeCss(id) {
  if (cssIds[id]) {
    cssIds[id].remove();
    delete cssIds[id];
  }
}
