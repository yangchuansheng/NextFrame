# 09 — Rendering Pipeline & Hybrid Architecture

## Context

v0.1 用 napi-canvas CPU 软渲染 + ffmpeg 编码，6 分钟出 10 秒视频。
v0.2 切换到 WKWebView GPU 渲染 + VideoToolbox 硬编，10 秒出 10 秒视频。

核心架构决策：**WKWebView 就是渲染引擎，HTML 页面就是画面。**

## 数据流

```
Timeline JSON
    │
    ▼
harness-gen.js  ── 打包 scene + engine + effects + filters + timeline → 自包含 HTML
    │
    ├──→ 浏览器预览（拖时间轴实时看）
    │
    └──→ WKWebView 加载
              │
              ├── __onFrame({time: t})  逐帧推进
              ├── engine.renderAt()     渲染画面
              ├── CALayer.renderInContext()  同步截图
              ├── VideoToolbox H.264   硬件编码
              └── → MP4 文件
```

## 混合渲染：每个元素选最适合的技术

WKWebView 是完整浏览器内核，一次 CALayer 截图捕获所有图层的最终像素。

| 技术 | 适合的内容 | 优势 |
|------|----------|------|
| Canvas 2D | 渐变、粒子、流体、手绘特效 | 逐像素控制 |
| DOM + CSS | 文字、排版、富文本、CSS 动画 | 系统字体清晰、自动换行、Flex/Grid 布局 |
| SVG | 图表、图标、矢量图形 | 无损缩放、4K 自动清晰 |
| WebGL / WebGPU | 3D、着色器、GPU 粒子 | GPU 直接计算 |
| `<video>` | 视频素材 | 原生解码 |
| `<img>` | 图片素材 | 零额外代码 |

## Timeline JSON 完整结构

```
Timeline
├── project: { width, height, fps }
├── background: "#05050c"
├── assets[]: { id, kind, path }         ← 图片/音频/视频/字幕/字体
├── chapters[]: { id, name, start, end } ← 章节标记
├── markers[]: { id, name, t }           ← 时间点标记
└── tracks[]:                            ← 多轨道，从底到顶渲染
     ├── kind: "video" | "audio"
     ├── muted, locked, solo
     └── clips[]:
          ├── id, start, dur             ← 时间（支持 SymbolicTime）
          ├── scene: "auroraGradient"    ← 场景 ID
          ├── params: { ... }            ← 参数（支持 Keyframes 动画）
          ├── blend: "screen"            ← 混合模式
          ├── effects:                   ← 进出场动画
          │    ├── enter: { type, dur }
          │    └── exit: { type, dur }
          └── filters: ["grayscale"]     ← 后处理滤镜
```

## 渲染管线（一帧的完整流程）

```
1. SymbolicTime 解析   ← 把 { after: "clip-1" } 解析为具体秒数
2. 遍历每条 video track（底→顶）
3.   找出当前时间 t 激活的 clip
4.   Keyframes 解析    ← 把 { keys: [[0,0],[1,100]] } 插值为当前值
5.   Scene 渲染        ← scene(localT, params, offCtx) 画到离屏 canvas
6.   Filters 后处理    ← grayscale/sepia/warmTone/coolTone/filmGrain
7.   Effects 入场/出场 ← fadeIn/slideUp/scaleIn 修改 alpha/transform
8.   Blend 合成        ← ctx.globalCompositeOperation = "lighten"
9.   drawImage 到主画布
10. 重复 2-9 直到所有 track 完成
```

## 同级概念一览

| 概念 | 数量 | 说明 | 代码位置 |
|------|------|------|---------|
| **Scenes** | 39 | 画面原子：aurora、kineticHeadline、barChart... | `src/scenes/`, `runtime/web/src/scenes/` |
| **Effects** | 6 | 进出场动画：fadeIn/Out, slideUp/Down, scaleIn/Out | `src/effects/`, `engine/effects.js` |
| **Filters** | 5 | 色彩后处理：grayscale, sepia, warmTone, coolTone, filmGrain | `src/filters/`, `engine/filters.js` |
| **Blend** | 8 | 混合模式：source-over, lighten, screen, multiply... | `engine/render.js` 内联 |
| **Transitions** | 4 | 片段间过渡：dissolve, wipeLeft, wipeUp, zoomIn | `src/transitions/`（v0.1 未接入） |
| **Keyframes** | - | 参数动画：任何 param 可随时间变化 | `engine/keyframes.js` |
| **SymbolicTime** | - | 时间表达式：after/before/at/sync/until/offset | `engine/time.js` |
| **Assets** | 5 类 | 素材库：image, audio, video, subtitle, font | `src/cli/assets.js` |
| **Audio** | - | 音频轨道 + Web Audio 混音器 | `runtime/web/src/audio/` |
| **Chapters** | - | 章节标记（时间范围） | `engine/time.js` |
| **Markers** | - | 时间点标记 | `engine/time.js` |

## 录制管线

```
harness HTML ──→ WKWebView (GPU canvas)
                    │
                    ├── __onFrame({time}) 推帧
                    ├── __hasFrameChanged(prev, cur) 智能跳帧
                    │    └── 静态 scene 跳过，动画 scene 每帧捕获
                    ├── CALayer.renderInContext() 同步截图 (~5ms)
                    ├── VideoToolbox H.264 硬编
                    └── MP4 输出
```

## ADR: 为什么选 WKWebView 而不是自研渲染引擎

1. 浏览器已整合 DOM/SVG/Canvas/WebGL/WebGPU/Video — 不需要自己做
2. 每个 scene 可以选最适合的技术，不强制统一
3. CALayer 截图 = 截整个页面最终像素，所有技术共存
4. CSS 动画 = 免费的 GPU 加速
5. 系统字体渲染 = 永远清晰（不用自己画文字）
6. 一台全新 Mac 零额外权限就能跑（macOS 内置 WebKit）
