// ============================================================
// 03. 多轨调度引擎核心 — TIMELINE JSON + 扫描 + 合成
// ============================================================
//
// NextFrame 的 timeline 是多轨结构：
//   - 每个 track 是一条平行的时间线
//   - 每个 clip 在自己 track 上有 [start, start+duration]
//   - 同一时刻可能多个 track 都有激活的 clip → 按 z 顺序叠加
//
// 引擎做的事情：
//   1. 给定全局 t，扫所有 track
//   2. 找出每个 track 当前激活的 clip
//   3. 按 track 顺序（或 z）调用 scene 函数
//   4. 结果合成在同一个 ctx 上
//
// 下面是完整可运行的最小引擎 + 一个嵌入式 HTML demo。
// 直接另存为 engine-demo.html 打开即可看效果。
// ============================================================

export const TIMELINE_EXAMPLE = {
  width: 1920,
  height: 1080,
  duration: 6000,
  tracks: [
    {
      id: 'bg',
      z: 0,
      clips: [
        { start: 0, duration: 6000, scene: 'bgGradient',
          params: { from: '#0a0e27', to: '#1a1040' } },
      ],
    },
    {
      id: 'title',
      z: 10,
      clips: [
        { start: 300, duration: 2500, scene: 'titleCard',
          params: { text: 'NextFrame', x: 960, y: 500, size: 120 } },
        { start: 3000, duration: 2800, scene: 'titleCard',
          params: { text: 'f(t) → frame', x: 960, y: 540, size: 84, color: '#42c8f5' } },
      ],
    },
    {
      id: 'caption',
      z: 20,
      clips: [
        { start: 3000, duration: 2800, scene: 'caption',
          params: {
            x: 960, y: 920,
            words: [
              { text: '一个',   start: 0,    end: 300 },
              { text: '时间',   start: 300,  end: 700 },
              { text: '到',     start: 700,  end: 900 },
              { text: '画面',   start: 900,  end: 1300 },
              { text: '的',     start: 1300, end: 1500 },
              { text: '函数',   start: 1500, end: 2200 },
            ],
          },
        },
      ],
    },
  ],
};

// ------------------------------------------------------------
// 引擎：扫所有轨道，找激活 clip，按 z 排序合成
// ------------------------------------------------------------
export function createEngine(timeline, scenes) {
  function renderAt(t, ctx) {
    // 清场
    ctx.innerHTML = '';

    // 收集所有激活 clip
    const active = [];
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        if (t >= clip.start && t < clip.start + clip.duration) {
          active.push({ track, clip });
        }
      }
    }

    // 按 track.z 升序（低的先画，高的压在上面）
    active.sort((a, b) => (a.track.z || 0) - (b.track.z || 0));

    // 调 scene
    for (const { clip } of active) {
      const tLocal = t - clip.start;
      const fn = scenes[clip.scene];
      if (!fn) { console.warn('missing scene:', clip.scene); continue; }
      fn(tLocal, clip.params || {}, ctx, t);
    }
  }

  return { renderAt, duration: timeline.duration };
}

// ============================================================
// 内嵌 demo HTML 模板（把下面整段存成 .html 双击打开）
// ============================================================
/*
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>NextFrame minimal engine</title>
<style>
  html, body { margin:0; background:#000; color:#fff; font:14px system-ui; }
  #stage { position:relative; width:1920px; height:1080px;
           transform-origin:top left; transform:scale(0.5); }
  #bar { position:fixed; left:0; right:0; bottom:0; padding:8px;
         background:#111; z-index:999; display:flex; gap:8px; align-items:center; }
  #scrub { flex:1; }
</style>
</head>
<body>
  <div id="stage"></div>
  <div id="bar">
    <button id="play">play</button>
    <input id="scrub" type="range" min="0" max="6000" value="0">
    <span id="time">0 ms</span>
  </div>
<script type="module">
import { TIMELINE_EXAMPLE, createEngine } from './03-multi-track-engine.js';

// ---- 注册 scenes（实际项目从 02-scene-factory.js 导入） ----
const SCENES = {
  bgGradient: (t, p, ctx) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;inset:0;
      background:linear-gradient(135deg,${p.from},${p.to});`;
    ctx.appendChild(d);
  },
  titleCard: (t, p, ctx) => {
    const alpha = Math.min(1, t / 300);
    const d = document.createElement('div');
    d.textContent = p.text;
    d.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;
      transform:translate(-50%,-50%);
      font:700 ${p.size||96}px Inter,system-ui;
      color:${p.color||'#fff'};opacity:${alpha};`;
    ctx.appendChild(d);
  },
  caption: (t, p, ctx) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${p.x}px;top:${p.y}px;
      transform:translate(-50%,-50%);font:600 56px Inter,system-ui;
      display:flex;gap:0.35em;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8);`;
    for (const w of p.words) {
      const active = t >= w.start && t < w.end;
      const s = document.createElement('span');
      s.textContent = w.text;
      if (active) s.style.color = '#ffd34d';
      el.appendChild(s);
    }
    ctx.appendChild(el);
  },
};

const stage = document.getElementById('stage');
const scrub = document.getElementById('scrub');
const timeL = document.getElementById('time');
const play  = document.getElementById('play');

const engine = createEngine(TIMELINE_EXAMPLE, SCENES);
let t0 = 0, playing = false, raf = 0;

function draw(t) {
  engine.renderAt(t, stage);
  scrub.value = t;
  timeL.textContent = Math.round(t) + ' ms';
}
draw(0);

scrub.oninput = e => { playing = false; draw(Number(e.target.value)); };
play.onclick = () => {
  if (playing) { playing = false; cancelAnimationFrame(raf); return; }
  playing = true;
  const startWall = performance.now() - Number(scrub.value);
  const loop = () => {
    if (!playing) return;
    const t = performance.now() - startWall;
    if (t >= engine.duration) { playing = false; draw(engine.duration); return; }
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  loop();
};
</script>
</body>
</html>
*/
