# 创意编程与生成式视觉工具调研

> 面向 NextFrame 视频场景生成的创意编程生态全景

---

## 一、Creative Coding 框架

### 1. p5.js
- **URL**: https://github.com/processing/p5.js
- **Stars**: 23.6k
- **一句话**: Processing 的 JS 移植版，Canvas 上的创意编程平台
- **开源**: MIT
- **视觉质量**: 中等。原生 Canvas 2D，无 GPU 加速
- **与 NextFrame 相关性**: 高。大量生成艺术、文字动画、粒子效果示例可复用为场景组件
- **确定性帧渲染**: 可以。可固定随机种子，`draw()` 逐帧执行，输出确定
- **备注**: 生态最大，现有数万个 sketch 可直接移植；2026 年仍在主力维护（p5.js 2.0 beta）

### 2. Processing
- **URL**: https://github.com/processing/processing4 | https://processing.org
- **Stars**: 385（processing4 仓库）
- **一句话**: 创意编程的鼻祖，Java 语言，教育与艺术领域标准工具
- **开源**: GPL/LGPL
- **视觉质量**: 中等。基于 Java2D/OpenGL
- **与 NextFrame 相关性**: 中。大量经典生成艺术算法源自 Processing，可移植到 p5.js/Rust
- **确定性帧渲染**: 是。逐帧 draw() 模型
- **备注**: 本身不适合嵌入，但作为算法参考库价值极高

### 3. openFrameworks
- **URL**: https://github.com/openframeworks/openFrameworks
- **Stars**: 10.4k
- **一句话**: C++ 创意编程工具包，性能最强的开源创意框架
- **开源**: MIT
- **视觉质量**: 高。直接访问 OpenGL，插件支持 3D、物理、CV
- **与 NextFrame 相关性**: 中。Rust 是目标语言，但 oF 的 C++ 算法可逐步翻译；架构思想有参考价值
- **确定性帧渲染**: 是。可离线 headless 渲染

### 4. Nannou
- **URL**: https://github.com/nannou-org/nannou
- **Stars**: 6.6k
- **一句话**: Rust 原生创意编程框架，wgpu 渲染，支持 ISF shader
- **开源**: MIT/Apache-2.0
- **视觉质量**: 高。GPU 渲染，支持复杂 shader
- **与 NextFrame 相关性**: 极高。Rust + wgpu 与 NextFrame 技术栈完全一致；场景绘图 API 可直接借鉴
- **确定性帧渲染**: 是。sketch 模型天然支持逐帧渲染
- **备注**: NextFrame 最近的 Rust 同类，API 设计和渲染模型都值得深度参考

### 5. TouchDesigner
- **URL**: https://derivative.ca
- **Stars**: N/A（商业软件）
- **一句话**: 节点式实时视觉编程，艺术装置/表演/VJing 的行业标准
- **开源**: 否（非商业免费，商业 $600/年）
- **视觉质量**: 极高。GPU 粒子系统、PBR、实时 3D，2025 版支持 NVIDIA 50 系
- **与 NextFrame 相关性**: 中。节点式合成思想可参考，但不可集成
- **确定性帧渲染**: 是（可通过 Movie File Out CHOP 离线输出）
- **备注**: 视觉效果的天花板参考；场景预设可作为 NextFrame 效果目标

### 6. cables.gl
- **URL**: https://cables.gl | https://github.com/cables-gl/cables
- **Stars**: ~480（2025 年开源后）
- **一句话**: 浏览器内 WebGL 节点编辑器，2024 年 MIT 开源
- **开源**: MIT（2024 年 8 月开源）
- **视觉质量**: 高。WebGL shader 节点，实时预览
- **与 NextFrame 相关性**: 中。节点式合成场景的参考设计；部分 GLSL 效果可移植
- **确定性帧渲染**: 可以，通过 export 功能

### 7. Hydra
- **URL**: https://hydra.ojack.xyz | https://github.com/hydra-synth/hydra
- **Stars**: 2.6k
- **一句话**: 浏览器内实时视频合成，模拟模块合成器，基于 WebGL
- **开源**: AGPL-3.0
- **视觉质量**: 中高。纯 shader 流水线，视频信号叠加效果独特
- **与 NextFrame 相关性**: 中。视频信号合成的 API 设计思想有参考价值
- **确定性帧渲染**: 弱，设计为实时交互，离线渲染需额外工作

---

## 二、生成式图形库

### 8. Three.js
- **URL**: https://github.com/mrdoob/three.js
- **Stars**: 112k
- **一句话**: JS 生态最大的 3D 库，WebGL + WebGPU 双后端
- **开源**: MIT
- **视觉质量**: 极高。完整 3D pipeline，PBR 材质，后处理效果
- **与 NextFrame 相关性**: 高。大量场景效果（粒子、文字、几何动画）可作为 NextFrame 组件视觉参考
- **确定性帧渲染**: 是。可通过 renderer.render() 逐帧捕获像素

### 9. PixiJS
- **URL**: https://github.com/pixijs/pixijs
- **Stars**: 45.7k
- **一句话**: 最快的 2D WebGL/WebGPU 渲染器，批处理性能极强
- **开源**: MIT
- **视觉质量**: 高。硬件加速 2D，支持 GPU 粒子、滤镜、混合模式
- **与 NextFrame 相关性**: 高。2D 场景组件（文字动画、图片合成、粒子）的首选参考
- **确定性帧渲染**: 是。`renderer.extract.canvas()` 逐帧导出

### 10. paper.js
- **URL**: https://github.com/paperjs/paper.js
- **Stars**: 15k
- **一句话**: 矢量图形脚本，Canvas 上的完整 SVG 文档模型
- **开源**: MIT
- **视觉质量**: 中高。矢量精确，支持贝塞尔、布尔操作
- **与 NextFrame 相关性**: 中。矢量路径动画、几何生成效果可参考
- **确定性帧渲染**: 是。headless node.js 模式支持离线渲染

### 11. fabric.js
- **URL**: https://github.com/fabricjs/fabric.js
- **Stars**: 31.1k
- **一句话**: 可交互 Canvas 对象模型，SVG 双向转换，WebGL 滤镜
- **开源**: MIT
- **视觉质量**: 中高。Canvas 2D 为主，WebGL 滤镜加速
- **与 NextFrame 相关性**: 中。场景图模型设计有参考价值，对象变换 API 完善
- **确定性帧渲染**: 是。`canvas.toDataURL()` 导出

### 12. Konva.js
- **URL**: https://github.com/konvajs/konva
- **Stars**: 14.3k
- **一句话**: HTML5 Canvas 2D 框架，分层 + 事件系统 + 内置动画
- **开源**: MIT
- **视觉质量**: 中等。Canvas 2D，无 GPU 加速
- **与 NextFrame 相关性**: 中。分层 Canvas 架构与 NextFrame 场景层次概念对齐
- **确定性帧渲染**: 是

### 13. Rough.js
- **URL**: https://github.com/rough-stuff/rough
- **Stars**: 20.9k
- **一句话**: 手绘素描风格的 Canvas/SVG 图形库，< 9kB
- **开源**: MIT
- **视觉质量**: 独特。故意粗糙的手绘风格，与其他库差异化明显
- **与 NextFrame 相关性**: 中低。可作为 NextFrame 的一种"手绘场景"风格组件
- **确定性帧渲染**: 是，但内置随机抖动需固定种子

### 14. Zdog
- **URL**: https://github.com/metafizzy/zdog
- **Stars**: 10.3k
- **一句话**: 伪 3D 扁平圆润风格引擎，用 2D Canvas/SVG 渲染 3D 图形
- **开源**: MIT
- **视觉质量**: 独特。极简圆润的插画 3D 风格
- **与 NextFrame 相关性**: 中低。可作为特定视觉风格的场景组件
- **确定性帧渲染**: 是

---

## 三、Shader / GLSL 工具

### 15. Shadertoy
- **URL**: https://www.shadertoy.com
- **Stars**: N/A（在线平台）
- **一句话**: 全球最大的 GLSL shader 社区，5.2 万+ 公开 shader
- **开源**: shader 作者自定
- **视觉质量**: 极高。纯 GPU 光线步进、分形、程序纹理，视觉上限最高
- **与 NextFrame 相关性**: 极高。大量可直接移植为 NextFrame 场景背景/特效的 shader；多数 shader MIT/CC
- **确定性帧渲染**: 是。uniform `iTime` 为输入，固定时间即固定帧

### 16. Shader Park
- **URL**: https://shaderpark.com | https://github.com/shader-park/shader-park-core
- **Stars**: ~800
- **一句话**: 用 JavaScript 写 2D/3D shader，JS → GLSL 编译
- **开源**: MIT
- **视觉质量**: 高。SDF + PBR，程序式 3D 造型
- **与 NextFrame 相关性**: 高。JS API 写 shader 降低了 GLSL 门槛，场景组件可复用
- **确定性帧渲染**: 是

### 17. lygia
- **URL**: https://github.com/patriciogonzalezvivo/lygia
- **Stars**: 3.3k
- **一句话**: 最大的多语言 shader 函数库（GLSL/HLSL/Metal/WGSL），1800+ 函数
- **开源**: Prosperity License（非商业免费，商业需赞助）
- **视觉质量**: 参考实现级别。包含 noise、SDF、color、filter、lighting 等全类别
- **与 NextFrame 相关性**: 极高。NextFrame shader 效果库的直接素材来源；支持 wgpu/WGSL
- **确定性帧渲染**: 是（纯函数库，无状态）

---

## 四、文字特效 / 排版动画

### 18. SplitType
- **URL**: https://github.com/lukePeavey/SplitType
- **Stars**: 705
- **一句话**: 将 HTML 文字拆分为行/词/字符，配合任何动画库实现文字动画
- **开源**: MIT
- **视觉质量**: 高（取决于配合的动画库）
- **与 NextFrame 相关性**: 极高。视频字幕/标题动画的核心工具；逐字出现、逐行翻转等效果是视频常见需求
- **确定性帧渲染**: 是。操作 DOM，帧由外部动画引擎控制

### 19. Typed.js
- **URL**: https://github.com/mattboldt/typed.js
- **Stars**: 16.2k
- **一句话**: 打字机效果库，字符逐个出现/消失，支持多段文本循环
- **开源**: MIT
- **视觉质量**: 中。简单但经典
- **与 NextFrame 相关性**: 高。视频中打字机效果是高频需求，可直接作为 NextFrame 内置组件
- **确定性帧渲染**: 是（控制速度参数后确定）

### 20. baffle.js
- **URL**: https://github.com/camwiegert/baffle
- **Stars**: ~7k（估算，库本身轻量）
- **一句话**: 文字混淆/解密动画，字符随机置换再还原为正确文字
- **开源**: MIT
- **视觉质量**: 独特。黑客/解密风格，视觉冲击力强
- **与 NextFrame 相关性**: 中高。特定视觉风格（科技/黑客）场景的文字动画组件
- **确定性帧渲染**: 需固定随机种子

---

## 五、滚动 / 交互动画

### 21. GSAP (含 ScrollTrigger)
- **URL**: https://github.com/greensock/GSAP
- **Stars**: 24.4k
- **一句话**: 工业级 JS 动画平台，覆盖 CSS/SVG/Canvas/WebGL，ScrollTrigger 是滚动动画标准
- **开源**: GSAP 核心开源，部分插件需许可（ScrollTrigger 商业需付费）
- **视觉质量**: 极高。补间精度最高，缓动函数最丰富
- **与 NextFrame 相关性**: 极高。GSAP 的 timeline + tween 模型是视频帧动画的完美抽象；大量缓动函数可直接引入
- **确定性帧渲染**: 是。`gsap.ticker.tick()` 可手动步进，帧导出完全确定

### 22. Lenis
- **URL**: https://github.com/darkroomengineering/lenis
- **Stars**: 13.6k
- **一句话**: 轻量高性能平滑滚动库，与 GSAP ScrollTrigger 无缝集成
- **开源**: MIT
- **视觉质量**: 中（仅平滑插值，视觉效果由其他库决定）
- **与 NextFrame 相关性**: 低。滚动驱动动画在视频场景中不适用，但其帧同步设计值得参考
- **确定性帧渲染**: 是

### 23. ScrollMagic
- **URL**: https://github.com/janpaepke/ScrollMagic
- **Stars**: 15k
- **一句话**: 元素相对视口位置触发动画的 JS 库
- **开源**: MIT
- **视觉质量**: 中（依赖动画库）
- **与 NextFrame 相关性**: 低。面向浏览器滚动交互，非视频渲染场景
- **确定性帧渲染**: 否（依赖滚动位置）

### 24. AOS (Animate on Scroll)
- **URL**: https://github.com/michalsnik/aos
- **Stars**: 28.1k
- **一句话**: CSS3 驱动的滚动触发动画，声明式配置，零 JS
- **开源**: MIT
- **视觉质量**: 中低。预设动画种类有限
- **与 NextFrame 相关性**: 低。仅适用于网页场景
- **确定性帧渲染**: 否

---

## 六、音频可视化

### 25. wavesurfer.js
- **URL**: https://github.com/katspaugh/wavesurfer.js
- **Stars**: 10.2k
- **一句话**: 基于 Web Audio API + Canvas 的可交互音频波形播放器
- **开源**: BSD-3-Clause
- **视觉质量**: 中高。波形渲染精细，支持频谱、区域标注
- **与 NextFrame 相关性**: 高。音频波形可视化是视频制作高频需求，可直接作为场景组件
- **确定性帧渲染**: 是。可离线渲染波形为图像

### 26. audioMotion-analyzer
- **URL**: https://github.com/hvianna/audioMotion-analyzer
- **Stars**: 855
- **一句话**: 高分辨率实时频谱分析仪，无依赖，支持 LED/镜像/径向多模式
- **开源**: AGPL-3.0
- **视觉质量**: 高。240 频段，多种视觉模式
- **与 NextFrame 相关性**: 高。音乐视频的频谱可视化组件；支持离线渲染
- **确定性帧渲染**: 是（固定输入数据）

### 27. Meyda
- **URL**: https://github.com/meyda/meyda
- **Stars**: ~1.5k（估算）
- **一句话**: Web Audio API 音频特征提取（RMS/MFCC/音调/亮度），实时 + 离线
- **开源**: MIT
- **视觉质量**: N/A（纯数据，无渲染）
- **与 NextFrame 相关性**: 中高。音频驱动视觉的数据层；提取节拍、能量后驱动场景动画
- **确定性帧渲染**: 是（纯计算，无随机性）

---

## 七、扩展发现：值得关注的工具

### 28. Motion Canvas
- **URL**: https://github.com/motion-canvas/motion-canvas
- **Stars**: 18.4k
- **一句话**: TypeScript 生成器函数驱动的动画视频框架，内置实时编辑器
- **开源**: MIT
- **视觉质量**: 高。矢量动画精确，专为解说视频设计
- **与 NextFrame 相关性**: 极高。**直接竞品/参考对象**；帧驱动动画模型与 NextFrame 几乎完全对齐
- **确定性帧渲染**: 是。核心设计目标之一

### 29. Locomotive Scroll
- **URL**: https://github.com/locomotivemtl/locomotive-scroll
- **Stars**: 8k
- **一句话**: 视差滚动 + 平滑滚动组合库，CSS 声明式配置
- **开源**: MIT
- **与 NextFrame 相关性**: 低。浏览器滚动场景

---

## 最值得 NextFrame 借鉴的 Top 10

| 排名 | 工具 | 借鉴点 | 优先级 |
|------|------|--------|--------|
| 1 | **Nannou** | Rust + wgpu 技术栈完全一致；sketch 模型、逐帧渲染 API；参考其场景绘图接口直接移植 | 立即 |
| 2 | **lygia** | WGSL 函数库直接复用；noise/SDF/filter/color 全覆盖；NextFrame shader 特效的"食材库" | 立即 |
| 3 | **GSAP timeline** | 补间引擎设计；缓动函数库（easeInOut/elastic/bounce）；手动步进帧模型 | 立即 |
| 4 | **Shadertoy** | 数万个 GLSL 效果可移植为场景背景；SDF 粒子/流体/分形效果参考 | 中期 |
| 5 | **PixiJS** | 2D WebGL 批处理架构；sprite/filter/blendMode 设计；场景组件渲染参考 | 中期 |
| 6 | **Motion Canvas** | 帧驱动视频动画模型；TypeScript generator 写动画的 UX；**直接竞品研究** | 立即 |
| 7 | **SplitType + Typed.js** | 文字动画是视频高频需求；拆字/打字机效果直接变成 NextFrame 内置组件 | 中期 |
| 8 | **p5.js 生态** | 数万个生成艺术 sketch 是场景素材库；算法（粒子/流场/L系统）直接翻译为 Rust | 中期 |
| 9 | **wavesurfer.js + audioMotion** | 音频波形/频谱场景组件；音乐视频制作必需 | 中期 |
| 10 | **Shader Park** | JS → GLSL 编译思想；用高级语言写 shader 降低组件开发门槛 | 长期 |

### 核心结论

**NextFrame 场景组件库应该是：Nannou 的 Rust API 设计 + lygia 的 WGSL 函数库 + GSAP 的补间模型 + Shadertoy 效果库 + Motion Canvas 的帧驱动架构**。

不需要集成这些库，而是提取它们最核心的设计模式，用 Rust + wgpu 重新实现，确保：
1. 每个组件输入固定参数 → 输出确定像素（frame-pure）
2. 所有效果可离线渲染，无浏览器依赖
3. AI 可通过 JSON 参数驱动任意效果
