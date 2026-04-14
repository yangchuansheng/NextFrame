# 11 · 数据模型 — 最终设计

原则：**AI 一看就会写，扁平简单，但上限够高。**

## Timeline JSON

```jsonc
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "duration": 30,
  "background": "#05050c",

  "assets": [
    { "id": "logo", "kind": "image", "path": "assets/logo.png" },
    { "id": "bgm",  "kind": "audio", "path": "assets/bgm.mp3" }
  ],

  "layers": [
    // 从底到顶排列，越后面越上层
    // 每个 layer = 一层画面，出现在某个时间段
  ]
}
```

## Layer — 唯一核心实体

每个 layer 就是一层画面。所有字段扁平，没有嵌套。

```jsonc
{
  // ===== 必填 =====
  "id": "title-1",
  "scene": "headline",                   // 组件 ID
  "start": 1,                            // 开始时间（秒）
  "dur": 5,                              // 持续时间（秒）

  // ===== 组件参数 =====
  "params": {
    "text": "NextFrame",
    "fontSize": 96,
    "color": "#ffffff"
  },

  // ===== 位置与尺寸（默认全屏） =====
  "x": "50%",                            // 水平位置（center）
  "y": "45%",                            // 垂直位置
  "w": "80%",                            // 宽度
  "h": "auto",                           // 高度
  "anchor": "center",                    // 锚点：center / top-left / bottom-right ...
  "rotation": 0,                         // 旋转角度

  // ===== 视觉样式 =====
  "opacity": 1,                          // 透明度
  "blend": "normal",                     // 混合模式：normal/screen/lighten/multiply/overlay
  "filter": "none",                      // CSS filter：grayscale(1) / sepia(0.8) / blur(4px) / 组合
  "borderRadius": "0",                   // 圆角
  "shadow": "none",                      // 阴影
  "clipPath": "none",                    // 裁切

  // ===== 进出场 =====
  "enter": "fadeIn 0.8s",                // 进场：fadeIn / slideUp / slideDown / slideLeft / slideRight / scaleIn / none
  "exit": "fadeOut 0.5s",                // 出场：fadeOut / slideDown / scaleOut / none

  // ===== 转场（与前一个 layer 衔接） =====
  "transition": "none",                  // dissolve 0.5s / wipeLeft 0.8s / none

  // ===== 高级（可选） =====
  "after": "title-0",                    // 在某个 layer 结束后开始（替代 start 数字）
  "gap": 0.5,                            // after 之后间隔
  "assetId": "logo",                     // 引用素材
  "volume": 0.6,                         // 音频音量
  "muted": false                         // 是否静音
}
```

### 所有字段都支持动画

任何数值/颜色字段可替换为 keyframe：

```jsonc
{
  "opacity": { "keys": [[0, 0], [1, 1], [4, 1], [5, 0]] },
  "x": { "keys": [[0, "10%"], [2, "50%"]], "ease": "easeOut" },
  "rotation": { "keys": [[0, 0], [10, 360]] },
  "params": {
    "fontSize": { "keys": [[0, 48], [2, 96]], "ease": "easeOut" }
  }
}
```

## 完整示例

```jsonc
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "duration": 15,
  "background": "#05050c",
  "layers": [
    // Layer 0: 渐变背景（Canvas）
    {
      "id": "bg",
      "scene": "auroraGradient",
      "start": 0,
      "dur": 15,
      "params": { "hueA": 255, "hueB": 205, "intensity": 0.8 }
    },

    // Layer 1: SVG 装饰环（SVG，半透明叠加）
    {
      "id": "rings",
      "scene": "svgRings",
      "start": 0,
      "dur": 15,
      "params": { "count": 3, "speed": 0.5 },
      "blend": "screen",
      "opacity": 0.4
    },

    // Layer 2: 大标题（DOM 文字）
    {
      "id": "title",
      "scene": "headline",
      "start": 0.5,
      "dur": 6,
      "params": {
        "text": "NextFrame",
        "subtitle": "AI-Native Video Editor",
        "fontSize": 110,
        "gradient": ["#6ee7ff", "#a78bfa", "#f472b6"]
      },
      "enter": "fadeIn 0.8s",
      "exit": "fadeOut 0.5s"
    },

    // Layer 3: 柱状图（SVG）
    {
      "id": "chart",
      "scene": "barChart",
      "start": 4,
      "dur": 5,
      "params": {
        "data": [30, 65, 45, 80, 55],
        "labels": ["Q1", "Q2", "Q3", "Q4", "YTD"],
        "colors": ["#6ee7ff", "#a78bfa", "#f472b6", "#fb923c", "#4ade80"]
      },
      "x": "50%",
      "y": "55%",
      "w": "60%",
      "h": "40%",
      "enter": "slideUp 0.6s",
      "exit": "fadeOut 0.4s"
    },

    // Layer 4: 画中画视频
    {
      "id": "pip",
      "scene": "videoClip",
      "start": 6,
      "dur": 5,
      "assetId": "demo-video",
      "x": "80%",
      "y": "75%",
      "w": "25%",
      "h": "25%",
      "borderRadius": "12px",
      "shadow": "0 8px 32px rgba(0,0,0,0.5)",
      "enter": "scaleIn 0.4s",
      "exit": "fadeOut 0.3s"
    },

    // Layer 5: 字幕
    {
      "id": "sub-1",
      "scene": "text",
      "start": 2,
      "dur": 3,
      "params": { "text": "第一句字幕", "fontSize": 36 },
      "x": "50%",
      "y": "90%",
      "enter": "fadeIn 0.3s",
      "exit": "fadeOut 0.3s"
    },
    {
      "id": "sub-2",
      "scene": "text",
      "start": 5.5,
      "dur": 2.5,
      "params": { "text": "第二句字幕", "fontSize": 36 },
      "x": "50%",
      "y": "90%",
      "enter": "fadeIn 0.3s",
      "exit": "fadeOut 0.3s"
    },

    // Layer 6: 角标（一直显示）
    {
      "id": "badge",
      "scene": "cornerBadge",
      "start": 0,
      "dur": 15,
      "params": { "label": "DEMO", "subtitle": "v0.3" },
      "enter": "fadeIn 0.4s"
    },

    // Layer 7: 背景音乐（音频层）
    {
      "id": "bgm",
      "scene": "audio",
      "start": 0,
      "dur": 15,
      "assetId": "bgm",
      "volume": { "keys": [[0, 0], [2, 0.6], [13, 0.6], [15, 0]] }
    }
  ]
}
```

## Scene 组件规范

每个 scene 组件需要声明：

```js
export default {
  id: "headline",
  type: "dom",                    // dom / canvas / svg / webgl / media / audio
  category: "Typography",        // 分类
  description: "渐变大标题",
  defaultParams: {
    text: "Title",
    fontSize: 96,
    color: "#ffffff",
    gradient: null,
    subtitle: null
  },

  // 创建 DOM 元素（首次）
  create(container, params) {
    const el = document.createElement('div');
    el.innerHTML = `<h1>${params.text}</h1>`;
    container.appendChild(el);
    return el;
  },

  // 每帧更新（localT = 当前 layer 内的时间）
  update(el, localT, params) {
    // 更新动态内容
  },

  // 销毁
  destroy(el) {
    el.remove();
  }
}
```

### Canvas 类型示例

```js
export default {
  id: "auroraGradient",
  type: "canvas",
  defaultParams: { hueA: 255, intensity: 0.8 },

  create(container, params) {
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    container.appendChild(canvas);
    return canvas;
  },

  update(canvas, localT, params) {
    const ctx = canvas.getContext('2d');
    // ... 画渐变 + 粒子
  },

  destroy(canvas) { canvas.remove(); }
}
```

### SVG 类型示例

```js
export default {
  id: "barChart",
  type: "svg",
  defaultParams: { data: [], labels: [], colors: [] },

  create(container, params) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 800 400");
    container.appendChild(svg);
    return svg;
  },

  update(svg, localT, params) {
    // 更新柱子高度（动画 reveal）
  },

  destroy(svg) { svg.remove(); }
}
```

## HTML 映射

```html
<div id="stage" style="width:1920px;height:1080px;position:relative;overflow:hidden;background:#05050c">

  <!-- Layer 0 -->
  <div class="layer" id="layer-bg"
       style="position:absolute;inset:0;z-index:0;display:none">
    <canvas width="1920" height="1080"></canvas>
  </div>

  <!-- Layer 1 -->
  <div class="layer" id="layer-rings"
       style="position:absolute;inset:0;z-index:1;display:none;
              mix-blend-mode:screen;opacity:0.4">
    <svg>...</svg>
  </div>

  <!-- Layer 2 -->
  <div class="layer" id="layer-title"
       style="position:absolute;z-index:2;display:none;
              left:50%;top:45%;width:80%;transform:translate(-50%,-50%)">
    <h1 style="font-size:110px;...">NextFrame</h1>
  </div>

  ...
</div>

<script>
function renderFrame(t) {
  for (const layer of allLayers) {
    const active = t >= layer.start && t < layer.start + layer.dur;
    layer.el.style.display = active ? 'block' : 'none';
    if (!active) continue;

    const localT = t - layer.start;
    applyEnterExit(layer, localT);       // opacity + transform
    resolveKeyframes(layer, localT);     // 动画参数
    layer.scene.update(layer.content, localT, layer.params);
  }
}
</script>
```

## 为什么这个设计好

| 维度 | 设计 | 效果 |
|------|------|------|
| **AI 友好** | 一个 `layers` 数组，扁平字段 | AI 写一个对象就是一层画面 |
| **灵活定位** | x/y/w/h/anchor/rotation | 任何元素可放任何位置 |
| **动画上限** | 所有字段支持 keyframe | 任何属性可随时间变化 |
| **视觉上限** | CSS filter/blend/shadow/clipPath/borderRadius | 浏览器全部 CSS 能力可用 |
| **组件扩展** | scene 注册制，create/update/destroy | 随时加新组件 |
| **播放跳转** | renderFrame(t) 纯函数 | 任意时间点可直接跳转 |
| **录制兼容** | __onFrame 调同一个函数 | 预览和录制完全一致 |
