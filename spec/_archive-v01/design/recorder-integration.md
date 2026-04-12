---
title: NextFrame Recorder Integration
summary: Recorder 从 WebView 抓帧导出视频。契约 = HTML 实现 `window.__onFrame(data)`。frame-pure 是并行的前提。导出流程 8 步，音频由 ffmpeg 后混。未来走 IOSurface GPU 直读。
---

# NextFrame Recorder Integration

## 一句话

**Recorder 打开 headless WebView，按帧喂 t，等 HTML 喊 `__onFrame(frameData)`，把帧拼成视频。HTML 不关心录制，录制不关心 HTML。**

---

## 1. 调用契约（唯一接口）

**Recorder ↔ HTML 的全部接口：1 个函数。**

```js
// Recorder 注入到页面：
window.__recorderReady = true
window.__renderAt = (t) => { /* Recorder 期望页面重写这个 */ }

// HTML 必须定义（由 NextFrame 引擎自动实现）：
window.__renderAt = async (t) => {
  // 1. 根据 project 和 t 渲染当前帧
  await engine.renderAt(project, t)
  // 2. 等待所有异步资源加载
  await engine.waitFrameReady()
  // 3. 通知 Recorder 帧已准备好
  window.__onFrame({ t, width, height })
}
```

### 契约规则

| 规则 | 说明 |
|------|------|
| HTML 必须实现 `__renderAt(t)` 为 async 函数 | Recorder 调用它 |
| HTML 必须在帧完全就绪后调用 `window.__onFrame(data)` | 不能提前喊完 |
| `__onFrame` 只能调用一次 per renderAt | 重复调用视为 bug |
| 帧数据的实际像素 Recorder 自己抓（CDP.captureScreenshot 或 IOSurface） | HTML 不传像素 |
| 所有动画都必须是 t 的纯函数 | 违反 = frame 不稳定 = 视频花 |

---

## 2. 时间线 JSON → 渲染 HTML 的转换

Recorder 不直接吃 project.json，而是：

```
project.json ──▶ 引擎 (engine.html) ──▶ 页面内的 renderAt(t)
```

### 步骤

1. Recorder 启动 → 打开 `engine.html?project=file:///path/to/project.json`
2. `engine.html` 页面内：
   - 加载 project JSON
   - 预加载所有 assets
   - 挂载所有 scenes
   - 等全部 ready → 设置 `window.__recorderReady = true`
3. Recorder poll `__recorderReady` → true 后开始按帧调用
4. Recorder 按 `fps × duration` 循环调用 `__renderAt(t)`
5. 每帧回调 `__onFrame` 时，Recorder 抓屏保存

### 为什么用一个统一 engine.html

- 不用每个项目生成独立 HTML（模板化开销）
- Editor 和 Recorder 用同一个渲染引擎，视觉一致
- 调试时可以直接浏览器打开 engine.html 看效果

---

## 3. 单 WebView 串行 vs 多 WebView 并行

### 串行（默认）

```
WebView ─ t=0 ─ t=1/60 ─ t=2/60 ─ ... ─ t=59.99 ─ done
```

- 一个 WebView 处理整个时长
- 简单、资源占用低
- 速度 = 单帧渲染时间 × 总帧数

### 并行（长视频加速）

```
┌─ WebView A ─ t=0..10s
├─ WebView B ─ t=10..20s
├─ WebView C ─ t=20..30s
└─ WebView D ─ t=30..40s
```

- N 个 WebView 分段渲染，最后拼接
- 适合长视频（>30s）
- 速度理论上 N 倍，实际受 CPU/GPU 瓶颈

### 怎么决定用哪个

| 视频时长 | 策略 |
|---------|------|
| < 30s | 串行 |
| 30-120s | 2-4 个并行 |
| > 120s | 4-8 个并行 |

上限 = CPU 核心数 / 2。

---

## 4. frame-pure 是并行的前提

**如果动画依赖"从 t=0 累积到 t 的状态"，并行会崩。**

### 反例

```js
// ❌ 不是 frame-pure
let x = 0
function renderAt(t) {
  x += 1   // 依赖调用次数
  draw(x)
}
```

并行的 WebView B（t=10..20s）拿到的 x 是从 0 开始的，不是从 WebView A 跑完的状态。

### 正例

```js
// ✅ frame-pure
function renderAt(t) {
  const x = Math.sin(t * 2)  // 纯函数 f(t)
  draw(x)
}
```

**NextFrame 的 scene 规范强制 frame-pure**（见 data-flow.md）。违反的 scene 审核不通过，不能进库。

### 边界场景：粒子系统

粒子系统看似有"状态"（N 个粒子的位置），但可以做成 frame-pure：

```js
// 每个粒子的轨迹是 t 的函数
function particleAt(i, t) {
  return { x: cos(t + i), y: sin(t + i) * t }
}
```

初始条件（种子、数量）作为参数传入，粒子 i 在 t 时刻的位置永远可算。

---

## 5. `?frame=N` URL 参数模式（备选）

### 什么情况用

某些场景 Recorder 难以通过 `__renderAt(t)` 控制（比如需要完全 reload 页面才能重置状态），退化用 URL 参数：

```
engine.html?project=xxx.json&frame=120
```

每次渲染前 Recorder 直接导航到新 URL，页面启动时读 URL 参数 → 设置初始 t → 一次性渲染 → 报告完成。

### 优缺点

| 优点 | 缺点 |
|------|------|
| 完全重置状态，不怕泄漏 | 每帧重启页面，慢 10-100x |
| 并行天然（每个 URL 独立进程） | 资源重载开销 |
| 调试简单（刷页面就行） | 不能做实时预览 |

**MVP 用 `__renderAt` 模式，遇到 bug 再退化到 URL 模式作为兜底。**

---

## 6. 音频混音流程

### 核心：视频和音频分开处理

```
视频轨 ──▶ WebView 渲染 ──▶ frame 序列 ──▶ VideoToolbox 编码 ──▶ 无声 mp4
                                                                      │
音频轨 ──▶ 直接取 assets ──▶ 用 ffmpeg 混音 ──▶ wav ────────────────┤
                                                                      │
                                                            ffmpeg mux │
                                                                      ▼
                                                               final.mp4
```

### 为什么分开

- WebView 内的 `<audio>` 元素不易捕获时间精确的音频流
- 视频帧渲染的节奏 ≠ 音频采样的节奏
- 分开做各司其职，音频走纯 ffmpeg，简单稳定

### 音频混音步骤

1. 扫描 project.tracks 里所有 audio 类型的 clip
2. 对每个 clip：
   - 按 clip.params.assetId 找到源音频
   - 按 clip.start + clip.duration 裁剪
   - 应用音量、淡入淡出
3. 多轨用 ffmpeg `amix` 混合
4. 产出 `audio_mixed.wav`

### 最终合成

```bash
ffmpeg -i video_no_audio.mp4 -i audio_mixed.wav -c:v copy -c:a aac final.mp4
```

- `-c:v copy` 不重新编码视频（因为已经 VideoToolbox 硬编过）
- `-c:a aac` 音频编码 AAC

---

## 7. 未来：IOSurface GPU 直读

### 现状问题

Recorder 用 CDP 的 `Page.captureScreenshot` 抓帧：

- 每帧走 PNG 编码 → base64 → JS → Rust → PNG 解码 → 编码 → h264
- 瓶颈在 PNG 编解码，速度只有 10-20 fps（目标是 60+ fps）

### IOSurface 方案

macOS 上 WKWebView 内部用 IOSurface 做 GPU 合成。如果能直接共享 IOSurface 给 VideoToolbox，数据全程在 GPU 上：

```
WKWebView (GPU) ──▶ IOSurface ──▶ VideoToolbox (GPU) ──▶ h264
                    ↑
            零 CPU 拷贝
```

### 可行性

- 需要 private API 或底层 WebKit hook
- 参考：Chrome 的 `video.captureStream()` + 硬编（但 WKWebView 没这个）
- 参考：Cap（macOS 录屏工具）实现
- POC 必要：先做一个最小实验验证 IOSurface 能不能拿到

**先不做**：MVP 用 CDP + PNG 也能出 60 帧（只是慢），IOSurface 作为 v2 优化。

---

## 8. 整体导出流程图

```
┌──────────────────────────────────────────────────┐
│  步骤 1: 用户点"导出" → 选参数（分辨率/fps/码率） │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 2: Recorder 启动 N 个 headless WebView     │
│         加载 engine.html?project=... (分段并行)  │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 3: 每个 WebView 内 renderAt(t) 循环         │
│         HTML 完成一帧 → window.__onFrame()        │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 4: Recorder 抓帧（CDP screenshot）          │
│         → 喂给 VideoToolbox 硬件编码器            │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 5: 分段编码完成 → ffmpeg concat 拼接成      │
│         一个 video_no_audio.mp4                  │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 6: 扫描音频 clip → ffmpeg 混音              │
│         产出 audio_mixed.wav                     │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 7: ffmpeg mux 视频 + 音频 → final.mp4       │
└────────────────────┬─────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│  步骤 8: 清理临时文件 + 通知 UI + 打开导出位置    │
└──────────────────────────────────────────────────┘
```

### 时间预算（目标）

- 30 秒 1080p60 视频
- 串行目标：≤ 60 秒导出
- 并行 4 路目标：≤ 20 秒导出
- v2（IOSurface）目标：≤ 10 秒导出

---

## 9. Recorder 实现语言

**Rust**。用：

| 用途 | crate |
|------|-------|
| 控制 WebView | `wry`（WebView 封装）+ CDP (`chromiumoxide`) |
| 解码 PNG | `image` |
| 编码 h264 | 调 VideoToolbox（objc2）或 `ffmpeg-next` |
| ffmpeg 辅助 | 子进程 `std::process::Command` |
| 进度通知 | 向 JS 端发 IPC event |

### 进程模型

```
NextFrame (main process)
  ├── Editor WebView (人看的界面)
  ├── Recorder Worker (Rust thread)
  │     ├── Headless WebView 1
  │     ├── Headless WebView 2
  │     └── Headless WebView N
  └── Audio Mix Worker (Rust thread, ffmpeg 子进程)
```

---

## 10. 错误处理

| 错误 | 处理 |
|------|------|
| 某帧超时（> 5s） | 重试 1 次，仍失败则使用前一帧 |
| HTML 崩溃 | 重启 WebView，从崩溃帧继续 |
| 编码失败 | 暴露原始错误给用户 + 保留临时帧用于调试 |
| 音频源丢失 | 提示用户，允许跳过或取消 |
| 磁盘满 | 提前检查剩余空间 |

---

## 11. 可观测性

Recorder 每帧写一条 NDJSON 日志：

```jsonl
{"t": 0.0, "frame": 0, "render_ms": 12, "capture_ms": 8, "encode_ms": 5}
{"t": 0.0167, "frame": 1, "render_ms": 10, "capture_ms": 7, "encode_ms": 4}
```

目的：
- 实时进度汇报给 UI
- 导出后分析性能瓶颈
- AI 自己可以读日志诊断

---

## 12. POC 验证清单

开始实现前要先验证：

- [x] `poc/01-frame-pure/` — frame-pure 渲染可行
- [x] `poc/02-multi-track/` — 多轨道时间线可行
- [ ] `poc/recorder-headless/` — headless WebView + CDP 抓帧
- [ ] `poc/videotoolbox-encode/` — Rust 调 VideoToolbox 编码
- [ ] `poc/parallel-render/` — 多 WebView 并行分段
- [ ] `poc/iosurface-capture/` — IOSurface 直读（v2）
