// ============================================================
// 01. renderAt(t) — frame-pure 渲染入口的标准写法
// ============================================================
//
// 核心思想：给定时间 t（毫秒），返回该时刻应该显示的画面。
// 不依赖上一帧，不依赖累积状态，不依赖"上次调用"。
//
// 这是 NextFrame 的 frame-pure 原则：
//     f(t) → frame
//
// 好处：
//   1. 可拖动时间轴到任意位置（scrub）
//   2. 可并行渲染不同时刻的帧
//   3. 可无损重放（录制 = 从 0 扫到 T）
//   4. AI 生成的 JSON 可以直接拿来重放
//   5. 不存在"漂移"和"累积误差"
//
// ============================================================

/**
 * 标准 renderAt 模板
 * @param {number} t - 全局时间 ms（从 0 开始）
 * @param {object} timeline - 时间线 JSON
 * @param {CanvasRenderingContext2D|HTMLElement} target - 渲染目标
 */
function renderAt(t, timeline, target) {
  // 1. 清场（每一帧都是全新画面）
  clear(target);

  // 2. 找到当前激活的 chapter（可选：多章节结构）
  const chapter = findChapterAt(timeline.chapters, t);
  if (!chapter) return;

  // 3. 章节内部相对时间
  const tLocal = t - chapter.start;

  // 4. 找到当前激活的 clips（可能多个，按 track 层叠）
  const activeClips = findActiveClips(chapter.clips, tLocal);

  // 5. 按顺序调用 scene 函数渲染（每个 scene 是纯函数）
  for (const clip of activeClips) {
    const tClip = tLocal - clip.start;  // clip 内部相对时间
    const scene = SCENES[clip.scene];    // scene 是注册好的纯函数
    scene(tClip, clip.params, target, t); // (t, params, ctx, globalT)
  }
}

// ------------------------------------------------------------
// 辅助：时间到 chapter 的查找
// ------------------------------------------------------------
function findChapterAt(chapters, t) {
  // 线性扫（chapter 数量 < 20 不需要二分）
  for (const c of chapters) {
    if (t >= c.start && t < c.start + c.duration) return c;
  }
  return null;
}

// ------------------------------------------------------------
// 辅助：找出当前时刻所有激活的 clip
// ------------------------------------------------------------
function findActiveClips(clips, tLocal) {
  const active = [];
  for (const clip of clips) {
    if (tLocal >= clip.start && tLocal < clip.start + clip.duration) {
      active.push(clip);
    }
  }
  // 按 zIndex / track order 排序（后画的在上）
  active.sort((a, b) => (a.z || 0) - (b.z || 0));
  return active;
}

function clear(target) {
  if (target instanceof HTMLElement) {
    target.innerHTML = '';
  } else if (target.clearRect) {
    target.clearRect(0, 0, target.canvas.width, target.canvas.height);
  }
}

// ============================================================
// 反例（禁止这样写！）
// ============================================================
//
// ❌ 错误：依赖累积状态
//
//   let state = { t: 0, x: 0 };
//   function tick(dt) {
//     state.t += dt;
//     state.x += 100 * dt;   // ← 依赖上一帧的 x
//     draw(state.x);
//   }
//
// 问题：
//   - 拖动时间轴失败（state.x 跟 t 脱钩）
//   - 重放失败（dt 波动导致每次结果不同）
//   - 无法跳帧（必须从头算）
//
// ✅ 正确：frame-pure
//
//   function renderAt(t) {
//     const x = 100 * (t / 1000);  // ← 从 t 直接算
//     draw(x);
//   }
//
// 任何需要"动画"的地方都应该写成 t 的函数，不是累加。

// ============================================================
// 录制：从 0 扫到 T，每帧单独调用 renderAt
// ============================================================
async function recordRange(timeline, fps, target) {
  const frames = [];
  const dt = 1000 / fps;
  const total = timeline.duration;
  for (let t = 0; t < total; t += dt) {
    renderAt(t, timeline, target);
    frames.push(await captureFrame(target));
  }
  return frames;
}

// ============================================================
// 拖拽进度条：直接调 renderAt
// ============================================================
slider.oninput = (e) => {
  renderAt(Number(e.target.value), timeline, target);
};

// SCENES 由 02-scene-factory.js 注册
const SCENES = {};

export { renderAt, findChapterAt, findActiveClips, SCENES };
