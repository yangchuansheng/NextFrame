# 演示/幻灯片场景竞品分析

> 分析维度：代码驱动演示、AI 演示生成、视觉叙事/Scrollytelling、动态文档、录屏演示。
> 重点：NextFrame 在演示场景的独特定位。

---

## 一、代码驱动演示工具

### 1. Slidev
- **URL**: https://sli.dev / https://github.com/slidevjs/slidev
- **Stars**: 30,000+
- **定位**: 开发者专属 Markdown 幻灯片框架，Vue 3 驱动
- **输入**: Markdown + 内嵌 Vue 组件
- **输出**: 交互式 HTML，可导出 PDF/PNG，支持演讲者模式
- **开源**: 是（MIT）
- **核心特点**:
  - `---` 分隔幻灯片
  - 内嵌 Vue 组件可做实时演示
  - UnoCSS + Shiki 代码高亮 + Monaco 编辑器（live coding）
  - 2026 版新增实时协作
  - 成为技术大会（Vue/Vite 社区）事实标准
- **与 NextFrame 差距**: 无时间轴/关键帧，不能生成 MP4，无法程序化批量生成视频

### 2. reveal.js
- **URL**: https://revealjs.com / https://github.com/hakimel/reveal.js
- **Stars**: 70,800+（最受欢迎 HTML 演示框架）
- **定位**: HTML 演示框架的开山之作
- **输入**: HTML（支持 Markdown 内容）
- **输出**: 交互式 HTML，PDF 导出
- **开源**: 是（MIT）
- **核心特点**:
  - CSS3 过渡动画，嵌套幻灯片
  - Auto-Animate（自动补间）
  - Scroll View 可变换为滚动浏览模式
  - LaTeX 公式支持
  - 生态庞大（reveal-md 等工具）
- **与 NextFrame 差距**: 交互演示而非视频输出；动画靠 CSS，无法程序化控制帧

### 3. Marp
- **URL**: https://marp.app / https://github.com/marp-team/marp
- **Stars**: 主仓 11,100 / CLI 3,400 / VS Code 插件 2,000
- **定位**: 极简 Markdown → 幻灯片，VS Code 插件一键预览
- **输入**: Markdown（Marp 方言）
- **输出**: HTML / PDF / PPTX
- **开源**: 是（MIT）
- **核心特点**:
  - 设计极简，学习成本最低
  - VS Code 插件：实时预览、直接导出
  - 支持自定义 CSS 主题
  - Marpit 框架可扩展
- **与 NextFrame 差距**: 纯静态输出，无动画关键帧，无视频能力

### 4. mdx-deck
- **URL**: https://github.com/jxnblk/mdx-deck
- **Stars**: ~12,000（已停止主动维护）
- **定位**: MDX（Markdown + JSX）驱动的 React 演示
- **输入**: MDX 文件（Markdown 内嵌 React 组件）
- **输出**: 交互式 HTML，演讲者模式
- **开源**: 是（MIT）
- **核心特点**:
  - 任意 React 组件嵌入幻灯片
  - Theme UI + Emotion 主题系统
  - Appear 组件逐步显示元素
  - Speaker Notes
- **与 NextFrame 差距**: React 生态绑定；维护不活跃；无视频输出

### 5. Spectacle
- **URL**: https://github.com/FormidableLabs/spectacle
- **Stars**: ~9,500
- **定位**: React JSX 语法构建演示，支持代码 live demo
- **输入**: React JSX
- **输出**: 交互式 HTML
- **开源**: 是（MIT）
- **核心特点**:
  - 全 React 组件体系
  - 内置代码演示能力
  - Formidable 维护，持续更新
- **与 NextFrame 差距**: React 强绑定；专注演示交互，非视频/程序化生成

### 6. impress.js
- **URL**: https://impress.js.org / https://github.com/impress/impress.js
- **Stars**: 38,279
- **定位**: Prezi 风格 3D 空间演示框架
- **输入**: HTML（CSS3 变换控制位置/缩放）
- **输出**: 交互式 HTML
- **开源**: 是（MIT）
- **核心特点**:
  - CSS3 3D 变换营造空间感
  - 步骤间飞翔式过渡（类 Prezi）
  - 纯 HTML/CSS 构建
- **与 NextFrame 差距**: 非线性空间布局，不适合时间轴视频

### 7. Bespoke.js
- **URL**: https://github.com/bespokejs/bespoke
- **Stars**: ~5,000（已基本停止维护）
- **定位**: DIY 微框架，核心极小，靠插件扩展
- **输入**: HTML
- **输出**: 交互式 HTML
- **开源**: 是（MIT）
- **核心特点**:
  - 核心仅 1KB
  - 插件架构（导航、主题、动画均为插件）
  - Yeoman 脚手架
- **与 NextFrame 差距**: 已过时；无现代生态支撑

### 8. Motion Canvas
- **URL**: https://motioncanvas.io / https://github.com/motion-canvas/motion-canvas
- **Stars**: ~18,000
- **定位**: 用代码创建程序化动画视频（TypeScript）
- **输入**: TypeScript 场景代码
- **输出**: MP4 视频
- **开源**: 是（MIT）
- **核心特点**:
  - Generator 函数控制时间轴（yield 关键帧）
  - 专为技术讲解视频设计（类 3Blue1Brown 风格）
  - 实时预览 + frame-by-frame 精确控制
- **与 NextFrame 差距**: 最相近的代码优先视频工具；区别：TypeScript 而非 JSON timeline；无 AI 驱动；无 TTS；无批量发布

### 9. Remotion
- **URL**: https://remotion.dev / https://github.com/remotion-dev/remotion
- **Stars**: 23,000+
- **定位**: React 框架 → 程序化视频
- **输入**: React 组件 + JSX
- **输出**: MP4/WebM，支持 AWS Lambda 并行渲染
- **开源**: 部分（核心开源，云渲染付费）
- **核心特点**:
  - 全 CSS/Canvas/SVG/WebGL 可用
  - GitHub Unwrapped 个性化视频用此构建
  - Lambda 并行渲染支持大规模生产
  - 代码可版本控制（Git 工作流）
- **与 NextFrame 差距**: 强 React 绑定；无 JSON timeline 概念；需要会写 React；无端到端 AI pipeline

### 10. Manim
- **URL**: https://manim.community / https://github.com/ManimCommunity/manim
- **Stars**: 31,100+（3Blue1Brown 同款）
- **定位**: Python 数学动画引擎，教学视频神器
- **输入**: Python 代码
- **输出**: MP4 视频
- **开源**: 是（MIT）
- **核心特点**:
  - 精确的数学图形动画（LaTeX、曲线、变换）
  - 3Blue1Brown 系列视频均用此制作
  - ManimCE 社区版持续维护
- **与 NextFrame 差距**: Python 语言；专注数学/教育；无 AI 文稿→视频 pipeline；无 TTS

---

## 二、AI 演示生成工具

### 11. Gamma
- **URL**: https://gamma.app
- **Stars**: N/A（商业 SaaS）
- **定位**: AI 生成演示/文档/网站的一体化平台
- **输入**: 文字 prompt / 上传文档
- **输出**: 交互式 Web 演示（card-based），可导出 PDF/PPTX/Google Slides
- **开源**: 否
- **定价**: 免费（400 credits）/ Plus $8/月 / Pro $15/月
- **核心特点**:
  - 20+ AI 模型自动生成文字、图片、布局
  - Generate API（2026年1月 GA）支持程序化批量创建
  - Remix 功能：一键为新受众改版
  - Studio Mode：电影级视觉叙事（HD 输出）
  - 嵌入 Figma/Miro/Airtable/YouTube
- **与 NextFrame 差距**: 输出是互动 Web，不是视频；AI 偏设计排版，非时间轴动画；有 API 但非代码优先

### 12. Tome
- **URL**: https://tome.app
- **Stars**: N/A（商业 SaaS）
- **定位**: AI 驱动的叙事演示平台，强调故事性
- **输入**: 文字 prompt
- **输出**: 移动端响应式演示，可嵌入 3D/数据/视频
- **开源**: 否
- **核心特点**:
  - 非线性 tile 布局，支持分支叙事流
  - AI 自动生成结构大纲 + 可视化
  - 293+ 业务平台集成
  - 互动分析：追踪受众在哪页停留
- **与 NextFrame 差距**: 演示工具，非视频生产；无时间轴概念；偏销售/商务场景

### 13. Beautiful.ai
- **URL**: https://beautiful.ai
- **Stars**: N/A（商业 SaaS）
- **定位**: 智能布局的 AI 演示工具
- **输入**: 文字 prompt / 上传文档 / URL
- **输出**: 演示稿，导出 PPT/PPTX/PDF/Google Slides
- **开源**: 否
- **定价**: Pro $12/月（年付），Team $40/用户/月
- **核心特点**:
  - Smart Slides 专利：自动调整排版间距对齐
  - 2026 年 3 月重磅功能：先生成文字大纲再设计，减少返工
  - Theme Builder 一键应用品牌风格
- **与 NextFrame 差距**: 输出静态演示稿；无视频/动画能力

### 14. Pitch
- **URL**: https://pitch.com
- **Stars**: N/A（商业 SaaS，200万+团队用户）
- **定位**: 团队协作 + AI 的演示平台
- **输入**: 模板 / AI prompt
- **输出**: 演示稿（线上分享）
- **开源**: 否
- **核心特点**:
  - 实时 + 异步协作（任务分配、版本历史）
  - AI 分析：受众看哪页停留最久
  - CRM/数据集成（销售 pitch 场景）
  - AI Chat Assistant（即将上线）
- **与 NextFrame 差距**: 团队协作演示工具，非视频；偏商务销售场景

### 15. Canva AI
- **URL**: https://canva.com
- **Stars**: N/A（商业 SaaS）
- **定位**: 设计平台 + AI，演示是其中一项
- **输入**: 文字 prompt / 上传内容
- **输出**: 演示稿 / 视频 / 设计稿（多格式导出）
- **开源**: 否（收购 Flourish 整合数据可视化）
- **核心特点**:
  - Magic Design：prompt → 幻灯片
  - Magic Write：AI 写文案
  - Canva Code：prompt → 小游戏/计算器（无需写代码）
  - 2026 新增 Image to Video：照片变视频
  - Edit as Video：演示稿 → 动画视频
- **与 NextFrame 差距**: 全能设计平台；演示→视频能力开始出现但非核心；无程序化 JSON timeline

### 16. SlidesGPT / AI 演示生成 OSS 生态
- **代表项目**:
  - [Presenton](https://github.com/presenton/presenton) — 完全开源（Apache 2.0），Gamma 替代品，有 Docker 部署和桌面 Electron 版
  - [slide-deck-ai](https://github.com/barun-saha/slide-deck-ai) — 用 LLM 生成 PPTX
  - [PPTAgent](https://github.com/icip-cas/PPTAgent) — Agentic 框架：先分析参考演示 → 生成编辑动作
- **共同特点**: 输出 PPTX/HTML 静态演示稿；无动画时间轴；无视频能力

---

## 三、视觉叙事 / Scrollytelling

### 17. Observable
- **URL**: https://observablehq.com
- **Stars**: N/A（平台）
- **定位**: 数据探索和叙事的交互式 Notebook
- **输入**: JavaScript + Markdown + SQL
- **输出**: 交互式 Web 文档（可嵌入任何网站）
- **开源**: 框架部分开源（Observable Plot、D3）
- **核心特点**:
  - Cells 响应式联动（改一个自动重算相关）
  - 内置 D3/Plot 数据可视化
  - Observable Canvases（2026 年重点新品）：本地文件、原生 JS
  - 数据分析 → 故事叙述全流程
- **与 NextFrame 差距**: Web 交互文档，非视频；需要会 JS；偏数据科学场景

### 18. Flourish
- **URL**: https://flourish.studio（已被 Canva 收购）
- **Stars**: N/A
- **定位**: 无代码数据可视化 + 故事叙述
- **输入**: CSV/Excel 数据上传
- **输出**: 交互式可视化（可嵌入网站/演示稿），可导出 PNG/SVG
- **开源**: 否（Canva 生态）
- **核心特点**:
  - 50+ 图表模板，无需编程
  - 内置 Scrollytelling 演示模式
  - Audio-driven stories（声音驱动叙事）
  - Flourish SDK 允许自定义模板
- **与 NextFrame 差距**: 聚焦数据叙事；无时间轴视频；依赖 Canva 生态

### 19. Scrollama
- **URL**: https://github.com/russellsamora/scrollama
- **Stars**: ~5,400
- **定位**: IntersectionObserver 驱动的 Scrollytelling JS 库
- **输入**: JavaScript（事件回调）
- **输出**: 滚动触发交互 Web 页面
- **开源**: 是（MIT）
- **核心特点**:
  - 轻量无依赖
  - 基于 IntersectionObserver，比 scroll 事件性能好
  - 常与 D3 结合做数据叙事
- **与 NextFrame 差距**: 底层工具库；非演示产品；无视频能力

---

## 四、动态文档 / 交互内容

### 20. Typst
- **URL**: https://typst.app / https://github.com/typst/typst
- **Stars**: 45,000+
- **定位**: LaTeX 替代品，标记语言排版系统
- **输入**: .typ 标记文件（类 Markdown + 编程逻辑）
- **输出**: PDF（主），实验性 HTML
- **开源**: 是（Apache 2.0）
- **核心特点**:
  - 比 LaTeX 快 100x（增量编译）
  - 内置编程能力（变量、函数、循环）
  - Set rules / Show rules 控制全局样式
  - VS Code 扩展 + Web IDE，即时预览
- **与 NextFrame 差距**: 输出 PDF 文档，非演示/视频；无动画概念

### 21. Markmap
- **URL**: https://markmap.js.org / https://github.com/markmap/markmap
- **Stars**: ~9,000
- **定位**: Markdown → 交互式思维导图
- **输入**: Markdown（标题层级即节点层级）
- **输出**: SVG 交互式思维导图
- **开源**: 是（MIT）
- **核心特点**:
  - 纯 Markdown 文档即思维导图
  - VS Code 插件、Obsidian 插件
  - MathJax + Prism 代码高亮
  - 支持导出 PNG/SVG/XMind
- **与 NextFrame 差距**: 知识可视化工具，非演示/视频

### 22. Mermaid
- **URL**: https://mermaid.js.org / https://github.com/mermaid-js/mermaid
- **Stars**: 85,000+
- **定位**: Markdown 文本 → 各类图表
- **输入**: 代码块内 Mermaid 语法
- **输出**: SVG 图表（原生 GitHub/Notion/Obsidian 支持）
- **开源**: 是（MIT）
- **核心特点**:
  - 流程图、时序图、甘特图、ER 图等 20+ 类型
  - GitHub 原生渲染（Issues/PR/Markdown 均支持）
  - 2026 新增 Wardley Maps、15 个内置主题
  - 获 Sequoia + Microsoft 投资，8M+ 用户
- **与 NextFrame 差距**: 图表生成，非演示/视频；静态 SVG 输出

### 23. Excalidraw
- **URL**: https://excalidraw.com / https://github.com/excalidraw/excalidraw
- **Stars**: 118,696
- **定位**: 手绘风格虚拟白板
- **输入**: 鼠标绘制
- **输出**: PNG/SVG/JSON，实时协作
- **开源**: 是（MIT）
- **核心特点**:
  - 极简手绘美学
  - 实时多人协作
  - 组件库（社区共享元素）
  - VS Code 插件内嵌
- **与 NextFrame 差距**: 白板/图解工具，非演示/视频

### 24. tldraw
- **URL**: https://tldraw.com / https://github.com/tldraw/tldraw
- **Stars**: 45,795
- **定位**: 开发者友好的白板 SDK，可嵌入产品
- **输入**: 鼠标绘制
- **输出**: 嵌入式白板组件（SDK）
- **开源**: 是（tldraw License）
- **核心特点**:
  - SDK 优先设计，可嵌入任何产品
  - VS Code 插件
  - 比 Excalidraw 更适合作为基础设施
- **与 NextFrame 差距**: 白板 SDK，非演示/视频

---

## 五、录屏演示工具

### 25. Loom
- **URL**: https://loom.com（已被 Atlassian 收购）
- **定位**: 异步视频沟通，一键录制 + 分享
- **输入**: 屏幕录制 + 摄像头
- **输出**: 托管视频（分享链接），可导出 MP4
- **开源**: 否
- **核心特点**:
  - 录制即分享，无需编辑
  - 浏览器插件 + 桌面客户端
  - AI 自动生成标题/摘要
  - Atlassian 生态深度集成（Confluence/Jira）
- **与 NextFrame 差距**: 手工录制，非程序化生成；无时间轴/动画控制

### 26. Screen Studio
- **URL**: https://screen.studio
- **定位**: macOS 专属高质感屏幕录制
- **输入**: 屏幕录制
- **输出**: MP4/GIF
- **开源**: 否（$89 买断）
- **核心特点**:
  - 自动 zoom 跟踪鼠标（产品演示神器）
  - 自动添加 App 窗口圆角阴影
  - macOS Only
  - 2026 评分 4.9/5
- **与 NextFrame 差距**: 手工录制，只录 UI 操作；无程序化生成/动画能力

### 27. OBS Studio
- **URL**: https://obsproject.com / https://github.com/obsproject/obs-studio
- **Stars**: 64,000+
- **定位**: 免费开源流媒体/录制平台
- **输入**: 多路源（屏幕/摄像头/游戏）
- **输出**: MP4/FLV + 直播推流
- **开源**: 是（GPL）
- **核心特点**:
  - 多场景切换，专业直播
  - 插件生态庞大
  - 跨平台（Windows/Mac/Linux）
- **与 NextFrame 差距**: 通用录制/直播；无演示/动画程序化能力

---

## 六、横向对比：输入/输出矩阵

| 工具 | 输入 | 输出 | 可程序化 | 可生成视频 | AI 驱动 | 开源 |
|------|------|------|---------|-----------|---------|------|
| **NextFrame** | JSON timeline | HTML / MP4 | ✅ 完全 | ✅ | ✅（pipeline）| ✅ |
| Slidev | Markdown+Vue | HTML/PDF | 部分 | ❌ | ❌ | ✅ |
| reveal.js | HTML | HTML/PDF | 部分 | ❌ | ❌ | ✅ |
| Marp | Markdown | HTML/PDF/PPTX | ❌ | ❌ | ❌ | ✅ |
| Motion Canvas | TypeScript | MP4 | ✅ | ✅ | ❌ | ✅ |
| Remotion | React JSX | MP4 | ✅ | ✅ | ❌ | 部分 |
| Manim | Python | MP4 | ✅ | ✅ | ❌ | ✅ |
| Gamma | 文字 prompt | Web/PDF/PPTX | ✅ API | ❌（非视频）| ✅ | ❌ |
| Beautiful.ai | 文字 prompt | PPTX/PDF | ❌ | ❌ | ✅ | ❌ |
| Canva AI | prompt/上传 | 多格式+实验视频 | ❌ | 实验性 | ✅ | ❌ |
| Flourish | CSV/数据 | 交互图表 | 部分 | ❌ | ❌ | ❌ |
| Observable | JS+Markdown | 交互 Web | ✅ | ❌ | ❌ | 部分 |
| Typst | .typ 标记 | PDF | ✅ | ❌ | ❌ | ✅ |
| Mermaid | 代码块语法 | SVG 图表 | ✅ | ❌ | ❌ | ✅ |
| Loom | 屏幕录制 | 托管视频 | ❌ | ✅（录制）| ❌ | ❌ |
| Screen Studio | 屏幕录制 | MP4 | ❌ | ✅（录制）| ❌ | ❌ |

---

## 七、NextFrame 在演示场景的定位

### 核心差异化：JSON timeline = 演示的"源代码"

现有演示工具分为两类：
1. **人工交互类**（PowerPoint / Canva / Gamma）：人点点点，AI 帮排版，输出静态演示稿
2. **代码驱动类**（Slidev / reveal.js / Remotion / Motion Canvas）：工程师写代码，输出交互 HTML 或 MP4

NextFrame 的独特之处：**JSON timeline 是任何人（包括 AI）都能写的结构化语言，直接驱动有时间轴的视频输出**。

### NextFrame 能做的演示，竞品做不到

| 场景 | 竞品怎么做 | NextFrame 怎么做 |
|------|-----------|----------------|
| AI 自动生成讲解视频 | Gamma/Tome → 静态幻灯片 | LLM 生成 JSON timeline → 带动画 + TTS 旁白的 MP4 |
| 代码讲解演示 | Slidev（需要会 Vue）| 写 JSON scene → code-reveal 动画视频 |
| 数据报告自动化 | Beautiful.ai（手动）| API 注入数据 → 每日/每周自动生成视频报告 |
| 产品功能演示 | Screen Studio（手工录制）| 定义 UI 演示场景 → 程序化生成，可批量/多语言版 |
| 技术架构讲解 | reveal.js + 手写 | JSON 描述层级 + 时序 → 动画讲解视频 |

### NextFrame 应强化的演示能力

1. **Slide 模式**：支持非连续时间轴（幻灯片跳转模式），不只是线性播放
2. **演讲者模式**：HTML 输出支持 S 键弹出 Speaker Notes（对标 Slidev/reveal.js）
3. **交互式输出**：HTML 版本支持点击跳章节，不只是视频播放
4. **Scrollytelling 场景**：支持滚动触发动画（对标 Flourish/Scrollama）
5. **Markdown → timeline 转换**：Markdown 文档一键生成讲解视频（对标 Marp 的简单性）

### 空白机会

当前没有任何工具同时满足：
- ✅ 代码/JSON 驱动（AI 可生成）
- ✅ 时间轴动画（不是静态幻灯片）
- ✅ 输出视频（MP4 可发布/分享）
- ✅ TTS 语音旁白
- ✅ 批量生产（API 驱动多语言/多版本）

这是 NextFrame 在演示场景的**唯一占位**。Slidev 做到了代码驱动但输出 HTML；Remotion/Motion Canvas 做到了代码→视频但无 JSON/AI 友好；Gamma 做到了 AI 生成但输出静态演示稿且无视频。

---

*分析时间：2026-04-14*
*数据来源：GitHub 公开数据 + 官网 + 行业报告*
