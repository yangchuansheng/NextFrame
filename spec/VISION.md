---
title: NextFrame Vision
summary: AI 原生的桌面视频编辑器。frame-pure 渲染、JSON 即时间线、scene 即组件，给 AI 写代码、给人拖拽、给字级音画同步留好所有接缝。
---

# NextFrame Vision

## 一句话

**NextFrame 是一个 AI 原生的桌面视频编辑器，用 frame-pure 渲染和 JSON 时间线，让 AI 直接写视频代码。**

对标剪映、Premiere、After Effects、Remotion —— 但不走它们任何一条路。

---

## 要解决的市场缺口

今天剪一条 AI 素材驱动的视频，典型流程是这样的：

1. 在 Kling / Runway / Veo 里生成几段 5 秒的视频
2. 下载到本地
3. 打开剪映，手动拖到时间线上
4. 手动剪切、对齐、配字幕、配音
5. 导出、上传

**每一步都在浪费 AI 的时间**。AI 能写脚本、能调模型、能选镜头，但最后全要靠人在 GUI 里拖鼠标。剪映/Premiere 不是给 AI 用的，AI 无法"看到"时间线、无法"操作"轨道、无法生成可执行的编辑指令。

Remotion 走了一步 —— 用代码写视频。但它绑了 React + Chromium + ffmpeg，AI 写 TSX 比写普通 JS 慢 2-3 倍、出错率高 5 倍，而且 Remotion 是库不是编辑器，没有 GUI、没有音频多轨、没有实时预览拖拽。

**缺口：一个既能 AI 写代码又能人拖拽、既有专业编辑器的多轨时间线又有 Remotion 的可编程性、既能字级同步音画又能硬件加速导出的产品。**

---

## 跟现有工具的差异

| 维度 | 剪映 / Premiere | Remotion | After Effects | **NextFrame** |
|------|---------|----------|----|-----------|
| 时间线 | GUI 拖拽 | React 组件树 | GUI + 表达式 | **JSON + GUI + AI 代码** |
| 渲染 | 时间轴回放 | React + Chromium | 累积状态 | **frame-pure: f(t) → frame** |
| 音画同步 | 靠人对齐 | 帧号 | 关键帧 | **字级时间戳（vox 自带）** |
| 导出 | 内置编码 | ffmpeg | 内置 | **VideoToolbox 硬件编码** |
| AI 可操作 | 否 | 半 | 否 | **JSON 是一等公民** |
| 扩展 | 插件商店 | 写 React 组件 | 脚本 + 插件 | **写一个纯函数 scene** |
| 外壳 | 原生 | Node CLI | 原生 | **Tauri + WKWebView** |
| 前端技术 | — | React/TSX | — | **纯 HTML/CSS/JS** |

**关键差异 —— frame-pure**：Remotion 和 AE 也能跳帧，但它们的组件树和关键帧系统本质上仍然假设"从头播到 t"的语义。NextFrame 从第一行代码就假设"任何时刻 t 可以独立计算"，这是解锁并行渲染、拖拽预览、AI 写代码一致性的地基。

---

## 核心价值主张

### 给 AI
- 时间线是 JSON，改一个字段 = 改一段视频
- Scene 是纯函数，写一个新组件 10 行 JS 即可注册
- 不用学 React，不用学 TSX，不用学 Remotion DSL
- 所有编辑操作都有对应的 `ai_ops` CLI 接口
- 可以开 N 个 headless WebView 并行渲染 N 段视频

### 给人
- 多轨道时间线，可拖拽、可剪切、可调音量
- 实时预览任意时刻（因为 frame-pure）
- 撤销/重做 = JSON 快照切换，永远不坏
- 字幕跟配音字级同步（vox 产出时间戳）
- 导出走硬件编码，比 ffmpeg 软编快 5-10x

### 给字级音画同步
- vox 产出 TTS 时自带每个字的起止时间
- 时间线里字幕 scene 直接吃这个时间戳
- 不用手动对齐，天然同步
- 这是剪映/Premiere/Remotion 都没法做到的唯一优势

---

## 目标用户画像

**第一圈：我自己 + 做 AI 视频的独立创作者**
- 会写代码、会用 AI 工具
- 每天出 1-5 条短视频或讲解视频
- 痛苦点：Kling/Runway 出完素材后剪辑太慢
- 愿意为"AI 写代码出视频"付时间成本换效率

**第二圈：AI 视频工作室 / 教育内容团队**
- 批量化产出同风格视频
- 需要可编程的模板系统
- 剪映/CapCut 的模板功能太弱，Remotion 学习曲线太陡
- NextFrame 的 scene 库 + JSON 时间线正好卡这个位置

**第三圈：Remotion 用户的迁移盘**
- 嫌 React 写视频慢、慢、慢
- 想要 GUI 辅助但不想失去代码控制
- 想要硬件加速导出

**明确不做的用户**：抖音达人剪日常 vlog 的（那是剪映的地盘，GUI 体验 NextFrame 永远不会比剪映好）。

---

## 商业模式可能性

按成本和野心递增：

**Option A：自用工具**
- 只给自己和团队用
- 不做商业化
- 专注做得爽，不妥协
- 成本最低，迭代最快

**Option B：开源 + 付费插件**
- 核心引擎开源（引流 + 社区贡献）
- 卖高级 scene 库、模板、素材包
- 卖云端渲染服务
- 走 Blender / Obsidian 路线

**Option C：SaaS 订阅**
- 桌面版免费，云端协同/渲染/素材库收费
- 走 Figma / Linear 路线
- 需要服务端投入，不适合早期

**Option D：垂直行业解决方案**
- 切"AI 教学视频生成"、"电商产品视频批量"等具体场景
- 按企业 license 收费
- 需要销售能力

**当前策略：先 A，再考虑 B**。不为商业化妥协产品形态。

---

## 4 阶段路线图

### Phase 0：能跑的最小闭环（当前）
**目标**：一个 HTML 页面，一份 JSON 时间线，能渲染出一段 10 秒的视频并导出 mp4。

产出：
- frame-pure 引擎核心（renderAt(t) 主循环）
- 3-5 个内置 scene（text、image、bg、lowerThird、video）
- 单轨道时间线
- 手写 JSON + 控制台操作
- recorder 集成导出

验证：能不能在一个 WebView 里跑通 JSON → 帧序列 → mp4 全链路。

### Phase 1：多轨道 + GUI 时间线
**目标**：专业编辑器的基本交互。

产出：
- 多轨道时间线 UI（拖拽、剪切、缩放）
- 4-6 条轨道并存（bg / video / text / audio / overlay）
- 撤销/重做（JSON 快照）
- 实时预览（scrub 时间线立刻看画面）
- 字级字幕自动对齐（vox 时间戳直通）

验证：一个人能不能用 GUI 剪一条 30 秒视频、不用写代码。

### Phase 2：AI 写代码 + 并行渲染
**目标**：AI 成为一等公民。

产出：
- `ai_ops` CLI 接口（crud + simulate 两层）
- AI 读 JSON、改 JSON、插入新 clip、调整参数
- 多 WebView 并行渲染（N 帧同时出，拼接成片）
- Scene 库商店（注册/共享/下载 scene）
- Prompt → JSON 时间线生成

验证：让 Claude/GPT 从空白生成一条完整 1 分钟视频并导出。

### Phase 3：生态 + 跨平台
**目标**：从工具变产品。

产出：
- Windows / Linux 支持（WebView2 + WebKitGTK）
- 插件系统（第三方 scene 库）
- 云端渲染 / 协同（可选）
- 模板市场

**没有时间表**。每个 Phase 验证通过才进下一阶段。验证不过就停在当前阶段打磨。

---

## 明确不做的东西

诚实的边界是资产：

- **角色动画 / 骨骼动画 / Live2D**：这是专业动画软件的战场，NextFrame 不碰
- **电影级 VFX**：没有节点合成、没有色彩管理、没有 OCIO、没有 EXR，这是 Nuke/DaVinci 的地盘
- **3A 游戏 CG / 实时渲染**：我们是 HTML canvas，不是 Unreal
- **批量变体工厂**：不做"一个模板出 1000 个版本"的 B2B SaaS，那是 Templated.io 的路线
- **AI 视频生成本身**：不训模型，不做扩散，不跟 Kling/Runway/Veo 竞争 —— **我们是剪辑器，不是生成器**
- **移动端**：不做 iOS/Android app，专注桌面
- **浏览器云端版**：不做 webapp，专注本地桌面（数据隐私、硬件加速、文件系统）
- **重度交互式视频 / 游戏化内容**：不做 Twitch overlay、不做可点击视频
- **直播推流**：不做 OBS 的事
- **音乐制作 / DAW**：不做多轨混音台的专业功能，够用就好

**我们只做一件事：把 AI 生成的视频素材、音频、文字，用 JSON 编排起来，导出成一条片子**。

---

## 为什么现在做

- **WKWebView 性能够用**：2024 年的 macOS WebView 已经能流畅跑 60fps canvas 合成
- **VideoToolbox 成熟**：硬件编码 1.15x 实时已经在 recorder POC 里验证过
- **vox 字级时间戳**：自研 TTS 解决了剪映/Remotion 都解决不了的音画同步
- **Claude Opus 4.6 写 JS 够快**：AI 写 200 行纯 JS scene 只要几秒，而写等价的 React 组件要更久且更容易错
- **Tauri 2.0 稳定**：Rust 后端 + WebView 前端的组合不再是玩具
- **剪映和 Premiere 都没做 AI 原生**：窗口期还在

**时机窗口：12-18 个月**。再晚，剪映会加 AI SDK，Adobe 会让 After Effects 吃 Copilot，那时候 NextFrame 就得拼别的优势。

---

## 愿景一句话收尾

> 让 AI 像人一样剪视频，让人像 AI 一样精确。
