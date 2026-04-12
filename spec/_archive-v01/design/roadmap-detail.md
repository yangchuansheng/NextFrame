---
title: NextFrame Roadmap Detail
summary: Phase 0-4 详细任务清单。P0 已完成 POC 验证。P1 (2-3 周) 引擎 + 时间线 + 预览。P2 (1-2 周) 录制导出。P3 (1 周) Tauri 封装。P4 (持续) AI 集成 + scene 扩展。
---

# NextFrame Roadmap Detail

## 总览

| Phase | 时长 | 产出 | 状态 |
|-------|------|------|------|
| **0** | 已完成 | POC 验证 | ✅ Done |
| **1** | 2-3 周 | 引擎核心 + 时间线 UI + 实时预览 | 🚧 进行 |
| **2** | 1-2 周 | 录制导出 | ⏳ 待启动 |
| **3** | 1 周 | Tauri 桌面封装 | ⏳ 待启动 |
| **4** | 持续 | AI 集成 + scene 库扩展 | ⏳ 长期 |

**总计**：从今天到首个可用版本（v0.1 alpha）约 5-7 周，到 v1.0 约 3-6 个月。

---

## Phase 0：POC 验证（✅ 已完成）

### 产出清单

| POC | 路径 | 验证结论 |
|-----|------|---------|
| 01 frame-pure | `poc/01-frame-pure/` | ✅ 任意 t 可独立渲染 |
| 02 multi-track | `poc/02-multi-track/` | ✅ 多轨道时间线可行 |
| 03 editor-mockup | `poc/03-editor-mockup/` | ✅ 高保真编辑器 UI |
| 04 atoms-showcase | `poc/04-atoms-showcase/` | ✅ 24 个 scene 原子全部可跑 |
| 05 top-tier | `poc/05-top-tier/` | ✅ 6 个高级特效可实现 |
| 06 whiteboard | `poc/06-whiteboard/` | ✅ 画布交互模式 |
| 07 fourier-engine | `poc/07-fourier-engine/` | ✅ 生成动画引擎 |

### 成功标准（已满足）

- ✅ 纯 HTML+CSS+JS 可以做出专业级视频效果
- ✅ 不用 React/Vue/Canvas，纯 DOM 足够
- ✅ frame-pure 架构可编程化
- ✅ 暗色主题视觉可 Awwwards 级别

---

## Phase 1：引擎核心 + 时间线 UI + 实时预览（2-3 周）

**目标**：在浏览器里能打开一个完整的编辑器，加几个 scene，拖动时间线实时预览。**不要求能导出视频**。

### 任务清单

#### 1.1 引擎核心 (3-5 天)

- [ ] **T1**: 定义 `project.json` schema（TypeScript type + JSON schema）
- [ ] **T2**: 实现 `Project` 类（load / save / validate / migrate）
- [ ] **T3**: 实现 `renderAt(project, t)` 主函数
- [ ] **T4**: 实现 scene 注册器（`SceneRegistry.register(id, renderFn)`）
- [ ] **T5**: 实现 5 个 P0 scene：video / image / text / titleCard / caption
- [ ] **T6**: 实现 `History` 栈（snapshot + undo/redo）

#### 1.2 时间线 UI (5-7 天)

- [ ] **T7**: 时间线 DOM 骨架（从 `03-editor-mockup` 扒 CSS）
- [ ] **T8**: 轨道渲染（从 project.tracks 生成 DOM）
- [ ] **T9**: Clip 渲染（按 start/duration 计算 left/width）
- [ ] **T10**: 播放头拖拽（mousedown/move/up → setPlayhead）
- [ ] **T11**: Clip 拖拽横移（实时更新 project + 预览）
- [ ] **T12**: Clip 换轨道（垂直拖拽）
- [ ] **T13**: Clip 剪切长度（左右边缘拖拽）
- [ ] **T14**: Clip 右键菜单（删除 / 复制 / 分割）
- [ ] **T15**: 时间尺缩放（Cmd+滚轮）
- [ ] **T16**: 时间码显示（SF Mono）

#### 1.3 预览区 (2-3 天)

- [ ] **T17**: 预览容器（保持 aspect ratio）
- [ ] **T18**: 订阅 playhead → 自动 renderAt
- [ ] **T19**: 播放控制（play/pause/step，Space 键）
- [ ] **T20**: 播放循环（rAF）

#### 1.4 侧栏 / inspector (3-4 天)

- [ ] **T21**: 左侧栏素材库（tab 切换 + 网格）
- [ ] **T22**: 右侧 inspector（根据 selection 显示 params）
- [ ] **T23**: 通用控件：number input / color picker / slider / text input
- [ ] **T24**: 导入文件（拖拽到侧栏）

### 成功标准

- 打开 index.html 能看到完整编辑器
- 能创建一个 project，加 3 个 scene（text + image + caption）
- 拖时间线播放头，预览区实时更新
- 拖 clip 位置，预览同步
- Ctrl+Z 能撤销
- 无 JS 报错、60fps 流畅

### 风险

| 风险 | 概率 | 应对 |
|------|------|------|
| 实时预览跟不上（拖拽卡） | 中 | renderAt 做 throttle + 预计算 |
| scene 数量多时 DOM 爆炸 | 低 | 只渲染活跃 clip，其他 display:none |
| 拖拽状态机复杂 | 中 | 写专门的 DragManager 统一处理 |

**Phase 1 交付物**：一个可跑的 HTML 文件，截图 + 30 秒屏幕录制。

---

## Phase 2：录制导出（1-2 周）

**目标**：点"导出"按钮，从当前 project 生成一个可播放的 mp4。

### 任务清单

#### 2.1 Recorder 基础 (3-4 天)

- [ ] **R1**: 新建 Rust crate `nextframe-recorder`
- [ ] **R2**: 用 `wry` + `chromiumoxide` 启动 headless WebView
- [ ] **R3**: 注入 `window.__recorderReady` 协议
- [ ] **R4**: 页面端实现 `window.__renderAt(t)` + `__onFrame()`
- [ ] **R5**: CDP `Page.captureScreenshot` 抓单帧

#### 2.2 视频编码 (3-4 天)

- [ ] **R6**: 调用 macOS VideoToolbox（objc2 或 ffmpeg-next）
- [ ] **R7**: PNG 序列 → h264 编码
- [ ] **R8**: 参数化（分辨率 / fps / 码率）
- [ ] **R9**: 输出无声 mp4

#### 2.3 音频混音 (2 天)

- [ ] **R10**: 扫描 project audio tracks
- [ ] **R11**: ffmpeg 裁剪 + 调音量 + 混多轨
- [ ] **R12**: 产出 wav

#### 2.4 最终合成 + UI (2 天)

- [ ] **R13**: ffmpeg mux 视频 + 音频
- [ ] **R14**: 导出对话框（分辨率/fps/文件名）
- [ ] **R15**: 进度条（订阅 Recorder NDJSON 日志）
- [ ] **R16**: 完成后打开 Finder 定位文件

### 成功标准

- 30 秒 1080p60 视频导出时间 ≤ 2 分钟（串行）
- 导出的 mp4 用 QuickTime 能正常播放
- 音画同步误差 ≤ 1 帧
- 字幕字级同步准确

### 风险

| 风险 | 概率 | 应对 |
|------|------|------|
| VideoToolbox API 坑多 | 高 | 先用 ffmpeg 软编做兜底，硬编作为优化 |
| headless WebView 字体渲染不一致 | 中 | 统一用内置字体 + 显式加载 |
| 抓帧速度慢 | 高 | 接受 20 fps 的 v1 速度，v2 做 IOSurface |

**Phase 2 交付物**：一个导出的真实 mp4 视频，附性能数据。

---

## Phase 3：Tauri 桌面封装（1 周）

**目标**：把浏览器原型打包成 macOS .app，双击启动。

### 任务清单

- [ ] **D1**: 创建 Tauri 项目（`tauri init`，禁用 React 模板）
- [ ] **D2**: 配置 `tauri.conf.json`：窗口大小、icon、bundle identifier
- [ ] **D3**: 把 Phase 1 HTML/JS 移植到 Tauri dist
- [ ] **D4**: 实现 Tauri commands：`open_project`、`save_project`、`pick_file`
- [ ] **D5**: 对接 Recorder（Tauri 调 Rust crate）
- [ ] **D6**: 文件关联 `.nframe.json`
- [ ] **D7**: 菜单栏（File/Edit/View）
- [ ] **D8**: 首次运行的欢迎页（最近项目 / 新建 / 打开）
- [ ] **D9**: 崩溃上报（Sentry 或简单本地日志）
- [ ] **D10**: dmg 打包 + 公证（可选）

### 成功标准

- 生成 NextFrame.app，大小 ≤ 50MB
- 双击启动时间 ≤ 2 秒
- 能打开文件、保存、导出，全链路走通
- 窗口大小/位置记忆
- 菜单快捷键生效

### 风险

| 风险 | 概率 | 应对 |
|------|------|------|
| Tauri + Recorder Rust 集成冲突 | 中 | 保持 Recorder 为独立 crate，Tauri 只做 dispatch |
| 字体/资源打包路径 | 中 | 用 Tauri resource 机制 + 运行时解析绝对路径 |
| 公证被拒 | 低 | 先跳过，内部用 |

**Phase 3 交付物**：一个可以发给朋友试用的 NextFrame.app，附安装说明。

---

## Phase 4：AI 集成 + scene 库扩展（持续）

**目标**：让 AI 能真正"操作"NextFrame，scene 库扩展到 60+。

### 4.1 AI 接口层 (1-2 周)

- [ ] **A1**: CLI 工具 `nextframe`（patch / show / render / export）
- [ ] **A2**: JSON schema 暴露给 AI（所有操作的参数定义）
- [ ] **A3**: `nextframe show` 输出当前 project（AI 自省）
- [ ] **A4**: `nextframe render --at 5.0 --out frame.png`（AI 截图验证）
- [ ] **A5**: 集成 Claude API / OpenAI API 作为 sidebar AI 助手
- [ ] **A6**: Prompt 模板库（"帮我加一个开场白"、"把这段字幕改英文"）

### 4.2 AI 素材生成 (1-2 周)

- [ ] **A7**: Kling API 对接（视频生成）
- [ ] **A8**: DALL-E 3 / MJ API 对接（图片生成）
- [ ] **A9**: vox TTS 集成（语音 + 字级时间戳）
- [ ] **A10**: Suno API 对接（音乐）
- [ ] **A11**: 侧栏"AI 生成"面板

### 4.3 Scene 库扩展

优先级见 `scene-categories.md`：

- [ ] **S1**: 补全 P0 全部 15 个 scene
- [ ] **S2**: P1 scene 30 个
- [ ] **S3**: P2 scene 15 个
- [ ] **S4**: 每个 scene 写单元测试（给定 t + params → 稳定输出）
- [ ] **S5**: scene 参数 UI 自动生成（从 schema）
- [ ] **S6**: scene 市场（用户贡献）

### 4.4 协作 / 云（远期）

- [ ] **C1**: 账号系统
- [ ] **C2**: 云存储项目 JSON
- [ ] **C3**: 实时协作（patch stream + CRDT）
- [ ] **C4**: 团队资产库

### 成功标准（持续衡量）

- AI 能独立完成"给我做一个 30 秒介绍 Claude API 的视频"的任务
- 用户在 App 内不写任何代码就能用 Kling 生成视频
- scene 库覆盖 80% 常见视频类型
- 每周稳定有新 scene 上线

---

## 整体里程碑

| 时间点 | 里程碑 | 交付物 |
|--------|--------|--------|
| Week 1 | Phase 1 启动 | 引擎骨架可跑 |
| Week 3 | Phase 1 完成 | 浏览器内可用的编辑器（v0.1 web demo） |
| Week 5 | Phase 2 完成 | 能导出 mp4（v0.2 export） |
| Week 6 | Phase 3 完成 | **NextFrame.app v0.1 alpha** ⭐ |
| Week 8 | Phase 4.1 完成 | AI CLI + sidebar 助手 |
| Week 12 | Phase 4.2 完成 | Kling / DALL-E / vox 接入 |
| Month 4 | 60 scene 完成 | **v0.5 beta 公开试用** |
| Month 6 | 稳定 + 优化 | **v1.0 正式版** |

---

## 关键风险汇总

| 风险 | Phase | 严重度 | 应对 |
|------|-------|--------|------|
| 实时预览性能 | 1 | 高 | throttle + 预计算 + 只渲染活跃 clip |
| VideoToolbox API | 2 | 高 | 软编兜底 |
| headless WebView 稳定性 | 2 | 中 | URL 参数模式兜底 |
| Tauri + Rust crate 集成 | 3 | 中 | 保持 crate 独立 |
| AI API 成本 | 4 | 中 | 本地模型优先 + 缓存 |
| scene 开发速度 | 4 | 低 | POC 已验证可行，批量化生产 |

---

## 需要决策的点

1. **软编 vs 硬编顺序**：先 ffmpeg 软编（稳）还是直接 VideoToolbox 硬编（快但坑）？**建议：软编 v1，硬编 v2。**
2. **Tauri 时机**：Phase 1 末期就封装 vs Phase 3 才封装？**建议：Phase 3，早期在浏览器里开发迭代更快。**
3. **AI 接口是否 MVP 必需**：v0.1 alpha 是否包含 AI 侧栏？**建议：不含，先保证人能用。v0.2 加 AI。**
4. **scene 优先级**：先做齐 P0 15 个（深度），还是先覆盖 P0+P1 广度？**建议：先 P0 深度，保证质量。**

---

## 参考

- **VISION**: `/Users/Zhuanz/bigbang/NextFrame/VISION.md`
- **设计文档**: 同目录下 5 个姐妹文档
- **POC**: `/Users/Zhuanz/bigbang/NextFrame/poc/`
