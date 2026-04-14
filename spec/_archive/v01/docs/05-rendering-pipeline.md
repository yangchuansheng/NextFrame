---
title: 渲染管线详解
summary: NextFrame 怎么把 HTML 变成 MP4 —— 浏览器 GPU 栈、截图拼装、并行渲染、VideoToolbox 硬编码全链路
---

# 05 · 渲染管线

> 一句话：**HTML 负责画画，Rust 负责收画，VideoToolbox 负责压成 MP4。中间全走 GPU，不走 CPU 像素搬运。**

---

## 0. 全链路总览

```
timeline.json
     │
     ▼
┌─────────────────────────┐
│  HTML 引擎（WebView）    │  ← AI 写的 scene 函数，f(t) → DOM/Canvas
│  CSS / Canvas / WebGL   │
└─────────────────────────┘
     │ GPU 合成
     ▼
┌─────────────────────────┐
│  IOSurface（共享显存）   │  ← 零拷贝句柄
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  CVPixelBuffer          │  ← macOS 像素容器
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  VideoToolbox H.264/HEVC│  ← 硬件编码器（ANE/VCE）
└─────────────────────────┘
     │
     ▼
   output.mp4
```

**关键：整条链路像素不进内存，只在 GPU 显存里传句柄。**

---

## 1. 浏览器 GPU 栈（HTML 怎么用到 GPU）

很多人以为浏览器是 CPU 画画。错。现代浏览器（WebKit/Chromium）内部是一个**分层合成器**，每一层都可能落到 GPU。

### 1.1 CSS 合成层（Compositor Layer）

| CSS 写法 | 底层行为 |
|---------|---------|
| `transform: translate/scale/rotate` | 提升独立合成层，GPU 做仿射变换 |
| `opacity` | GPU 做 alpha blend |
| `filter: blur/brightness` | GPU shader（Core Image on macOS） |
| `will-change: transform` | 强制提前升层 |
| `position: fixed` | 可能升层 |

**利用率**：元素独立升层后，动画不走布局/绘制，只走合成。60fps 稳的就是这条路。

### 1.2 Canvas 2D

- WebKit 的 Canvas 2D 后端是 **Skia GPU**（macOS 上最终走 Metal）
- `drawImage` / `fillRect` / `arc` 都走 GPU
- 但 `getImageData` / `putImageData` 会把像素拖回 CPU，非常慢

**结论**：Canvas 2D 动画随便画都是 GPU 加速，只要别碰 `getImageData`。

### 1.3 WebGL / WebGPU

- 直接调用平台 GPU API（Metal on macOS）
- 你能写 shader 就能做任意效果
- 自由度天花板，学习成本也最高

### 1.4 视频硬件解码

- `<video>` 元素走 AVFoundation → VideoToolbox 硬解
- 解码帧直接落到 GPU surface，不进 JS 堆
- 套 CSS transform 做视频蒙太奇，完全零 CPU

**一张表总结 HTML 能蹭的 GPU 能力**：

| 路径 | GPU 参与度 | 学习成本 | 适用场景 |
|------|-----------|---------|---------|
| CSS transform/opacity | ★★★ | 零 | 90% 动画 |
| CSS filter | ★★★ | 低 | 模糊、调色 |
| Canvas 2D | ★★ | 低 | 手绘、粒子 < 1k |
| `<video>` + CSS | ★★★ | 零 | 视频蒙太奇 |
| WebGL | ★★★★ | 高 | 粒子 > 10k、3D、shader |
| WebGPU | ★★★★★ | 很高 | 新项目可用，WebKit 支持中 |

---

## 2. recorder 导出管线（离线渲染）

这是 NextFrame 真正的出片路径。POC 已跑通：

```
┌──────────────┐
│ WKWebView    │  ← 加载 timeline.html，JS 调 seekTo(t) 定帧
│ (headless)   │
└──────┬───────┘
       │ drawViewHierarchyInRect / CALayer render
       ▼
┌──────────────┐
│ IOSurface    │  ← WebKit GPU buffer 的直接句柄（零拷贝）
└──────┬───────┘
       ▼
┌──────────────┐
│ CVPixelBuffer│  ← 包一层给 VideoToolbox
└──────┬───────┘
       ▼
┌──────────────┐
│ VTCompression│  ← H.264/HEVC 硬件编码
│ Session      │     Apple Silicon 上是 ANE + Media Engine
└──────┬───────┘
       ▼
┌──────────────┐
│ AVAssetWriter│  ← 封 MP4 容器
└──────────────┘
```

**实测数据**（POC 单线程 1080p 30fps）：

| 场景 | 速率 | 瓶颈 |
|------|------|------|
| CSS 动画 | 1.15x 实时 | WebView 渲染 |
| Canvas 手绘 | 0.9x 实时 | JS 执行 |
| 视频蒙太奇 | 1.3x 实时 | 视频解码 |

**结论**：单进程已经接近实时。10 分钟视频单线程跑 8-10 分钟出片。

---

## 3. 实时预览 vs 离线渲染

两条完全不同的路径，不要混淆。

| 维度 | 实时预览 | 离线渲染 |
|------|---------|---------|
| 目标 | 编辑时看效果 | 最终出片 |
| 速率 | 必须 60fps | 不需要实时 |
| 精度 | 丢帧可以 | 一帧不能丢 |
| 稳定性 | 跟着系统 | 必须确定性 |
| 引擎 | 普通 WebView + RAF | 帧驱动 seekTo(t) |
| 时钟 | `performance.now()` | 参数 t（虚拟时钟） |

**关键技巧**：**frame-pure 原则**。scene 函数必须写成 `(t) => frame`，不依赖任何隐式状态。这样预览和出片走同一份代码，只是时钟不同。

```js
// ❌ 错的：依赖 RAF 隐式时钟
let angle = 0;
function tick() { angle += 0.01; draw(angle); requestAnimationFrame(tick); }

// ✅ 对的：纯函数
function scene(t) { return { angle: t * 0.5 }; }
```

---

## 4. 截图拼装 vs 实时录屏

### 为什么不录屏？

录屏（`AVCaptureScreenInput` / `CGDisplayStream`）表面上最简单，实际有 4 个致命问题：

| 问题 | 说明 |
|------|------|
| 1. 不确定性 | 系统卡一下就掉帧，出片有抖动 |
| 2. 速率锁死 | 必须实时跑，10 分钟视频 = 10 分钟等待 |
| 3. 无法并行 | 屏幕只有一个 |
| 4. 画面污染 | 鼠标、其他窗口、通知弹窗都会进入 |

### 为什么截图拼装？

| 优势 | 说明 |
|------|------|
| 确定性 | 每一帧都是精确 `seekTo(t)` 出来的 |
| 可并行 | 开 N 个 headless WebView 同时跑不同时间段 |
| 可超实时 | 不受挂钟限制，慢场景慢跑、快场景快跑 |
| 可断点续传 | 第 5000 帧挂了可以从第 5000 帧重跑 |

---

## 5. 并行渲染原理

因为 `scene(t)` 是纯函数，任意两帧之间没有依赖。于是可以**水平切片**：

```
总时长 600s, 30fps = 18000 帧

WebView 1: 帧 0     ~ 4500     → segment_0.mp4
WebView 2: 帧 4500  ~ 9000     → segment_1.mp4
WebView 3: 帧 9000  ~ 13500    → segment_2.mp4
WebView 4: 帧 13500 ~ 18000    → segment_3.mp4
          ↓
       ffmpeg concat
          ↓
       final.mp4
```

**N 个 WebView 并行，理论速率 N 倍**。实测 M2 Max 上 4 并行约 3.6x 加速（硬编码器是共享资源，会有一点等待）。

---

## 6. 速度估算表

**10 分钟 1080p 30fps 视频，单线程 1.15x 实时基准**：

| 方案 | 出片时间 | 备注 |
|------|---------|------|
| Remotion + Chromium Headless | ~25 min | 截图 + ffmpeg 软编 |
| After Effects CPU 渲染 | ~40 min | 业界基线 |
| Final Cut Pro 硬编 | ~6 min | 但只能剪已有素材 |
| **NextFrame 单线程** | **~8.7 min** | VideoToolbox 硬编 |
| **NextFrame 4 并行** | **~2.4 min** | M2 Max 实测 |
| **NextFrame 8 并行** | **~1.5 min** | M2 Ultra 推算 |

---

## 7. 未来：IOSurface 直读

现在的 POC 是 `WKWebView → drawViewHierarchyInRect → bitmap → CVPixelBuffer`，中间有一次像素搬运。

WebKit 内部其实已经把帧画到了 IOSurface 上。只要能拿到那个 IOSurface 句柄，就能**完全零拷贝**直接喂 VTCompressionSession。

方案：
- Hack 1：用 `_WKRemoteLayerTreeRootNode` 私有 API 拿合成层
- Hack 2：fork WebKit 暴露 IOSurface
- Hack 3：用 Chromium Embedded，走 `OnAcceleratedPaint` 回调（CEF 官方支持）

**预期收益**：再快 30%，且 CPU 占用降到接近 0。

---

## 8. 一张图记住

```
HTML 画画（GPU）→ IOSurface（GPU）→ VideoToolbox（硬件）→ MP4
      ↑                                        ↑
  frame-pure 函数                          ANE + Media Engine
      ↑
   AI 只需要写这一层
```

**AI 只关心 scene(t) 这一个函数。剩下的 pipeline 都由引擎兜底。**
