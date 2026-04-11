// ============================================================
// 05. 音频驱动时钟 + 字级字幕渲染
// ============================================================
//
// 场景：真实视频的"时间基准"应该是音频播放进度，不是 performance.now()。
// 原因：
//   - 音频卡顿时，画面也应该等（保持同步）
//   - 用户拖进度条时，音频先 seek，画面跟着 audio.currentTime 画
//   - 导出时从 0 扫到 duration，每帧调 renderAt（见 01）
//
// 这一段：浏览器里运行时的音频驱动 + 字级高亮字幕。
// ============================================================

/**
 * 把一个 <audio> 变成 NextFrame 的时钟源
 * @param {HTMLAudioElement} audio
 * @param {function(number)} onTick  - 每次 tick 回调当前 ms
 * @returns {{ start, stop, seek }}
 */
export function createAudioClock(audio, onTick) {
  let raf = 0;
  let running = false;

  // requestAnimationFrame 每帧读 audio.currentTime，保证和音频对齐
  // timeupdate 事件精度不够（chrome ~250ms 一次），不能用
  function loop() {
    if (!running) return;
    onTick(audio.currentTime * 1000);
    raf = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      audio.play();
      loop();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      audio.pause();
    },
    seek(ms) {
      audio.currentTime = ms / 1000;
      onTick(ms);
    },
  };
}

// ============================================================
// 字级字幕渲染 — segments → 当前字高亮
// ============================================================
//
// 数据来自 whisper（带 word-level timestamps）：
//
//   segments: [
//     {
//       start: 1200, end: 3400,
//       text: '今天我们来讲傅立叶',
//       words: [
//         { text: '今天',   start: 1200, end: 1500 },
//         { text: '我们',   start: 1500, end: 1800 },
//         { text: '来讲',   start: 1800, end: 2300 },
//         { text: '傅立叶', start: 2300, end: 3400 },
//       ],
//     },
//     ...
//   ]
//
// 渲染策略：
//   1. 根据 t 找当前激活 segment（整句显示）
//   2. 在 segment 内部找当前激活 word（高亮）
//   3. 已说过的字用"已读"色，未说到的用"未读"色
// ============================================================

/**
 * 找出当前 t 对应的 segment（线性扫即可，一个视频 segment 通常 < 200）
 */
export function findSegmentAt(segments, t) {
  for (const seg of segments) {
    if (t >= seg.start && t < seg.end) return seg;
  }
  return null;
}

/**
 * 渲染当前字幕到容器
 * @param {HTMLElement} container
 * @param {object}      segments  - whisper timeline
 * @param {number}      t         - 全局时间 ms
 */
export function renderCaption(container, segments, t) {
  container.innerHTML = '';
  const seg = findSegmentAt(segments, t);
  if (!seg) return;

  const wrap = document.createElement('div');
  wrap.className = 'nf-caption';
  wrap.style.cssText = `
    position:absolute; left:50%; bottom:120px;
    transform:translateX(-50%);
    font:700 56px Inter, system-ui;
    color:#fff;
    text-shadow: 0 2px 12px rgba(0,0,0,0.85);
    display:flex; gap:0.35em; flex-wrap:wrap;
    max-width:80%; justify-content:center;
  `;

  for (const w of seg.words || [{ text: seg.text, start: seg.start, end: seg.end }]) {
    const span = document.createElement('span');
    span.textContent = w.text;

    if (t < w.start) {
      // 未读
      span.style.color = 'rgba(255,255,255,0.55)';
    } else if (t >= w.start && t < w.end) {
      // 当前字：高亮 + 轻微放大
      span.style.color = '#ffd34d';
      span.style.textShadow = '0 0 16px rgba(255,211,77,0.65)';
      span.style.transform = 'translateY(-2px)';
    } else {
      // 已读
      span.style.color = '#fff';
    }
    wrap.appendChild(span);
  }

  container.appendChild(wrap);
}

// ============================================================
// 完整使用示例 —— 可直接放到一个 HTML 里跑
// ============================================================
/*
<audio id="voice" src="./voice.mp3"></audio>
<div id="stage" style="position:relative;width:1920px;height:1080px;background:#000;"></div>
<button id="play">play</button>

<script type="module">
import { createAudioClock, renderCaption } from './05-audio-driven-clock.js';

const whisperTimeline = await fetch('./timeline.json').then(r => r.json());
const audio = document.getElementById('voice');
const stage = document.getElementById('stage');

const clock = createAudioClock(audio, (t) => {
  // t 是"权威时间"，任何画面都从 t 算出来
  renderCaption(stage, whisperTimeline.segments, t);
  // 这里也可以调 renderAt(t, timeline, stage) 驱动整个视频
});

document.getElementById('play').onclick = () => clock.start();
</script>
*/
