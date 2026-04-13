# NextFrame 竞品调研

> 更新：2026-04-11
> 目的：搞清楚 NextFrame 在现有视频工具地图里站哪、差异化在哪、抄谁的作业、躲谁的坑。

## 一、视频工具地图（按形态分类）

```
                   AI 可操作度
                       ^
                       |
 代码原生：Remotion, Manim, Motion Canvas, NextFrame
                       |
                       |
 GUI 可脚本：After Effects (ExtendScript), DaVinci (Python API)
                       |
                       |
 纯 GUI：    剪映, CapCut, Premiere, Final Cut
                       |
                       +-----------------------------> 普及度
```

NextFrame 的定位：**代码原生 + AI 可写 JSON + 本地 WebView 实时预览 + Rust 硬编录制**。
和 Remotion 最近，和剪映最远。

---

## 二、逐个竞品拆解

### 1. Remotion（React 视频框架）

- **官网**：remotion.dev
- **定位**：用 React 写视频。组件即帧，props 驱动时间。
- **技术栈**：React + TypeScript + Chromium headless + ffmpeg
- **强项**：
  - React 生态复用（Tailwind / Framer Motion / Three.js 能直接塞进视频）
  - Studio 预览器成熟，时间轴可拖拽
  - 有 Lambda 云渲染方案
- **弱项**：
  - 依赖 React 心智模型（组件树、生命周期、hooks 顺序）——AI 生成时要处理大量 React 陷阱
  - 渲染流程重：React → DOM → headless Chrome → ffmpeg，10 分钟视频导出要几分钟
  - 商业许可：公司 > 3 人要付费
- **跟我们的关系**：
  - **最大竞品**。思路几乎一样（组件=纯函数 of t）
  - 我们赢在：**零 React 依赖**（AI 写 JSON 不写 JSX）、**Rust 录制**（硬编更快）、**frame-pure 更纯**（Remotion 组件里照样能写副作用）
  - 我们输在：生态、文档、社区

### 2. Manim（数学动画 Python）

- **官网**：manim.community（社区版），3b1b 原版已停维护
- **定位**：3Blue1Brown 做视频用的数学动画库。Python 代码描述对象和动画。
- **强项**：
  - 数学对象（向量、矩阵、图、公式）直接是一等公民
  - LaTeX 集成完美
  - 科普视频的事实标准
- **弱项**：
  - 慢。渲染极慢（Cairo + ffmpeg）
  - 无实时预览，改一行等 30 秒
  - 不是多媒体框架：做不了字幕、视频嵌入、音频同步
- **跟我们的关系**：
  - **我们要偷它的"对象 + 动画"心智模型**（MObject、Transform、Create）
  - NextFrame 可以做 scene 版的 Manim：`fourier`、`axes`、`matrix` 都是可复用 scene
  - 不正面竞争（它是 Python DSL，我们是 JSON + JS）

### 3. Motion Canvas（TypeScript）

- **官网**：motioncanvas.io
- **定位**：TS 写的 generator 风格动画引擎（`yield* waitFor(1)`）
- **强项**：
  - Generator 语法写动画序列特别顺
  - 内置编辑器不错
  - TS 类型强
- **弱项**：
  - Generator 模型 = 有状态 = **不是 frame-pure**。拖时间轴到任意位置要从头重放
  - 几乎没人用（star 少）
  - 音频同步薄弱
- **跟我们的关系**：
  - **反面教材**。Generator 是"自然语言般"的 DX 但丢了 frame-pure
  - 我们明确走 `f(t) → frame`，不走 generator

### 4. 剪映 / CapCut（字节）

- **定位**：国民级视频剪辑 GUI。剪映中国，CapCut 海外。
- **强项**：
  - AI 一键出字幕、自动卡点、风格转绘
  - 素材库庞大
  - 用户基数最大
- **弱项**：
  - **完全不可脚本化**。AI 连打开都打不开
  - 文件格式封闭，不能 diff、不能版本控制
  - 项目文件 == 黑盒
- **跟我们的关系**：
  - **不是同类产品**。它们服务人类拖拽者，我们服务 AI
  - 剪映已经证明"AI 字幕 + AI 卡点"是刚需 → NextFrame 原生就有
  - 我们的机会：**让 AI 从脚本到成片一次跑完**，剪映做不到

### 5. DaVinci Resolve（专业后期）

- **定位**：调色 + 剪辑 + 音频 + 特效一体。免费版足够专业。
- **强项**：
  - 调色全行业最强（Color 页面）
  - 性能：GPU 加速好
  - 有 Python API（Fusion scripting）
- **弱项**：
  - 学习曲线极陡
  - Python API 文档散乱，AI 写 script 容易出错
  - 项目文件巨大且二进制
- **跟我们的关系**：
  - **不是一回事**。它是电影级后期，我们是 AI 内容生成
  - 但可以偷它的"节点式合成"思路（Fusion）——多轨 scene 其实就是简化版节点图

### 6. After Effects（专业动效）

- **定位**：Adobe 动效工业标准。图层 + 关键帧 + 表达式。
- **强项**：
  - 动效能力最强
  - ExtendScript / JS 表达式可编程
  - 插件生态
- **弱项**：
  - 慢、重、贵
  - `.aep` 二进制，AI 写不出来
  - 渲染要手动，没有云渲染原生方案
- **跟我们的关系**：
  - AE 用户是我们的目标用户之一（想把重复劳动交给 AI 的动效师）
  - 我们提供：AE 的动效能力子集 + JSON 可写 + AI 可调 + 本地快速录制

### 7. Premiere

- **定位**：Adobe 剪辑工具。多轨 + 转场 + 调色。
- **强项**：稳定、行业通用、PR Pro 的生态
- **弱项**：同 AE，AI 不能写
- **跟我们的关系**：**不重叠**。Premiere 做拼素材，NextFrame 做生成素材

---

## 三、AI 视频生成（2026-04 现状）

> 以下数据来自 2026 年 3-4 月 web 搜索和各家发布会

### 文生视频

| 产品 | 公司 | 状态 | 强项 | 弱项 |
|---|---|---|---|---|
| **Kling 3.0** | 快手 | 在售 | ELO 1243，现榜首，中文理解最好 | 英文 prompt 略弱 |
| **Veo 3** | Google DeepMind | 在售 | 物理真实感、镜头运动自然 | 配额少、风控严 |
| **Runway Gen-4** | Runway | 在售 | 电影感、工具链完整 | 贵 |
| **Pika 2.5** | Pika Labs | 在售 | 角色一致性、人物表情 | 时长受限 |
| **Sora** | OpenAI | **已关停（2026-03-24）** | 曾经惊艳 | 被 Kling/Veo 赶超，运营成本压垮 |
| **Hailuo** | MiniMax | 在售 | 便宜 | 质量起伏大 |
| **Vidu** | 生数科技 | 在售 | 国内可控合规 | 与 Kling 差距拉大 |

### 图生视频 / 3D

| 产品 | 用途 | 现状 |
|---|---|---|
| **Stable Zero123** | 图 → 多视角 → 伪 3D | 开源可跑 |
| **Meshy** | 图/文 → 3D 模型 | 商业 SaaS，够用 |
| **TripoSR** | 图 → 3D 极快 | 开源，5 秒一个模型 |

### AI 配音

| 产品 | 强项 | 定位 |
|---|---|---|
| **ElevenLabs** | 英文 + 情感最强，WebSocket streaming | 行业标杆 |
| **Suno v4** | 歌曲生成，有人声 | 音乐方向 |
| **vox**（本地） | 本地 TTS CLI，可脚本化 | NextFrame 配音首选（见 CLI 已知列表） |

---

## 四、跟 NextFrame 的关系总结表

| 类型 | 代表 | 我们抄 | 我们躲 | 竞争烈度 |
|---|---|---|---|---|
| 代码原生视频 | Remotion | 组件即帧、时间作 prop | React 心智负担 | 高 |
| 数学动画 | Manim | 对象模型、科普定位 | Python 慢渲染 | 低 |
| Generator 动画 | Motion Canvas | TS 类型 | 有状态 generator | 低 |
| GUI 剪辑 | 剪映/CapCut | AI 字幕刚需 | GUI 不可脚本 | 不同赛道 |
| 专业后期 | DaVinci/AE/PR | 节点合成、动效能力 | 二进制项目文件 | 不同赛道 |
| 文生视频 | Kling/Veo/Runway | 作素材来源 | 直接对抗 | 互补 |
| AI 配音 | ElevenLabs/vox | 集成为音频源 | 不重做 | 互补 |

---

## 五、差异化立场（给 NextFrame 的定位陈述）

> **"面向 AI 的视频编辑器"**
>
> - 不追 Sora 那种生成式路线（做不过）
> - 不追剪映那种 GUI 路线（AI 不会操作）
> - 走 **Remotion 路线但更纯**：
>   - JSON 而不是 JSX（AI 写 JSON 远比写 React 稳）
>   - frame-pure 严格执行（scene = 纯函数 of t）
>   - Rust 硬编录制（VideoToolbox），速度碾压 headless Chrome + ffmpeg
>   - 本地运行，不吃云 GPU 账单
> - 核心工作流：AI 生成 JSON timeline → WebView 预览 → Rust recorder 导出 mp4
> - 素材来源：本地 scene + AI 生成（Kling/Veo）的短镜头作为二等素材
