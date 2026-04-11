---
title: NextFrame vs Remotion
summary: 跟 Remotion 不是 fork 关系，是平行竞品。15 维度对比，强弱项说清楚，不同用户群共存
---

# 06 · NextFrame vs Remotion

> 一句话：**Remotion 是「用 React 写视频」。NextFrame 是「用 AI 写视频」。表面像，内核完全不同。**

---

## 0. 先澄清关系

- **不是 fork**。NextFrame 不是基于 Remotion 改的。
- **不是模仿**。两者核心概念（帧函数、JSON 时间线）是行业共识，不是谁发明的。
- **是平行竞品**。同一个问题空间（代码化视频生成），不同技术路线、不同用户群。
- **不是替代**。Remotion 活得很好，NextFrame 瞄准 Remotion 够不到的人。

---

## 1. 15 维度对比表

| 维度 | Remotion | NextFrame |
|------|----------|-----------|
| 1. 前端栈 | React + TypeScript | 原生 HTML + JS（零框架） |
| 2. 主要用户 | React 前端工程师 | AI + 不会 React 的人 |
| 3. 后端语言 | Node.js | Rust |
| 4. 桌面壳 | 无（库 + CLI） | Tauri（WebView + Rust） |
| 5. 渲染 | Chromium Headless + FFmpeg 软编 | WKWebView + VideoToolbox 硬编 |
| 6. 并行 | Lambda 云并行（收费） | 本地多 WebView 并行（免费） |
| 7. 出片速率 | 1 ~ 2x 实时（软编） | 1.15x 单线程，N 核线性加速 |
| 8. 字幕同步 | 段落级，无字级 API | **字级同步 + cue 锚点**（vox 深度集成） |
| 9. 中文字体 | 需手动配 | 内建适配 |
| 10. AI 友好度 | 中（React 心智负担大） | **高**（AI 写 HTML/JS 强 5 倍） |
| 11. AI 视频集成 | 无 | **内建**（Sora/Kling/Runway API） |
| 12. 生态模板 | **丰富**（几百个） | 起步（追赶中） |
| 13. 社区 | **大**（10k+ stars） | 小（新项目） |
| 14. 定价 | 免费 + Lambda 按量 | 本地免费 |
| 15. 学习成本 | 中（要会 React） | 低（会 JS 就行） |

---

## 2. Remotion 强在哪

诚实：Remotion 有几个点是 NextFrame 短期内赶不上的。

### 2.1 社区和模板
- 10k+ star，几百个开源模板
- Product Hunt 榜单、知名客户（Fireship、Theo）
- 你要做 YouTube 开场动画，搜模板就能抄

### 2.2 Lambda 云渲染
- `remotion.dev/lambda` 直接把你的代码 push 到 AWS
- 1000 帧并行，分钟级出片
- NextFrame 目前只能本地并行（但本地也够快）

### 2.3 React 生态
- 可以用任何 npm 包：Three.js、Framer Motion、D3、shadcn
- React 状态管理 / Hook 模式对会 React 的人是福音
- 组件复用、HMR、TypeScript 类型检查都是成熟工作流

### 2.4 成熟度
- 2020 年开始做，6 年迭代
- 企业客户、付费订阅、全职团队
- NextFrame 还在 POC 阶段

**如果你已经是 React 熟手，也习惯写 npm 项目，Remotion 对你来说更顺。**

---

## 3. NextFrame 强在哪

Remotion 够不到的地方就是 NextFrame 的切入点。

### 3.1 字级同步（vox 集成）

- vox 是自研 TTS 引擎，出语音 + **字级时间戳**
- NextFrame 的 timeline 直接读 vox 的 cue 文件
- 字幕可以做到字出现的瞬间发声，声音的瞬间字变色
- Remotion 需要手写代码对齐，NextFrame 是**默认行为**

这一点对**中文科普视频**、**3Blue1Brown 风格讲解**是降维打击。

### 3.2 Rust 硬编 + 原生集成

- VideoToolbox 硬件编码，单线程 1.15x 实时
- Remotion 软编平均 0.8x 实时，快一倍多
- NextFrame 走系统 API，macOS 上占用低、温度低、功耗低

### 3.3 不用 React

- AI 写普通 JS 的质量**比写 React 高 5 倍**（见 `07-ai-native.md`）
- 心智负担低：没有 state / hook / fiber / useEffect 陷阱
- AI 不会 hallucinate 不存在的 hook
- 新人 30 分钟就能看懂全部代码

### 3.4 中文优化

- 字体、排版、行间距、标点全部针对中文调过
- 预置中文安全区、字号地板
- 带中文 TTS + 字级同步
- Remotion 是英文世界的工具，中文需要自己踩坑

### 3.5 AI 视频生成集成

- NextFrame 内建 Sora / Kling / Runway / 可灵 API 适配
- `<ai-video prompt="...">` 标签自动调生成 + 落盘 + 插入时间线
- Remotion 不管这一层，得自己接

---

## 4. 我们是在 Remotion 基础上升级吗？

**不是。**

具体说明：
- 代码：一行 Remotion 代码都没抄
- 架构：从底层 Rust + 系统 API 写起，Remotion 是 Node + FFmpeg
- 理念：Remotion 服务 React 开发者，NextFrame 服务 AI
- 时间：两者独立演进，没有合流计划

**相似之处**（都是行业共识，不是谁抄谁）：
- JSON 描述时间线
- 帧函数（t → frame）
- 组合式 scene
- 代码化视频

这些概念 2015 年 After Effects Expression、2018 年 Manim、2020 年 Remotion、2024 年 NextFrame 都有。就像 MVC 不是某家发明的一样。

---

## 5. 共存策略

我们不抢 Remotion 的用户。

| 用户画像 | 推荐 |
|---------|------|
| React 老手，会写 hook | Remotion |
| 公司已在 AWS 体系，要 Lambda | Remotion |
| 需要成熟模板库 | Remotion |
| 英文为主、不在乎中文字体 | Remotion |
| 要做科普/教学视频 | **NextFrame** |
| 让 AI 全程写代码 | **NextFrame** |
| 需要字级同步字幕 | **NextFrame** |
| Mac 本地出片、不想上云 | **NextFrame** |
| 要集成 AI 视频生成 API | **NextFrame** |

**两个工具可以并存。甚至可以把 NextFrame 导出的 MP4 拿进 Remotion 二次剪辑。**

---

## 6. 真实场景对比

### 场景 A：科普讲解（3Blue1Brown 风格）

**Remotion**：
- 手写 React 组件，每个公式一个 `<Formula>`
- 手动对齐字幕和动画，容易错位
- 软编出片慢
- 中文字体需要自己配

**NextFrame**：
- AI 读脚本 → 生成 scene 函数 → vox 出音频 → cue 自动对齐
- 字级同步开箱即用
- 硬编快
- 中文默认好看

**胜者：NextFrame**。

### 场景 B：商业广告 30s

**Remotion**：
- 丰富模板可选
- React 生态的动画库（Framer Motion）
- Lambda 1 分钟出片
- 成熟、稳定

**NextFrame**：
- 模板少，起步阶段
- 原生 CSS 动画做广告够用
- 本地 1 分钟内出片
- 但生态弱

**胜者：Remotion**（目前）。

### 场景 C：数学动画（Manim 式）

**Remotion**：
- 用 React + SVG / Canvas
- 要自己写几何、插值、cue
- 复杂公式渲染要配 KaTeX

**NextFrame**：
- HTML + Canvas + KaTeX 开箱
- AI 写几何代码比 React 顺
- cue 锚点直接对齐讲解

**胜者：NextFrame**（但 Manim 本尊更适合这类）。

---

## 7. 一句话结论

> **Remotion 是给会 React 的人的专业工具。NextFrame 是给 AI 和中文创作者的原生工具。**
>
> 两者解决同一个问题，但赌了不同的未来：Remotion 赌 React 生态继续扩张，NextFrame 赌 AI 写代码会成为主流。

未来 3 年谁对，市场会说话。我们只管做好自己这条路。
