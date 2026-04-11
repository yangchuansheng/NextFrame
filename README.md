# NextFrame

> **AI-native video editor. Frame-pure. Multi-track. Browser-native.**
>
> 一个为 AI 原生设计的桌面视频编辑器。代码即时间线，HTML 即画面，frame-pure 是地基。

## 核心理念

```
1 个 HTML 引擎  +  1 份 JSON 时间线  +  N 个 scene 函数  +  N 个素材
                                  =
                            任意复杂的视频
```

**三大原则：**

1. **Frame-Pure** — 所有动画 = `f(t) → frame`，给定 t 立刻画出那一帧
2. **JSON 即真相** — UI 拖拽 = AI 写代码 = 改同一份 JSON
3. **Scene 是组件库** — 纯函数 `(t, params, ctx) => void`，越攒越多

## 快速导览

### 📖 先读这 4 个
- [`VISION.md`](VISION.md) — 完整愿景、定位、商业模式、不做清单
- [`docs/01-frame-pure.md`](docs/01-frame-pure.md) — Frame-pure 原则（地基）
- [`docs/02-architecture.md`](docs/02-architecture.md) — 整体架构（Tauri + WebView + Rust）
- [`design/roadmap-detail.md`](design/roadmap-detail.md) — 4 阶段详细路线图

### 🎯 看可工作的 POC
- [`poc/01-frame-pure/`](poc/01-frame-pure/) — 10 分钟 frame-pure 演示，可拖时间线任意取帧
- [`poc/02-multi-track/`](poc/02-multi-track/) — 多轨时间线 demo，6 轨道叠加
- [`poc/03-editor-mockup/`](poc/03-editor-mockup/) — CapCut 风格编辑器 UI 原型图（高保真）
- [`poc/04-atoms-showcase/`](poc/04-atoms-showcase/) — 24 个视觉原子（电影/数字/3D/粒子/字体）
- [`poc/05-top-tier/`](poc/05-top-tier/) — 6 个顶级作品（产品发布/数据大屏/WebGL/字体/粒子艺术/电影场景）
- [`poc/06-whiteboard/`](poc/06-whiteboard/) — 白板动画 + WeChat UI 复刻 + Q 版猫头鹰
- [`poc/07-fourier-engine/`](poc/07-fourier-engine/) — 早期引擎（带 vox 字级同步）

## 完整目录

```
NextFrame/
├── README.md                       ← 你在这里
├── VISION.md                       ← 完整愿景
│
├── docs/                           ← 设计文档
│   ├── 01-frame-pure.md            ← Frame-pure 原则详解
│   ├── 02-architecture.md          ← 整体架构
│   ├── 03-scene-spec.md            ← Scene 接口规范
│   ├── 04-timeline-json.md         ← JSON 时间线格式
│   ├── 05-rendering-pipeline.md    ← 渲染管线（GPU + recorder）
│   ├── 06-vs-remotion.md           ← 跟 Remotion 对比
│   ├── 07-ai-native.md             ← AI 原生设计原则
│   ├── 08-html-ceiling.md          ← HTML 视觉上限
│   └── lessons-learned.md          ← 探索过程经验沉淀
│
├── design/                         ← 设计规范
│   ├── ui-layout.md                ← 编辑器 UI 布局
│   ├── scene-categories.md         ← Scene 分类清单（60+）
│   ├── data-flow.md                ← 数据流和状态管理
│   ├── asset-library.md            ← 资产库设计
│   ├── recorder-integration.md     ← Recorder 集成
│   └── roadmap-detail.md           ← 详细路线图
│
├── research/                       ← 调研
│   ├── competitors.md              ← 8 个竞品深度分析
│   └── ai-video-2026.md            ← 2026 年 AI 视频生成现状
│
├── snippets/                       ← 关键代码片段
│   ├── 01-render-at.js             ← frame-pure 渲染入口模板
│   ├── 02-scene-factory.js         ← scene 函数标准写法（5 例）
│   ├── 03-multi-track-engine.js    ← 多轨调度引擎核心
│   ├── 04-cue-resolver.js          ← 文本锚点 → ms 解析器
│   └── 05-audio-driven-clock.js    ← 音频驱动时钟 + 字幕
│
├── poc/                            ← 已验证的 PoC
│   ├── 01-frame-pure/              ← Frame-pure 单 HTML demo
│   ├── 02-multi-track/             ← 多轨时间线 demo
│   ├── 03-editor-mockup/           ← CapCut 风 UI 原型图
│   ├── 04-atoms-showcase/          ← 24 个视觉原子（含 index）
│   ├── 05-top-tier/                ← 6 个顶级作品
│   ├── 06-whiteboard/              ← 白板/UI/吉祥物
│   └── 07-fourier-engine/          ← 早期引擎（vox 集成）
│
├── runtime/                        ← 未来引擎代码
├── tauri/                          ← 未来 Tauri 桌面壳
└── projects/                       ← 用户视频项目
```

## 一句话定位

| 维度 | NextFrame |
|---|---|
| 写代码 | 普通 JS / HTML / SVG / Canvas / WebGL |
| 时钟 | 字级文本锚点（vox + whisper）|
| 渲染 | WKWebView + VideoToolbox 硬编 |
| 输出 | MP4 + 活页 HTML 双形态 |
| AI 集成 | 第一天内置（Kling/Runway/Veo + ElevenLabs/Suno + vox）|
| 中文 | 优先 |
| 桌面壳 | Tauri (Rust) |
| 不用 | React / Electron / Lambda |

## 已有资产（继承自 bigbang）

- ✅ **vox** — Rust TTS + 字级时间戳
- ✅ **recorder** — Rust + WKWebView + VideoToolbox 硬件编码（1.15x 实时）
- ✅ **24 个原子 demo** — 验证视觉技术栈天花板
- ✅ **6 个顶级作品** — 验证 HTML 视觉上限
- ✅ **frame-pure 单 HTML demo** — 验证可拖时间线任意取帧
- ✅ **多轨时间线 demo** — 验证 JSON 调度架构
- ✅ **CapCut 风格 UI 原型图** — 验证桌面编辑器布局可行

## Phase 0 已完成 · Phase 1 待启动

下一步：根据 [`design/roadmap-detail.md`](design/roadmap-detail.md) 的 24 个 P1 任务（T1-T24），开始 Phase 1（引擎核心 + 时间线 UI + 实时预览，预计 2-3 周）。

## 一句话总结

> **NextFrame：把视频做成 JSON，让 AI 写代码，让浏览器渲染，让硬件编码。**
