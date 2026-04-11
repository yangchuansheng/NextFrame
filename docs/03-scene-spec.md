---
title: Scene 规范
summary: Scene 是 NextFrame 的组件单位。一个 scene = 一个纯函数 (t, params, ctx) => void。本文定义 scene 契约、14 种内置 scene 类型、params 统一约定、注册流程和资产引用规则。
---

# Scene 规范

## 什么是 scene

**一个 scene 是一个纯函数**：

```js
function sceneName(t, params, ctx) {
  // 根据 t 和 params，在 ctx 上画出当前帧
}
```

- `t`：当前时间（秒，浮点）
- `params`：这个 scene 在时间线里的配置（位置、颜色、文本、资产引用等）
- `ctx`：渲染上下文（canvas 2d context + 资产缓存 + 屏幕尺寸 + 当前 clip 的 start/dur 等）

Scene 是视频的"积木"。积木越多越规范，做视频越像搭乐高。

---

## Scene 契约（硬性规则）

写一个 scene 必须同时满足：

1. **Frame-pure**：同一个 `(t, params)` 必须输出同一个 frame。详见 `01-frame-pure.md`
2. **纯函数签名**：只读 `t`、`params`、`ctx`，不读模块级可变变量
3. **不访问外部 I/O**：不发网络请求，不读文件，所有资产通过 `ctx.assets` 拿
4. **自己管清空**：`renderAt` 开头清空自己的绘制区域（或写在独立的离屏 canvas 上）
5. **时间范围内自洽**：如果 `t < 0` 或 `t > params.dur`，应该能正确处理（通常是 no-op）
6. **不改 params**：`params` 是只读的，不能原地修改

违反任何一条都不能上架到 scene 库。

---

## Scene 接口签名

```ts
type Scene = (t: number, params: SceneParams, ctx: RenderContext) => void

interface RenderContext {
  canvas: CanvasRenderingContext2D  // 画布
  width: number                     // 输出尺寸
  height: number
  fps: number
  assets: AssetCache                // 图/视频/字体/SVG 的已解码缓存
  clipStart: number                 // 当前 clip 在时间线上的起点
  clipDur: number                   // 当前 clip 的总时长
}

interface SceneParams {
  // scene 自定义字段，但下面这些通用字段有统一约定
  x?: number        // 左上角 x (0-1 归一化，0 = 左边, 1 = 右边)
  y?: number        // 左上角 y (0-1)
  w?: number        // 宽度 (0-1)
  h?: number        // 高度 (0-1)
  rotation?: number // 弧度
  opacity?: number  // 0-1
  color?: string    // CSS 颜色字符串
  zIndex?: number   // 同一轨道内的 z 序
  // ... 其他 scene 特有字段
}
```

**x/y/w/h 归一化**：相对于输出尺寸的 0-1 范围，这样同一个 JSON 在不同分辨率导出都能自适应。

---

## 14 种内置 scene 类型

初期按需实现，最终目标是下面这 14 个：

| 类型 | 用途 | 典型 params |
|------|------|-------------|
| **video** | 播放本地视频文件 | `src, startOffset, volume, fit` |
| **image** | 显示一张图 | `src, fit, cornerRadius` |
| **text** | 文本动画（打字、淡入、飞入） | `text, font, size, color, anim, fontFile` |
| **svgIcon** | 显示可着色的 SVG 图标 | `src, color, size` |
| **shape** | 画几何形状（矩形/圆/多边形） | `kind, fill, stroke, strokeWidth` |
| **fourier** | 傅里叶级数合成曲线动画（讲数学用） | `coefficients, speed` |
| **particle** | 粒子系统（烟花、雪、光点） | `count, seed, emitter, behavior` |
| **code** | 代码块打字动画 + 语法高亮 | `code, lang, theme, speed` |
| **chart** | 柱图/折线/饼图 | `kind, data, animIn` |
| **lowerThird** | 下三分之一字幕条（姓名/身份） | `title, subtitle, style` |
| **titleCard** | 开场大标题卡 | `title, subtitle, bg, anim` |
| **hud** | 屏幕上的 HUD 元素（进度条/计时器） | `kind, value, max, position` |
| **bg** | 纯色/渐变/图案背景 | `kind, colors, direction` |
| **audio** | 音轨（没有视觉输出） | `src, volume, fadeIn, fadeOut` |

**audio** 是特殊的：它不画东西，只在预览时喂给 Web Audio、在导出时混音。但它依然是一个 scene，占用时间线的一个 clip，字段一致。

---

## params 统一约定

所有 scene 共享这些通用字段（scene 可以不用，但不能重新定义语义）：

### 几何

```js
{
  x: 0.1,        // 左上角 x，归一化
  y: 0.1,        // 左上角 y，归一化
  w: 0.3,        // 宽度，归一化
  h: 0.2,        // 高度，归一化
  anchor: 'tl',  // 参考点: tl/tc/tr/cl/cc/cr/bl/bc/br
  rotation: 0,   // 弧度
  scale: 1,      // 缩放倍数
}
```

### 视觉

```js
{
  opacity: 1,       // 0-1
  color: '#ffffff', // CSS 颜色字符串
  blendMode: 'normal', // canvas globalCompositeOperation
}
```

### 动画入出

```js
{
  animIn: {
    kind: 'fadeIn',  // fadeIn / slideUp / scaleIn / typeIn / none
    dur: 0.3,        // 秒
    ease: 'easeOutCubic',
    delay: 0,
  },
  animOut: {
    kind: 'fadeOut',
    dur: 0.3,
    ease: 'easeInCubic',
  },
}
```

### 时间锚点

```js
{
  // 不用放在 params 里 —— 时间线的 clip 对象自带 start 和 dur
  // scene 只看到 t 相对于 clip 的位置
}
```

**原则**：scene 内部的相对时间 = `t - ctx.clipStart`。scene 不需要知道自己在整条视频的绝对位置，只关心"自己被激活了多久"。

---

## 各 scene 的 params 细节

### text

```js
{
  text: 'Hello world',
  fontFamily: 'Inter',
  fontFile: 'assets/fonts/inter.ttf',  // 可选，自定义字体
  size: 0.08,                          // 相对于高度
  color: '#ffffff',
  align: 'center',                     // left/center/right
  weight: 600,
  letterSpacing: 0,
  lineHeight: 1.2,
  // 通用 x/y/w/h/opacity/animIn/animOut...
  animIn: { kind: 'typeIn', dur: 1.5 },  // 打字效果
}
```

### video

```js
{
  src: 'assets/ai_clip_3.mp4',
  startOffset: 0,    // 从原视频的哪一秒开始播
  volume: 1,
  fit: 'cover',      // cover/contain/fill/none
  // 通用 x/y/w/h...
}
```

**注意**：video scene 的 frame-pure 靠 `<video>.currentTime = t` 实现。WebView 里 `<video>` 支持精确 seek。

### lowerThird

```js
{
  title: '张三',
  subtitle: '产品经理',
  style: 'velvet',   // 预设样式: velvet/minimal/news/youtube
  bgColor: '#1a1a2e',
  textColor: '#ffffff',
  // 位置有默认值（屏幕下三分之一），可覆盖
}
```

### fourier（举例说明"复杂 scene"也能 frame-pure）

```js
{
  coefficients: [{ freq: 1, amp: 1, phase: 0 }, { freq: 3, amp: 0.33, phase: 0 }],
  speed: 1,    // rad/s
  color: '#f0f',
  lineWidth: 2,
  trace: true, // 是否留下轨迹
}

// 渲染时：
function fourier(t, params, ctx) {
  const { canvas } = ctx
  canvas.clearRect(0, 0, ctx.width, ctx.height)
  canvas.strokeStyle = params.color
  canvas.beginPath()
  for (let u = 0; u <= t * params.speed; u += 0.01) {
    const [x, y] = sumCoefficients(params.coefficients, u)
    canvas.lineTo(x, y)
  }
  canvas.stroke()
}
```

**注意**：`trace` 模式看起来像累积状态，但每次调用都从 `u=0` 重算到 `u = t * speed`。frame-pure 成立，代价是 O(t)。对于几分钟的视频完全够用。

---

## 如何写一个新 scene（5 步）

1. **定义 params schema**：这个 scene 接受哪些字段，每个字段默认值是多少
2. **写函数体**：`function mySceneName(t, params, ctx) { ... }`
3. **检查 frame-pure 清单**（见 `01-frame-pure.md` 末尾）
4. **注册到引擎**：在 `runtime/scenes/index.js` 里 `registerScene('mySceneName', mySceneNameFn)`
5. **加一条验证测试**：调用 3 个不同的 `t`，断言输出稳定

### 完整示例：写一个 `progressBar` scene

```js
// runtime/scenes/progressBar.js

/**
 * 进度条 scene
 * params:
 *   progress: (t) => 0-1 值，默认线性 t/dur
 *   bgColor: 底色
 *   fillColor: 填充色
 *   height: 条高（归一化）
 */
export function progressBar(t, params, ctx) {
  const { canvas, width, height } = ctx
  const localT = t - ctx.clipStart
  const p = params.progress ?? Math.min(1, localT / ctx.clipDur)

  const barH = (params.height ?? 0.01) * height
  const y = (params.y ?? 0.95) * height
  const x = (params.x ?? 0) * width
  const w = (params.w ?? 1) * width

  canvas.fillStyle = params.bgColor ?? '#333'
  canvas.fillRect(x, y, w, barH)

  canvas.fillStyle = params.fillColor ?? '#0af'
  canvas.fillRect(x, y, w * p, barH)
}
```

注册：

```js
// runtime/scenes/index.js
import { progressBar } from './progressBar.js'
import { text } from './text.js'
// ...

export const scenes = {
  progressBar,
  text,
  // ...
}
```

时间线里用：

```json
{
  "scene": "progressBar",
  "start": 0,
  "dur": 60,
  "params": {
    "bgColor": "#222",
    "fillColor": "#ff5a00"
  }
}
```

完事。整个过程 < 10 分钟。

---

## 资产引用

Scene 的 `params` 里不存资产二进制，只存**引用路径**。引擎启动时扫描 JSON 的所有资产引用，预加载到 `ctx.assets` 里：

```js
// ctx.assets 接口
ctx.assets.get('assets/fonts/inter.ttf')   // → FontFace
ctx.assets.get('assets/bg/gradient.png')   // → HTMLImageElement
ctx.assets.get('assets/ai_clip_3.mp4')     // → HTMLVideoElement
ctx.assets.get('assets/icons/arrow.svg')   // → SVGDocument
```

### 资产路径规则

- 相对路径：相对于项目的 `assets/` 目录
- 以 `builtin:` 开头：内置素材（比如 `builtin:fonts/sans.ttf`）
- 以 `http(s)://` 开头：远程素材（通过 Rust 后端代理下载和缓存）

### 资产类型

| 类型 | 扩展名 | 解码成 |
|------|--------|--------|
| 图片 | png/jpg/webp/avif | HTMLImageElement |
| 视频 | mp4/webm/mov | HTMLVideoElement |
| SVG | svg | SVGDocument（可查询可着色） |
| 字体 | ttf/otf/woff2 | FontFace |
| 音频 | mp3/wav/m4a/flac | AudioBuffer |
| JSON 数据 | json | 对象（给 chart/data scene 用） |

---

## Scene 注册表结构

```js
// runtime/scenes/index.js
export const registry = {
  // name → { fn, paramSchema, category, preview }
  'text':       { fn: textScene, paramSchema: textSchema, category: 'typography' },
  'image':      { fn: imageScene, paramSchema: imageSchema, category: 'media' },
  'video':      { fn: videoScene, paramSchema: videoSchema, category: 'media' },
  'bg':         { fn: bgScene, paramSchema: bgSchema, category: 'background' },
  'lowerThird': { fn: lowerThirdScene, paramSchema: lowerThirdSchema, category: 'composite' },
  // ...
}

export function registerScene(name, def) {
  if (registry[name]) throw new Error(`scene ${name} already registered`)
  registry[name] = def
}

export function getScene(name) {
  return registry[name]?.fn
}
```

`paramSchema` 是可选的（类似 JSON Schema），用于：
- 在 GUI 的 inspector 面板自动生成表单
- AI 生成 scene 配置时查字段
- 运行时验证 params

---

## 坏 scene 的常见模式

写完新 scene 对照检查：

| 坏模式 | 症状 | 修法 |
|--------|------|------|
| 模块级 `let` 变量 | scrub 跳帧结果跟播放不一致 | 移到 params 或基于 t 重算 |
| `Math.random()` | 每次渲染闪烁 | 用 seeded random |
| `performance.now()` | 跟 t 不同步 | 删掉，只用 t |
| 忘记 `clearRect` | 画面残留 | 第一行加 clearRect |
| 直接写 `params.x += 1` | 时间线数据被污染 | 用局部变量 |
| 同步 `fetch` | 挂住渲染 | 改成预加载到 ctx.assets |
| 输出尺寸硬编码 1920x1080 | 换分辨率显示错乱 | 用 `ctx.width/height` 归一化 |

---

## Scene 的生命力

**scene 库越攒越厚 = NextFrame 越值钱**。

每做一个视频都会产出 1-3 个可复用的新 scene 块。这些块长期看会形成一个"视频积木库"，跟组件库、图标库一样 —— 一次写好，无限次复用。

**长期目标**：scene 库变成 NextFrame 的核心护城河。别人很难复制一个大而全的 scene 集合。
