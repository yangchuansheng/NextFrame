---
title: Frame-Pure 原则
summary: 所有动画都是 f(t) → frame。这是 NextFrame 的地基，解锁 scrub / undo / parallel / test / AI 友好等 7 个关键能力。本文讲清楚什么是 frame-pure、为什么它是地基、怎么写、什么场景做不到、怎么绕过。
---

# Frame-Pure 原则

## 一句话定义

**给定时间 `t`，立刻画出那一帧，不依赖前一帧，不依赖播放历史，不依赖任何累积状态。**

```js
function renderAt(t) {
  // 只读 t 和 JSON，只写 canvas
  // 绝对不读取"上一次调用时"的变量
}
```

这是 NextFrame 的第一原则。所有其他架构决定都建立在这之上。

---

## 为什么是地基

Frame-pure 一旦成立，下面 7 个能力全部免费解锁。反过来，任何一个能力缺失都能追溯到某个 scene 不是 frame-pure。

### 1. Scrub 预览即时响应

用户拖动时间线到任意位置，`renderAt(t)` 直接算出那一帧，0 延迟。如果依赖累积状态，就得从 0 播到 t，拖到 30 秒要等半天。

### 2. 撤销/重做是 JSON 快照切换

时间线是 JSON，撤销 = 切换 JSON 版本。切完之后 `renderAt(当前 t)` 重新算，画面立刻更新。不需要反向应用每个操作、不需要维护 undo stack 的状态机。

### 3. 多轨道并行渲染

导出时开 N 个 headless WebView，每个跳到不同的 `t`，同时截图。拼起来就是成片。N 路并行比串行快 N 倍 —— **因为每帧独立计算，没有顺序依赖**。

这是 NextFrame 相对 Remotion/AE 最硬的性能优势。

### 4. 测试可重现

每帧是纯函数 → 快照测试直接比 pixel：
```js
assert(renderAt(3.5) === goldenImage)
```
不用模拟播放过程、不用担心随机数顺序、不用担心缓存。

### 5. 字级音画同步

vox 给每个字 `{word, start, end}`，字幕 scene 里直接：
```js
const active = words.find(w => t >= w.start && t < w.end)
ctx.drawText(active?.word)
```
不用"从 0 开始累加播放位置"，`t` 一来就知道该显示哪个字。

### 6. AI 友好

AI 改 JSON 一个字段、或者写一个新 scene 函数，改完立刻 `renderAt(t)` 看效果。AI 不需要理解"当前正在播第几帧"，也不用维护会话内的播放状态。**每次对话都是无状态的**，跟 frame-pure 是同构的。

### 7. 拖拽即更新

UI 拖一个 clip 往后移 1 秒，JSON 更新后立刻重渲染当前 t。**拖拽的视觉反馈跟最终导出的画面是同一套渲染路径**，不存在"预览和成片不一致"的问题。

---

## 正反例

### 反例：累积状态（破坏 frame-pure）

```js
// ❌ 错：依赖 lastX
let lastX = 0
function renderAt(t) {
  lastX += 5  // 每次调用都累加
  ctx.fillRect(lastX, 100, 50, 50)
}
```

拖到 t=10 时 `lastX` 是多少？取决于之前调用了多少次。换一个 t 就错。

```js
// ❌ 错：依赖上一帧的 canvas
function renderAt(t) {
  // 不清空 canvas，每次"画在前一帧之上"
  ctx.fillRect(t * 10, 100, 50, 50)
}
```

拖动时间线会看到画面残留，而不是独立帧。

### 正例：纯函数

```js
// ✅ 对：只从 t 和 params 算位置
function renderAt(t, params) {
  ctx.clearRect(0, 0, width, height)
  const x = params.startX + (params.endX - params.startX) * (t / params.dur)
  ctx.fillRect(x, 100, 50, 50)
}
```

给定 `t` 和 `params`，结果永远一样，顺序无关。

### 正例：基于 t 的三角函数

```js
// ✅ 对：正弦动画
function renderAt(t) {
  const y = 100 + Math.sin(t * 2) * 50
  ctx.fillRect(100, y, 50, 50)
}
```

无论你跳到 t=0 还是 t=9999，都能直接算出 y。

### 正例：缓动函数

```js
// ✅ 对：easeInOutCubic
function easeInOutCubic(x) {
  return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3) / 2
}
function renderAt(t, params) {
  const progress = Math.min(1, (t - params.start) / params.dur)
  const eased = easeInOutCubic(progress)
  const x = lerp(params.fromX, params.toX, eased)
  ctx.fillRect(x, 100, 50, 50)
}
```

---

## 做不到 frame-pure 的场景

诚实面对：有些东西天生带时间方向，不可能纯函数。

### 1. 物理模拟

弹跳小球、布料、流体。下一帧 = 上一帧的物理状态演化。你不能只看 t 就知道小球在哪儿。

### 2. 累积粒子系统

粒子在时间 t 的位置依赖它在 t-1、t-2、... 的受力历史。

### 3. 用户实时输入

交互式内容：用户在 t=3 点了一下，t=5 的画面依赖这个点击。这不是视频，是应用。NextFrame 不做这个。

### 4. 生成式扩散模型的中间帧

如果你想在视频里跑 Stable Diffusion 的去噪过程，每一步依赖上一步。这也不做。

---

## 解决方案：把不纯的东西折叠成纯函数

### 方案 A：预计算成曲线表

物理模拟、粒子轨迹在"设计时"模拟一遍，把每个粒子在每个时刻的位置存成数组：

```js
// 预计算阶段（一次性）
const particles = simulate(0, totalDur, dt=1/60)
// particles[帧索引][粒子索引] = {x, y}

// 渲染阶段（frame-pure）
function renderAt(t) {
  const frameIdx = Math.floor(t * 60)
  for (const p of particles[frameIdx]) {
    ctx.fillRect(p.x, p.y, 2, 2)
  }
}
```

**代价**：内存、启动慢。**收益**：保持 frame-pure 契约，scrub 依然是 0 延迟。

### 方案 B：解析公式

能用三角函数/指数/贝塞尔描述的东西都写成公式。抛物线、衰减、振荡 —— 全部可以 `f(t) = ...`。

```js
// 抛物线
function renderAt(t) {
  const x = v0x * t
  const y = v0y * t - 0.5 * g * t * t
  ctx.fillRect(x, y, 10, 10)
}
```

### 方案 C：种子化随机

随机数看起来"每次都不一样"，但实际上 `seededRandom(seed, t)` 是确定的：

```js
function hash(seed, t) {
  // 任何确定性哈希
  return Math.sin(seed * 9999 + t * 12345) * 43758.5453 % 1
}

function renderAt(t) {
  const jitter = hash(42, Math.floor(t * 10)) * 5  // 每 0.1s 换一次
  ctx.fillRect(100 + jitter, 100, 50, 50)
}
```

同一个 seed + 同一个 t → 同一个结果。frame-pure 成立。

### 方案 D：事件回放

如果必须有交互（比如做产品 demo 录屏），把用户输入录成事件列表：

```js
const events = [
  { t: 1.2, type: 'click', x: 100, y: 200 },
  { t: 2.5, type: 'type',  text: 'hello' },
]

function renderAt(t) {
  // 把 [0, t] 内的所有事件重放一遍算出"应该是什么状态"
  const state = replay(events.filter(e => e.t <= t))
  drawState(state)
}
```

**技术上这打破了"O(1) 跳帧"**，但保留了"给定 t 结果确定"这个更弱的 frame-pure 契约。只要回放够快就能用。

---

## renderAt(t) 的标准写法

所有 scene 和主引擎都照这个模板：

```js
/**
 * 核心渲染函数：给定时间 t，画出那一帧。
 *
 * 不变量：
 *   1. 不读写模块级变量（除了常量）
 *   2. 不调用 performance.now()、Date.now() 拿当前时间
 *   3. 不依赖 canvas 的前一帧内容（必须先 clearRect）
 *   4. 所有动画参数从 params 读取，所有时间从 t 读取
 *   5. 随机数必须 seeded
 *
 * @param t      当前时间（秒，浮点）
 * @param params scene 的配置（位置、颜色、时长等）
 * @param ctx    渲染上下文（canvas 2d / WebGL / 共享资源）
 */
function renderAt(t, params, ctx) {
  // 1. 清空自己的绘制区域（或用独立的 layer canvas）
  ctx.canvas.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // 2. 基于 t 算出当前进度
  const progress = clamp01((t - params.start) / params.dur)
  if (progress <= 0 || progress >= 1) return  // 不在活跃时间

  // 3. 基于 progress 算出视觉参数
  const eased = easeInOutCubic(progress)
  const x = lerp(params.fromX, params.toX, eased)
  const opacity = fadeInOut(progress, 0.1, 0.9)

  // 4. 画
  ctx.canvas.globalAlpha = opacity
  ctx.canvas.fillStyle = params.color
  ctx.canvas.fillRect(x, params.y, params.w, params.h)
  ctx.canvas.globalAlpha = 1
}
```

**关键检查清单**（写完每个 scene 都过一遍）：

- [ ] 没有模块级可变变量
- [ ] 没有 `performance.now()` / `Date.now()` / `Math.random()`
- [ ] 第一行是 `clearRect` 或有独立 layer
- [ ] 所有动画参数来自 `params`，所有时间来自 `t`
- [ ] 跳到任意 `t` 都能单独渲染（可以写测试验证）

---

## 怎么验证一个 scene 是 frame-pure

写个小测试：

```js
// 同一个 t 调用两次，结果必须完全一致
const a = render(scene, 3.5, params)
const b = render(scene, 3.5, params)
assert(pixelEqual(a, b))

// 乱序调用不影响结果
render(scene, 7.0, params)
const c = render(scene, 3.5, params)
assert(pixelEqual(a, c))

// 跟从头播到 3.5 的结果一致
for (let t = 0; t <= 3.5; t += 1/60) render(scene, t, params)
const d = render(scene, 3.5, params)
assert(pixelEqual(a, d))
```

三条都过 → frame-pure。一条不过 → 隐藏着累积状态，去找出来。

---

## 收尾

Frame-pure 不是一个选项，是 NextFrame 的身份证。下面所有的架构决定 —— Tauri + WebView、JSON 时间线、scene 组件库、并行渲染 —— 都依赖它成立。

每写一个 scene 都问自己：**这个函数给定 `t` 能独立工作吗？** 不能 → 要么改写，要么折叠成预计算/解析公式/种子随机/事件回放其中一种。没有第五种解法。
