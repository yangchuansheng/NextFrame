---
title: NextFrame 整体架构
summary: Tauri 桌面壳 + WKWebView 前端引擎 + Rust 后端服务。三层结构：HTML 引擎 / JSON 时间线 / scene 库 / 资产库。双管线：实时预览走单 WebView，导出走多 WebView 并行 + VideoToolbox 硬编。
---

# 整体架构

## 三层心智模型

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│        HTML 引擎  (渲染器 + 时间线 UI + 预览)            │
│                      │                                   │
│                     读写                                 │
│                      │                                   │
│                JSON 时间线  ← 真相源                     │
│                      │                                   │
│                    引用                                  │
│                      │                                   │
│              Scene 库 (一堆纯函数)                       │
│                      │                                   │
│                    引用                                  │
│                      │                                   │
│           资产库 (视频/图/SVG/字体/音频)                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- **HTML 引擎**：消费 JSON，调用 scene 函数，画到 canvas
- **JSON 时间线**：数据真相，人和 AI 都改它
- **Scene 库**：可复用的纯函数组件
- **资产库**：被 scene 引用的原始素材

人 / AI 的编辑操作本质上都是"改 JSON"。改完 JSON，引擎 `renderAt(t)` 重画。闭环。

---

## 完整架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tauri 桌面壳 (macOS)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  WKWebView (系统自带)                     │  │
│  │                                                           │  │
│  │   ┌───────────────┐   ┌───────────────┐                   │  │
│  │   │  Timeline UI  │   │ Preview Canvas│                   │  │
│  │   │ (tracks/clips)│   │  (renderAt t) │                   │  │
│  │   └───────┬───────┘   └───────▲───────┘                   │  │
│  │           │                   │                           │  │
│  │           │      读写          │    renderAt(t)             │  │
│  │           ▼                   │                           │  │
│  │   ┌─────────────────────────┐ │                           │  │
│  │   │  JSON Timeline (真相)   │─┘                           │  │
│  │   │  {tracks: [...clips]}   │                             │  │
│  │   └──────────┬──────────────┘                             │  │
│  │              │                                            │  │
│  │              │  scene 名字 → 函数                          │  │
│  │              ▼                                            │  │
│  │   ┌─────────────────────────┐   ┌─────────────────────┐   │  │
│  │   │  Scene Registry (函数)  │   │   Web Audio API     │   │  │
│  │   │  text/image/bg/video... │   │   (多轨混音)        │   │  │
│  │   └──────────┬──────────────┘   └─────────────────────┘   │  │
│  │              │                                            │  │
│  │              │  读资产                                    │  │
│  │              ▼                                            │  │
│  │   ┌─────────────────────────┐                             │  │
│  │   │  Asset Cache (内存)     │                             │  │
│  │   └──────────┬──────────────┘                             │  │
│  └──────────────┼────────────────────────────────────────────┘  │
│                 │                                               │
│                 │  IPC (Tauri invoke)                           │
│                 │                                               │
│  ┌──────────────▼────────────────────────────────────────────┐  │
│  │                      Rust 后端                            │  │
│  │                                                           │  │
│  │   ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │  │
│  │   │  文件 I/O   │  │  Recorder    │  │  vox (TTS)     │   │  │
│  │   │  (tokio)    │  │  (VideoTool) │  │  字级时间戳    │   │  │
│  │   └─────────────┘  └──────────────┘  └────────────────┘   │  │
│  │                                                           │  │
│  │   ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │  │
│  │   │ AI API      │  │ 并行 WebView │  │  Asset         │   │  │
│  │   │ (Kling/Runway│  │ 管理池       │  │  Pipeline      │   │  │
│  │   │  /Suno)     │  │ (导出用)     │  │  (解码/缓存)   │   │  │
│  │   └─────────────┘  └──────────────┘  └────────────────┘   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 为什么这么分层

### 为什么用 Tauri 而不是 Electron

- Electron 捆绑 Chromium，每个应用 150MB+；Tauri 用系统 WebView，20MB
- Rust 后端天然安全，内存不崩
- 原生 macOS 体验（WKWebView 跟 Safari 同引擎），Chromium 跟 Safari 有些渲染差异
- 调硬件（VideoToolbox、Metal）走 Rust 更直接

### 为什么用 WKWebView 而不是 Chromium

Recorder POC 验证：WKWebView 1080p 60fps canvas 合成 1.15x 实时，够用。Chromium 更强但差距在导出阶段会被 VideoToolbox 抹平。WKWebView 省下的内存和启动时间更值钱。

### 为什么 WebView 里不用 React

**AI 写 React 比写纯 JS 慢 2-3x，错多 5x**。这不是风格偏好，是可测量的事实。原因：
- React 的 JSX/hooks 心智模型跟 canvas 命令式绘图天然不匹配
- 每次让 AI 改一个动画逻辑，React 组件的 re-render 规则、useEffect 依赖数组都会变成干扰项
- frame-pure 的 `renderAt(t)` 根本不需要组件树 —— 一个函数就够了

所以 NextFrame 里 WebView 前端只有三样东西：
- 原生 DOM（做 UI 骨架）
- Canvas 2D / WebGL（做渲染）
- 一堆纯 JS 函数（做 scene）

**零框架**。

### 为什么 JSON 是真相而不是 AST

- JSON 是 AI 最熟悉的格式，Claude/GPT 生成 JSON 的正确率 >> 生成 DSL
- JSON 能直接存盘、diff、merge、版本控制
- 编辑操作 = JSON patch，天然支持撤销/重做
- GUI 拖拽和 AI 代码操作的是同一个东西，不需要双向绑定

---

## WebView 内部组件

```
┌─────────────────────────────────────────────────────────┐
│  index.html                                             │
│  ├─ <div id="timeline-ui">    （左右拖拽的多轨时间线） │
│  ├─ <canvas id="preview">     （主预览画布）           │
│  ├─ <div id="inspector">      （右侧属性面板）         │
│  └─ <script type="module">                             │
│      import { engine } from './engine.js'              │
│      import { scenes } from './scenes/index.js'        │
│      engine.loadTimeline(jsonTimeline)                 │
│      engine.renderAt(0)                                │
│  </script>                                             │
└─────────────────────────────────────────────────────────┘
```

### Timeline UI
- 显示轨道、clip 块、时间刻度
- 拖拽 = 改 JSON timeline 对象的 `clips[i].start`
- 剪切 = 分裂一个 clip 成两个
- **UI 只写 JSON，不直接调 renderAt** —— JSON 变了引擎自己重渲染

### Preview Canvas
- 一个主 canvas（如 1920x1080）
- 监听 JSON 变化和 `currentT` 变化 → 调 `engine.renderAt(currentT)`
- `renderAt` 按 JSON 遍历所有活跃 clip，按 z 顺序调各自的 scene 函数

### Web Audio
- 多条音频 clip 走 Web Audio API 的 AudioBufferSourceNode
- Scrub 时直接 seek，不跟视频对齐（视觉走 frame-pure，音频走播放时钟）
- 导出时音频单独渲染成 wav，recorder 最后 mux 进 mp4

### Asset Cache
- 图片/视频/SVG 第一次用时解码，之后缓存在内存里
- WebView 跳帧时这些都是同步可用的，否则每帧要重新解码

---

## Rust 后端职责

**原则：前端做不到或做不好的事才进 Rust。**

| 模块 | 职责 | 为什么在 Rust |
|------|------|---------------|
| **文件 I/O** | 读写 JSON 时间线、读素材、导出 mp4 | WebView 访问本地文件受限 |
| **Recorder** | 驱动 WKWebView 截图 + VideoToolbox 编码 | 硬件编码必须走原生 |
| **vox** | TTS 生成 + 字级时间戳 | Rust 调模型比 JS 快且能本地运行 |
| **AI API 调度** | 调 Kling/Runway/Suno/Claude API | 统一凭证管理、流式处理、重试 |
| **并行 WebView 池** | 导出时开 N 个隐藏 WebView 各跳各帧 | 需要控制 WebView 生命周期 |
| **Asset Pipeline** | 视频转码、图片预览图生成、字体加载 | 用 ffmpeg 库或 objc2 调原生 API |

### Tauri IPC 接口示例

```rust
#[tauri::command]
async fn export_timeline(
    timeline: serde_json::Value,
    output_path: PathBuf,
    fps: u32,
) -> Result<ExportResult, Error> {
    let total_frames = ...;
    let pool = WebViewPool::new(4);  // 4 路并行
    let frames = pool.render_frames(&timeline, 0..total_frames).await?;
    let audio = render_audio(&timeline).await?;
    videotoolbox_encode(&frames, &audio, &output_path, fps).await
}
```

前端：
```js
const result = await window.__TAURI__.invoke('export_timeline', {
  timeline: engine.currentTimeline,
  outputPath: '/Users/.../out.mp4',
  fps: 60,
})
```

---

## 双管线：预览 vs 导出

这是 NextFrame 跟传统编辑器最大的实现差异。

### 实时预览管线

```
用户拖时间线到 t=3.5
    │
    ▼
timeline UI 更新 currentT
    │
    ▼
engine.renderAt(3.5)
    │
    ├─ 找出 t=3.5 时所有活跃 clip
    ├─ 按 z 顺序逐个调 scene(3.5, clip.params, ctx)
    └─ 把结果合成到主 canvas
    │
    ▼
用户立刻看到画面
```

**关键**：只用一个 WebView，一次 `renderAt` 调用，目标是 16ms 内完成（60fps）。

### 导出管线

```
用户点导出
    │
    ▼
Rust 后端起 4-8 个 headless WebView
    │
    ▼
每个 WebView 独立跑 engine.loadTimeline(同一份 JSON)
    │
    ▼
分配帧区间：
  WebView 1 → 帧 [0, 150)
  WebView 2 → 帧 [150, 300)
  WebView 3 → 帧 [300, 450)
  WebView 4 → 帧 [450, 600)
    │
    ▼
每个 WebView 循环：
  renderAt(frameIdx / fps)
  截图 → 送回 Rust
    │
    ▼
Rust 按顺序收集帧
    │
    ▼
VideoToolbox 硬件编码 + 音频 mux
    │
    ▼
输出 mp4
```

**关键**：并行是 frame-pure 换来的 —— 每个 WebView 跳不同的帧互不干扰，因为没有累积状态。

### 两套管线共享同一个 `renderAt`

预览和导出调用的是同一个 `engine.renderAt(t)` 函数、同一套 scene 代码。这是 **"所见即所得"的唯一正确实现方式** —— 不存在"预览是近似、成片是精确"的分裂。

---

## 数据流（一次完整编辑操作）

用户拖一段视频 clip 到第二条轨道的 t=2.0 位置：

```
1. Timeline UI 捕获鼠标松开事件
     │
2. 计算目标 track、目标 t
     │
3. 修改 JSON：
   timeline.tracks[1].clips.push({
     id: 'clip_abc',
     scene: 'video',
     start: 2.0,
     dur: 3.5,
     params: { src: 'assets/ai_1.mp4', volume: 1 }
   })
     │
4. 发出 "timeline-changed" 事件
     │
5. engine 监听到，调 renderAt(currentT)
     │
6. Preview Canvas 更新
     │
7. 同时存盘：Tauri invoke('save_timeline', { json })
     │
8. Rust 写入 project.json
```

**注意**：每一步都是纯数据流，没有"状态同步"的概念 —— 因为只有一个状态，就是 JSON。

---

## 插件 / 扩展点

**Phase 2 之后**才开始考虑。初期不做。

可能的扩展点：
- Scene 注册：第三方 JS 文件 `registerScene('myFancy', fn)`
- 导出格式：不同的编码器（ProRes、WebM、GIF）
- 资产源：云端素材库、Kling 直出接入
- AI 指令：自定义 `ai_ops` 命令

**不会**暴露的扩展点：
- 修改引擎核心（frame-pure 不可破坏）
- 修改时间线 schema（JSON 格式是 API 契约）
- 修改渲染管线（导出/预览双管线是架构不变量）

---

## 架构不变量

下列任何一条被破坏 → 架构出了问题，停下来修。

1. **所有 scene 必须 frame-pure**（见 `01-frame-pure.md`）
2. **JSON 是唯一状态真相**，UI 和 AI 都不得维护额外的"当前状态"
3. **WebView 前端零框架**，只有原生 DOM + Canvas + 纯 JS
4. **预览和导出共享同一个 `renderAt`**，不得有两份渲染路径
5. **Rust 只负责 I/O 和硬件**，不掺和渲染逻辑
6. **Scene 函数不得调用网络或文件系统**，所有资产走 ctx 传入
7. **时间线 schema 向后兼容**，老 JSON 在新版本必须能打开

---

## 目录结构（建议）

```
NextFrame/
├── VISION.md
├── README.md
├── docs/
│   ├── 01-frame-pure.md
│   ├── 02-architecture.md
│   ├── 03-scene-spec.md
│   └── 04-timeline-json.md
├── tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── ipc.rs
│   │   ├── recorder.rs
│   │   ├── vox_bridge.rs
│   │   ├── webview_pool.rs
│   │   └── ai_api.rs
│   └── Cargo.toml
├── runtime/                # WebView 里的引擎代码
│   ├── index.html
│   ├── engine.js           # renderAt 主循环
│   ├── timeline-ui.js      # 多轨时间线 UI
│   ├── inspector.js        # 右侧属性面板
│   └── scenes/             # scene 库
│       ├── index.js        # 注册表
│       ├── text.js
│       ├── image.js
│       ├── video.js
│       ├── bg.js
│       └── ...
├── poc/                    # 验证用
├── research/               # 竞品/技术调研
└── projects/               # 实际做的视频项目
```

`snippets/` 放可复用的小块 JS 代码（缓动函数、色彩转换、形状库）。
