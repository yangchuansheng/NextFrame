# POC-12: Preview Engine — 编辑器内直接渲染

## 背景

NextFrame 视频编辑器。核心能力：timeline JSON → 逐帧渲染 HTML（DOM/Canvas/SVG 混合）。
当前预览方案是 iframe 加载生成的 HTML，但 iframe 有三个硬伤：
1. 跨域（nf:// vs nfdata://）导致外部时间轴控制不了 iframe 内引擎
2. 无法直接拖拽/选中 iframe 内元素
3. 截图需要同源才能拿 contentDocument

## 目标

探索「编辑器主文档直接调 engine-v2 渲染」的可行性和创新方向。

## 引擎核心 API

```js
const engine = createEngine(stageEl, timeline, SCENE_REGISTRY);
engine.renderFrame(2.5);  // 渲染 t=2.5s 的画面
engine.destroy();
```

- stageEl: 一个 div，引擎在里面创建 .nf-layer 子元素
- timeline: JSON，包含 layers/tracks/duration/fps/width/height
- SCENE_REGISTRY: 58 个场景组件（DOM/Canvas/SVG 三种类型）
- renderFrame(t): 纯函数式，给时间点就渲染那一帧

## 关键特性

- 每个 layer 是一个 .nf-layer div（position:absolute）
- 支持 enter/exit 动效（fadeIn/slideUp/scaleIn 等）
- 支持 keyframe 动画插值
- 支持 filter（blur/grayscale）、blend mode
- Canvas 场景每帧重绘，DOM 场景用 normalized time (0~1)

## POC 方向

两个并行探索：

### A: Opus — 直接渲染 + 交互层
在编辑器主文档里直接调 createEngine，上面叠加交互层（选择框、拖拽手柄）。
重点：解决 stage 的缩放适配（1920x1080 缩放到预览区大小）+ 交互层坐标映射。

### B: GPT — 创新预览体验
不限于传统时间轴编辑器思路。探索：
- 帧级别的即时预览有什么新玩法？
- AI 怎么利用 renderFrame(t) 做智能预览？
- 有没有比传统时间轴更好的交互方式？
