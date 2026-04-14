# WebGL / 3D 视觉特效与高端视觉库全景调研

> 调研时间：2026-04-14 | 覆盖范围：WebGL/Three.js 生态、Shader 库、粒子系统、后处理、3D 设计工具、无代码特效平台、动态背景、CSS 视觉效果、视频专用特效
>
> 对 NextFrame 的意义：找到可直接嵌入 scene 组件的 WebGL/视觉效果技术栈，提升输出视频的电影级质感。

---

## 一、Three.js 本体 + 核心插件

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 简介 |
|------|-------------|---------|---------------|---------|------|
| **Three.js** | [mrdoob/three.js](https://github.com/mrdoob/three.js) | ~102k | MIT | 电影级 | Web 3D 事实标准，WebGL+WebGPU 双后端，r170+ 模块化，生态最完整 |
| **pmndrs/postprocessing** | [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | ~2.5k | MIT | 电影级 | Three.js 后处理核心库，自动合并 Effect Pass，Bloom/DOF/Glitch/SSAO 等 30+ 效果，零性能损耗叠加 |
| **react-postprocessing** | [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) | ~1.2k | MIT | 电影级 | postprocessing 的 R3F 封装，几行 JSX 即可叠加后处理效果 |
| **Three.js EffectComposer** | three.js 内置 addons | 内置 | MIT | 良好 | Three.js 官方后处理通道，基础 BloomPass/GlitchPass/RenderPixelatedPass |

**关键后处理效果清单（postprocessing 库）：**
- **Bloom** — 高光溢出，镜头耀斑感
- **Depth of Field (BokeH)** — 景深虚化，电影感镜头
- **SSAO** — 屏幕空间环境遮蔽，增加立体感阴影
- **Motion Blur** — 运动模糊，动感强化
- **Glitch** — 故障特效，赛博风
- **Color Grading / LUT** — 颜色分级，胶片调色
- **Vignette** — 暗角，增加电影感
- **Chromatic Aberration** — 色差，镜头折射效果
- **Film Grain + Noise** — 胶片颗粒，复古质感
- **Scanlines** — 扫描线，复古 CRT 效果

**性能：** 自动合并 Pass，60fps 可达；离线渲染无上限

**NextFrame 接入方式：** scene 组件内嵌 Three.js renderer → 叠加 postprocessing EffectComposer → WKWebView 截帧输出 PNG → ffmpeg 合成视频

---

## 二、React Three Fiber (R3F) 生态

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 简介 |
|------|-------------|---------|---------------|---------|------|
| **React Three Fiber** | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | ~28k | MIT | 电影级 | Three.js 的 React 渲染器，JSX 写 3D 场景，性能超过原生 Three.js（React Fiber 调度） |
| **Drei** | [pmndrs/drei](https://github.com/pmndrs/drei) | ~9k | MIT | 精品 | R3F 标准组件库：Sky/Stars/Cloud/Environment/Text3D/OrbitControls/Shaders/材质等 100+ 组件 |
| **@react-three/postprocessing** | [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) | ~1.2k | MIT | 电影级 | 后处理组件（同上），JSX 声明式 API |
| **@react-three/rapier** | [pmndrs/react-three-rapier](https://github.com/pmndrs/rapier) | ~3k | MIT | 精品 | Rapier 物理引擎的 R3F 绑定，WASM 加速，刚体/碰撞动态视觉 |
| **@react-three/uikit** | [pmndrs/uikit](https://github.com/pmndrs/uikit) | ~2k | MIT | 精品 | WebGL 内渲染 UI 组件（按钮/面板/文字），全 GPU 渲染 |

**Drei 可直接用于视频场景的组件：**
- `<Stars>` — 粒子星空背景
- `<Cloud>` — 3D 云朵
- `<Sky>` — 程序化天空盒
- `<Environment>` — HDRI 环境光（Poly Haven 素材库集成）
- `<MeshDistortMaterial>` — 扭曲变形材质
- `<MeshWobbleMaterial>` — 波动材质
- `<MeshReflectorMaterial>` — 地面反射材质
- `<Sparkles>` — 金光粒子
- `<Float>` — 漂浮动画
- `<Text3D>` — 3D 文字

**性能：** React Fiber 并发调度，出帧稳定；NextFrame 非 React 架构，直接用 Three.js 更合适

---

## 三、Shader 库

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 简介 |
|------|-------------|---------|---------------|---------|------|
| **LYGIA** | [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | ~4k | Fair Use | 电影级 | 最大跨语言 Shader 库（GLSL/HLSL/WGSL/Metal/CUDA），数百个可复用函数，CDN 直接 import |
| **glslify** | [glslify/glslify](https://github.com/glslify/glslify) | ~2k | MIT | 良好 | GLSL 模块化工具，`#pragma glslify: import(...)` 语法，npm 管理 shader 函数 |
| **glsl-film-grain** | [mattdesl/glsl-film-grain](https://github.com/mattdesl/glsl-film-grain) | ~600 | MIT | 精品 | 自然胶片颗粒噪点 GLSL 实现，基于 noise 函数，电影感必备 |
| **Shadertoy** | [shadertoy.com](https://www.shadertoy.com/) | 社区平台 | 各异（多 MIT） | 电影级 | 全球最大 shader 社区，数万个效果，Film Grain/光晕/流体/分形等均有现成代码 |

**LYGIA 提供的关键函数分类：**
- `color/` — 色彩空间转换、调色、LUT
- `filter/` — 高斯模糊、锐化、边缘检测
- `generative/` — Perlin/Simplex/Voronoi 噪声
- `math/` — SDF、矩阵运算
- `lighting/` — BRDF、PBR 物理光照
- `texture/` — UV 失真、程序化纹理

**NextFrame 接入方式：** 在 scene 组件的 fragmentShader 里 `#include` LYGIA 函数，构建电影级视觉效果

---

## 四、粒子系统

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 性能 | 简介 |
|------|-------------|---------|---------------|---------|------|------|
| **three.quarks** | [Alchemist0823/three.quarks](https://github.com/Alchemist0823/three.quarks) | ~1k | MIT | 精品 | Three.js 通用粒子系统/VFX 引擎，CPU 物理+GPU 渲染（Instancing），支持粒子发射器/曲线控制/碰撞 |
| **three-nebula** | [creativelifeform/three-nebula](https://github.com/creativelifeform/three-nebula) | ~1.5k | MIT | 精品 | WebGL 粒子引擎，可视化设计器，支持物理/行为/区域/发射器 |
| **tsParticles** | [tsparticles/tsparticles](https://github.com/tsparticles/tsparticles) | ~8k | MIT | 良好 | 高度可定制 JS 粒子库，支持烟花/雪花/confetti，React/Vue/Angular 组件化 |
| **Drei Sparkles** | drei 内置 | - | MIT | 精品 | Three.js/R3F 金光粒子，GPU 渲染，一行代码 |

**three.quarks 提供的特效：**
- 火焰、爆炸、烟雾、魔法粒子、星尘、轨迹拖尾、发光环
- 支持 Bezier 曲线运动、颜色渐变、大小随时间变化
- GPU Instancing，数万粒子 60fps

**NextFrame 接入方式：** three.quarks 系统 JSON 可序列化 → 嵌入 timeline layer → 渲染时实例化 ParticleSystem

---

## 五、3D 设计工具（可视化建模 + 一键嵌入）

| 工具 | URL | 价格 | 开源 | 视觉质量 | 简介 |
|------|-----|------|------|---------|------|
| **Spline** | [spline.design](https://spline.design/) | 免费/$15+/月 | 否（商业工具） | 电影级 | 浏览器 3D 设计工具，物理/雕刻/动画/交互，GLTF/USDZ/JS 导出，Webflow/Framer 原生集成 |
| **Vectary** | [vectary.com](https://www.vectary.com/) | 免费/$12+/月 | 否 | 精品 | 在线 3D+AR 设计平台，embed 代码一键生成，Three.js 兼容，实时协作 |
| **Womp** | [womp.com](https://womp.com/) | 免费/付费 | 否 | 良好 | Figma 风格的 3D 建模，极低学习曲线，预制素材库，适合快速出效果图 |
| **PlayCanvas** | [playcanvas.com](https://playcanvas.com/) | 免费/付费 | MIT（引擎） | 电影级 | WebGL+WebGPU 游戏引擎，10k stars，云编辑器+实体组件系统，微软/Snap/Disney 使用 |

**Spline 对 NextFrame 的启示：** 允许将 3D 场景导出为 JS 片段直接嵌入，NextFrame 可提供类似的"3D 素材嵌入" scene 类型

**PlayCanvas 引擎特性（作为纯代码库使用）：**
- WebGPU 优先，WebGL fallback
- 物理基础渲染（PBR），HDR，实时阴影
- Draco/Basis 压缩，GLTF 2.0 流式加载
- MIT 开源，可直接集成不需要付费

---

## 六、无代码 WebGL 动效平台

| 工具 | URL | 价格 | 开源 | 视觉质量 | 简介 |
|------|-----|------|------|---------|------|
| **Unicorn Studio** | [unicorn.studio](https://www.unicorn.studio/) | 付费 SaaS | 否 | 电影级 | 无代码 WebGL 特效平台，60+ Shader 效果，Figma 式图层操作，36kb 嵌入运行时，支持 Scroll/Hover 交互 |
| **Rive** | [rive.app](https://rive.app/) | 免费/$45/月 | 运行时 MIT | 精品 | 交互动画引擎，State Machine 驱动，.riv 格式，WASM 运行时，跨平台（Web/iOS/Android/Flutter） |
| **LottieFiles / lottie-web** | [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | 免费 | MIT（30k ⭐） | 良好 | AE 导出 JSON 播放，矢量动画，dotLottie 压缩格式，LottieFiles 素材市场丰富 |
| **SVGator** | [svgator.com](https://www.svgator.com/) | 免费/付费 | 否 | 良好 | 浏览器 SVG 动画编辑器，支持导出 Lottie JSON，文件体积压缩 70%，无限免费导出 |

**Unicorn Studio 核心差异：**
- 不用写 Shader，设计师直接操作
- 支持视频/图片/文字/形状图层叠加 WebGL 效果
- 可导出代码、图片、视频三种格式
- 认定为 2025 年"2D WebGL 最强无代码平台"

**Rive 对 NextFrame 的启示：** State Machine 动画 = 可被数据驱动，AI 可指令化控制动画状态

---

## 七、动态背景库

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 简介 |
|------|-------------|---------|---------------|---------|------|
| **Vanta.js** | [tengbao/vanta](https://github.com/tengbao/vanta) | ~6.5k | MIT | 精品 | 基于 Three.js/p5.js，13 种动态 3D 背景（Birds/Waves/Globe/Dots/Rings/Halo 等），120kb gzip，鼠标交互 |
| **tsParticles** | [tsparticles/tsparticles](https://github.com/tsparticles/tsparticles) | ~8k | MIT | 良好 | 粒子/烟花/雪花动态背景，插件化，React/Vue/Angular/Svelte 组件 |
| **particles.js** | [VincentGarreau/particles.js](https://github.com/VincentGarreau/particles.js) | ~29k | MIT | 基础 | 经典粒子背景，轻量，但已少维护，tsParticles 是它的继任者 |
| **auroral** | [LunarLogic/auroral](https://github.com/LunarLogic/auroral) | ~200 | MIT | 精品 | 纯 CSS 极光渐变背景动画，零 JS 依赖 |

**Vanta.js 效果列表（13 种）：**
Birds, Cells, Clouds, Clouds2, Dots, Fog, Globe, Halo, Net, Rings, Topology, Trunk, Waves

---

## 八、CSS / 高端视觉效果

| 效果类型 | 代表方案 | 技术路径 | 视觉质量 |
|---------|---------|---------|---------|
| **Glassmorphism 玻璃拟物** | `backdrop-filter: blur()` + CSS | 纯 CSS，SVG feTurbulence 增加液态玻璃质感 | 精品 |
| **Aurora 极光渐变** | `@mawtech/glass-ui`, `auroral` | CSS `@keyframes` + conic-gradient | 精品 |
| **Noise / Grain 颗粒** | `grained.js`, GLSL film grain | CSS SVG filter 或 WebGL shader | 精品 |
| **Frosted Glass 磨砂玻璃** | CSS `backdrop-filter: blur(20px) saturate(180%)` | 纯 CSS，iOS 风格 | 精品 |
| **Chromatic Aberration 色差** | postprocessing ChromaticAberration Pass | WebGL shader | 电影级 |
| **Vignette 暗角** | postprocessing VignetteEffect | WebGL shader | 电影级 |
| **液态 Liquid Glass** | CSS `feTurbulence` + `feDisplacementMap` SVG filter | SVG filter + CSS | 精品 |

**2025 趋势：**
- Apple visionOS 推动液态玻璃（Liquid Glass）效果流行
- 极光背景 + 玻璃拟物组合成为品牌落地页标配
- Grain/Noise overlay 已成为高端视频的必备质感层

---

## 九、视频特效专用

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 可否用于视频渲染 | 简介 |
|------|-------------|---------|---------------|---------|----------------|------|
| **Pixi.js** | [pixijs/pixijs](https://github.com/pixijs/pixijs) | ~45k | MIT | 精品 | 最快的 2D WebGL 渲染器，PixiJS Filters 库含 30+ 特效滤镜，游戏/视频叠层首选 |
| **VFX-JS** | [fand/vfx-js](https://github.com/fand/vfx-js) | ~1.5k | MIT | 精品 | 把 WebGL 特效绑定到任意 DOM 元素（img/video/div），2025 年 Codrops 推荐，支持自定义 Shader |
| **Curtains.js** | [martinlaxenaire/curtainsjs](https://github.com/martinlaxenaire/curtainsjs) | ~1.2k | MIT | 精品 | 将 HTML 元素（图片/视频）转为 WebGL 纹理平面，Scroll 动态扭曲/溶解/波纹，v8.1，WebGPU 继任版 gpu-curtains 在开发 |
| **BBC VideoContext** | [bbc/VideoContext](https://github.com/bbc/VideoContext) | ~1.8k | Apache-2.0 | 良好 | HTML5+WebGL 视频合成 API，视频序列+着色器链，灵感来自 Web Audio API，BBC R&D 出品 |
| **p5.js** | [processing/p5.js](https://github.com/processing/p5.js) | ~22k | LGPL | 良好 | 创意编程库，像素级视频操作，手绘风、生成艺术，教育向 |
| **Rough.js** | [rough-stuff/rough](https://github.com/rough-stuff/rough) | ~21k | MIT | 基础 | 手绘/素描风格渲染库，给形状/文字加手绘笔触，独特美学风格 |
| **Two.js** | [jonobr1/two.js](https://github.com/jonobr1/two.js) | ~8.6k | MIT | 良好 | 渲染器无关的 2D API，支持 SVG/Canvas/WebGL 三后端，2D 场景编排 |

**Pixi.js Filters 库效果清单（30+）：**
Bloom, Blur, Bevel, Bulge, Color Map, CRT, Dot, Drop Shadow, Emboss, Glitch, Glow, Grayscale, HLS, Kawase Blur, Motion Blur, Multi Color Replace, Noise, Old Film, Outline, Pixelate, Radial Blur, Reflection, RGB Split, Shockwave, Simple Lightmap, Simplexnoise, Tilt Shift, Twist, Zoom Blur

**VFX-JS 示例效果：**
- 图片悬停时产生流体扭曲
- 视频播放时叠加彩色噪点
- DOM 元素出现/消失时 Shader 过渡动画
- 自定义 GLSL Shader 直接绑定到 `<video>` 标签

---

## 十、设计灵感与风向标

| 来源 | URL | 说明 |
|------|-----|------|
| **Awwwards WebGL 专区** | [awwwards.com/websites/webgl](https://www.awwwards.com/websites/webgl/) | 全球最顶级 WebGL 站点合集，技术 + 美学双标杆 |
| **Codrops** | [tympanus.net/codrops/tag/webgl](https://tympanus.net/codrops/tag/webgl/) | 高质量 WebGL/Shader 教程 + 开源 Demo，2025 年聚焦图像转场/VFX-JS/流体 |
| **Shadertoy** | [shadertoy.com](https://www.shadertoy.com/) | Shader 代码社区，数万免费实现，Film Grain/流体/分形/光晕等全有 |
| **Bruno Simon 2025 作品集** | [bruno-simon.com](https://bruno-simon.com/) | 2026.1 Awwwards 月度最佳，Three.js 构建的 3D 可驾驶场景，业界标杆 |

**2025 Awwwards 年度最佳：** Messenger WebGL 小星球获 Site of the Year 2025，完全 GPU 驱动，物理+光照+动画媲美主机游戏

---

## 十一、GSAP + WebGL 配合

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 视觉质量 | 简介 |
|------|-------------|---------|---------------|---------|------|
| **GSAP** | [greensock/GSAP](https://github.com/greensock/GSAP) | ~24k | 免费（含所有插件） | 电影级 | 2025 年完全免费，包含 ScrollTrigger/SplitText/MorphSVG，12M+ 站点使用，20x 快于 jQuery |

**GSAP + WebGL 黄金组合：**
- GSAP 负责时间轴/缓动/Scroll 事件 → 驱动 Three.js 相机/材质参数
- Three.js/WebGL 负责视觉渲染
- 两者配合实现 Awwwards 级别的滚动驱动 3D 叙事

---

## 十二、最小化 WebGL 库（底层控制）

| 工具 | GitHub / URL | ⭐ Stars | 开源 / License | 简介 |
|------|-------------|---------|---------------|------|
| **OGL** | [oframe/ogl](https://github.com/oframe/ogl) | ~4k | MIT | 最小 WebGL 抽象层，API 类似 Three.js 但更轻量，零依赖，适合自定义 Shader 场景 |
| **regl** | [regl-project/regl](https://github.com/regl-project/regl) | ~4.8k | MIT | 函数式无状态 WebGL，声明式 API，适合数据可视化和定制特效 |
| **wgpu (Rust)** | [gfx-rs/wgpu](https://github.com/gfx-rs/wgpu) | ~14k | MIT/Apache | 跨平台纯 Rust 图形 API，Vulkan/Metal/D3D12/WebGPU，性能比 WebGL 高 10x，NextFrame 服务端渲染首选 |

**wgpu 对 NextFrame 渲染管线的意义：**
- 服务端离线渲染（非浏览器）可用 wgpu 直接调 Metal（macOS），完全绕过浏览器
- 渲染性能是 WebGL 的 10x，理论帧率可达数百 fps
- WKWebView 方案 = WebGL；服务端方案 = wgpu，两条路径

---

## 十三、程序化动画 / 代码视频工具（竞品视角）

| 工具 | GitHub / URL | ⭐ Stars | License | 视觉质量 | 简介 |
|------|-------------|---------|---------|---------|------|
| **Remotion** | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | ~22k | 商业需付费 | 精品 | React 写视频，CSS/Canvas/SVG/WebGL 全支持，Chrome 渲染，与 NextFrame 直接竞争 |
| **Motion Canvas** | [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | ~17k | MIT | 精品 | TypeScript 命令式动画，Canvas API，适合信息动画/技术演示，同步配音 |

**与 NextFrame 的差异：**
- Remotion/Motion Canvas = 代码写动画 → 人工编程
- NextFrame = JSON timeline → AI 生成 → 零编程

---

## NextFrame 可直接借鉴

### 立即可用的技术方案

| 优先级 | 技术 | 用途 | 接入方式 |
|--------|------|------|---------|
| 🔴 高 | **pmndrs/postprocessing** | 所有 scene 组件叠加后处理特效（Bloom/DOF/FilmGrain/Vignette） | Three.js renderer → EffectComposer → 截帧 |
| 🔴 高 | **LYGIA shader 库** | scene 组件自定义 fragmentShader（颜色渐变/噪声/光效/LUT） | CDN import lygia.xyz/resolve.js |
| 🔴 高 | **glsl-film-grain** | 所有视频输出叠加胶片颗粒质感层 | fragmentShader #include |
| 🟡 中 | **three.quarks** | 粒子特效 scene（烟花/星尘/魔法/火焰） | JSON 序列化粒子系统参数 → timeline layer |
| 🟡 中 | **Vanta.js** | 动态背景 scene（Birds/Waves/Globe/Rings） | scene 组件 wrap Vanta 初始化 |
| 🟡 中 | **VFX-JS** | 给视频 scene 里的 `<video>` 元素叠加 WebGL 滤镜 | `<vfx-img shader="...">` 绑定 DOM |
| 🟡 中 | **Pixi.js Filters** | 2D 图层特效（Glow/MotionBlur/OldFilm/Glitch/TiltShift） | PixiJS 作为 2D 合成层叠加在 Three.js 上方 |
| 🟢 低 | **Curtains.js / gpu-curtains** | 图片/视频入场扭曲过渡效果 | WebGL 纹理平面 + Shader 过渡 |
| 🟢 低 | **BBC VideoContext** | 多视频流 + Shader 合成（多画面 PIP 场景） | VideoContext graph → WebGL 合成 → 截帧 |

### 电影级质感公式（可立即为 NextFrame 实现）

```
电影级帧 = 基础场景内容
         + Bloom（高光溢出）
         + Film Grain（胶片颗粒）  ← LYGIA / glsl-film-grain
         + Vignette（暗角）
         + Color LUT（调色）       ← LYGIA color/lut
         + Chromatic Aberration（色差，可选）
         + Depth of Field（景深，3D 场景）
```

### scene 组件类型扩展建议

基于本次调研，NextFrame 可新增以下 scene 组件类型：

1. **`webgl-particle`** — 基于 three.quarks，参数化粒子特效（fire/smoke/magic/stardust）
2. **`webgl-background`** — 基于 Vanta.js，13 种动态 3D 背景
3. **`postprocess-overlay`** — 基于 pmndrs/postprocessing，后处理叠加层（Bloom+Grain+Vignette 三件套）
4. **`shader-transition`** — 基于 Curtains.js，场景切换时的 Shader 过渡
5. **`3d-scene`** — 基于 Three.js + Drei，标准 PBR 3D 场景（Sky+Environment+Model）
6. **`lottie-layer`** — 基于 lottie-web，AE 导出 JSON 直接嵌入 timeline
