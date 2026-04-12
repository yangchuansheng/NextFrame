# 11 · 数据模型 — 完整实体定义

所有实体最终合成为一个 HTML，逐帧可播放、可跳转、可录制。

## 完整 Timeline JSON

```jsonc
{
  // ===== 项目配置 =====
  "schema": "nextframe/v0.3",
  "project": {
    "width": 1920,           // 画布宽（支持 3840 4K）
    "height": 1080,          // 画布高
    "fps": 30,               // 帧率
    "background": "#05050c"  // 全局底色
  },

  // ===== 素材库 =====
  "assets": [
    { "id": "logo",    "kind": "image",    "path": "assets/logo.png" },
    { "id": "bgm",     "kind": "audio",    "path": "assets/bgm.mp3" },
    { "id": "clip1",   "kind": "video",    "path": "assets/demo.mp4" },
    { "id": "sub",     "kind": "subtitle", "path": "assets/sub.srt" },
    { "id": "custom",  "kind": "font",     "path": "assets/CustomFont.woff2" }
  ],

  // ===== 时间标记 =====
  "markers": [
    { "id": "drop",  "name": "Bass Drop", "t": 5.0 },
    { "id": "outro", "name": "Outro",     "t": 25.0 }
  ],
  "chapters": [
    { "id": "ch1", "name": "开场", "start": 0,  "end": 10 },
    { "id": "ch2", "name": "正文", "start": 10, "end": 25 },
    { "id": "ch3", "name": "结尾", "start": 25, "end": 30 }
  ],

  // ===== 多轨道 =====
  "tracks": [

    // ---- 轨道 0: 背景 ----
    {
      "id": "bg",
      "kind": "video",
      "clips": [
        {
          "id": "bg-1",
          "start": 0,                          // 数字 或 SymbolicTime
          "dur": 30,
          "scene": "auroraGradient",           // scene 组件 ID
          "params": {                          // 参数（支持 keyframes）
            "hueA": 255,
            "intensity": { "keys": [[0,0.5],[15,0.9],[30,0.5]], "ease": "easeInOut" }
          },
          "style": {                           // 视觉样式 → 直接映射 CSS
            "blend": "normal"
          }
        }
      ]
    },

    // ---- 轨道 1: 标题 ----
    {
      "id": "title",
      "kind": "video",
      "clips": [
        {
          "id": "title-1",
          "start": 1,
          "dur": 5,
          "scene": "kineticHeadline",
          "params": {
            "text": "NextFrame",
            "subtitle": "AI-Native Video Editor",
            "fontSize": 96
          },
          "style": {
            "enter": "fadeIn 0.8s",            // 进场动画
            "exit": "fadeOut 0.5s",             // 出场动画
            "blend": "normal",
            "filter": "none",
            "position": { "x": "50%", "y": "45%" },  // 定位（预留编辑器拖拽）
            "size": { "w": "80%", "h": "auto" }       // 尺寸
          }
        },
        {
          "id": "title-2",
          "start": { "after": "title-1", "gap": 0.5 },  // SymbolicTime
          "dur": 4,
          "scene": "textOverlay",
          "params": { "text": "第二段标题", "fontSize": 64 },
          "style": {
            "enter": "slideUp 0.6s",
            "exit": "fadeOut 0.4s"
          }
        }
      ],
      "transitions": [                        // 轨道内 clip 间转场
        {
          "from": "title-1",
          "to": "title-2",
          "type": "dissolve",
          "dur": 0.5
        }
      ]
    },

    // ---- 轨道 2: 数据可视化 ----
    {
      "id": "dataviz",
      "kind": "video",
      "clips": [
        {
          "id": "chart-1",
          "start": 8,
          "dur": 7,
          "scene": "barChartReveal",
          "params": {
            "data": [30, 65, 45, 80, 55],
            "labels": ["Q1","Q2","Q3","Q4","YTD"],
            "colors": ["#6ee7ff","#a78bfa","#f472b6","#fb923c","#4ade80"]
          },
          "style": {
            "enter": "scaleIn 0.6s",
            "exit": "fadeOut 0.4s",
            "blend": "normal",
            "filter": "none"
          }
        }
      ]
    },

    // ---- 轨道 3: 装饰层 ----
    {
      "id": "decoration",
      "kind": "video",
      "clips": [
        {
          "id": "rings-1",
          "start": 0,
          "dur": 30,
          "scene": "svgRings",
          "params": { "count": 3, "speed": 0.5 },
          "style": {
            "blend": "screen",                 // 叠加发光
            "opacity": 0.4
          }
        }
      ]
    },

    // ---- 轨道 4: 媒体 ----
    {
      "id": "media",
      "kind": "video",
      "clips": [
        {
          "id": "pip-1",
          "start": 12,
          "dur": 8,
          "scene": "videoClip",
          "params": {
            "assetId": "clip1",
            "clipStart": 5,                    // 素材内偏移
            "fit": "cover"
          },
          "style": {
            "enter": "fadeIn 0.5s",
            "exit": "fadeOut 0.5s",
            "position": { "x": "70%", "y": "70%" },  // 画中画位置
            "size": { "w": "30%", "h": "30%" },       // 画中画大小
            "borderRadius": "12px",
            "boxShadow": "0 8px 32px rgba(0,0,0,0.5)"
          }
        }
      ]
    },

    // ---- 轨道 5: 字幕 ----
    {
      "id": "subtitle",
      "kind": "video",
      "clips": [
        {
          "id": "sub-1",
          "start": 2,
          "dur": 3,
          "scene": "textOverlay",
          "params": { "text": "这是第一句字幕", "fontSize": 36, "anchor": "bottom-center" },
          "style": { "enter": "fadeIn 0.3s", "exit": "fadeOut 0.3s" }
        },
        {
          "id": "sub-2",
          "start": 5.5,
          "dur": 2.5,
          "scene": "textOverlay",
          "params": { "text": "这是第二句字幕", "fontSize": 36, "anchor": "bottom-center" },
          "style": { "enter": "fadeIn 0.3s", "exit": "fadeOut 0.3s" }
        }
      ]
    },

    // ---- 轨道 6: 角标/水印 ----
    {
      "id": "overlay",
      "kind": "video",
      "muted": false,
      "locked": false,
      "solo": false,
      "clips": [
        {
          "id": "badge-1",
          "start": 0,
          "dur": 30,
          "scene": "cornerBadge",
          "params": { "label": "DEMO", "subtitle": "v0.3" },
          "style": { "enter": "fadeIn 0.4s" }
        }
      ]
    },

    // ---- 轨道 7: 音频 ----
    {
      "id": "audio",
      "kind": "audio",
      "clips": [
        {
          "id": "bgm-1",
          "start": 0,
          "dur": 30,
          "params": {
            "assetId": "bgm",
            "volume": 0.6,
            "clipStart": 0,
            "gainAutomation": [
              { "time": 0,  "value": 0 },
              { "time": 2,  "value": 0.6 },
              { "time": 28, "value": 0.6 },
              { "time": 30, "value": 0 }
            ]
          }
        }
      ]
    }
  ]
}
```

## 实体清单

### 1. Project — 画布配置

| 字段 | 类型 | 说明 |
|------|------|------|
| width | number | 画布宽 |
| height | number | 画布高 |
| fps | number | 帧率 |
| background | string | 底色 |

### 2. Asset — 素材

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一 ID，clip 通过 assetId 引用 |
| kind | enum | image / audio / video / subtitle / font |
| path | string | 文件路径 |

HTML 打包时：image → base64 内联，font → @font-face 内联，video → blob URL 或路径。

### 3. Marker — 时间点标记

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一 ID，SymbolicTime 引用 `{ at: "drop" }` |
| name | string | 显示名 |
| t | number | 时间秒 |

### 4. Chapter — 章节

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一 ID |
| name | string | 章节名 |
| start | number | 起始秒 |
| end | number | 结束秒 |

### 5. Track — 轨道

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一 ID |
| kind | enum | `video` / `audio` |
| muted | bool | 静音 |
| locked | bool | 锁定（不可编辑） |
| solo | bool | 独奏（仅渲染此轨道） |
| clips | Clip[] | clip 列表 |
| transitions | Transition[] | 轨道内 clip 间转场 |

HTML 映射：video track → `<div class="track" style="z-index:N">`，audio track → 无 DOM，Web Audio 处理。

### 6. Clip — 片段（核心实体）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一 ID |
| start | number / SymbolicTime | 起始时间 |
| dur | number / SymbolicTime | 持续时间 |
| scene | string | scene 组件 ID |
| params | object | scene 参数（值可以是 Keyframe） |
| style | Style | 视觉样式 |

HTML 映射：`<div class="clip" data-start="..." data-dur="...">`

### 7. Style — 视觉样式（clip 的属性）

| 字段 | CSS 映射 | 说明 |
|------|---------|------|
| enter | opacity + transform | 进场动画：fadeIn / slideUp / slideDown / scaleIn |
| exit | opacity + transform | 出场动画：fadeOut / slideDown / scaleOut |
| blend | mix-blend-mode | normal / screen / lighten / multiply / overlay / darken / difference |
| filter | filter | none / grayscale(1) / sepia(0.8) / blur(4px) / brightness(1.2) / 组合 |
| opacity | opacity | 0-1 |
| position | top + left + transform | 元素定位（编辑器拖拽用） |
| size | width + height | 元素尺寸 |
| borderRadius | border-radius | 圆角 |
| boxShadow | box-shadow | 阴影 |
| clipPath | clip-path | 裁切形状 |
| backdropFilter | backdrop-filter | 背景模糊（毛玻璃） |

**所有 style 字段都支持 Keyframe 动画：**
```json
{ "opacity": { "keys": [[0, 0], [0.5, 1], [4.5, 1], [5, 0]], "ease": "easeInOut" } }
```

### 8. Transition — 转场

| 字段 | 类型 | 说明 |
|------|------|------|
| from | string | 前一个 clip ID |
| to | string | 后一个 clip ID |
| type | enum | dissolve / wipeLeft / wipeRight / wipeUp / wipeDown / zoomIn / zoomOut / slideLeft / slideRight |
| dur | number | 过渡时长（秒） |

HTML 实现：两个 clip 时间重叠 `dur` 秒，前者 opacity 从 1→0，后者从 0→1（dissolve）；或用 clip-path 做 wipe。

### 9. Keyframe — 参数动画

任何 params 或 style 的值都可以替换为 keyframe 对象：

```json
{
  "keys": [[0, 0], [2, 100], [5, 50]],
  "ease": "linear"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| keys | [time, value][] | 时间-值对 |
| ease | enum | linear / easeIn / easeOut / easeInOut / spring |

支持数字插值和颜色插值（hex → RGB 空间）。

### 10. SymbolicTime — 相对时间

clip 的 start/dur 可以用表达式代替数字：

| 表达式 | 含义 |
|--------|------|
| `{ "after": "clip-1", "gap": 0.5 }` | clip-1 结束后 0.5 秒 |
| `{ "before": "clip-2", "gap": 1 }` | clip-2 开始前 1 秒 |
| `{ "at": "marker-id" }` | 对齐到 marker |
| `{ "sync": "clip-3" }` | 跟 clip-3 同时开始 |
| `{ "until": "clip-4" }` | 持续到 clip-4 开始 |
| `{ "offset": "clip-5", "by": 2 }` | clip-5 开始后 2 秒 |

解析时量化到 0.1s 精度。

### 11. Scene — 组件

Scene 不在 timeline JSON 里定义，在代码库里注册。Timeline 通过 `scene` 字段引用 ID。

| 属性 | 说明 |
|------|------|
| id | 唯一标识：`"auroraGradient"` |
| renderType | `canvas` / `dom` / `svg` / `webgl` / `media` |
| fn | 渲染函数 `(localT, params, target) → void` |
| defaultParams | 默认参数 |
| category | Background / Typography / Shapes / DataViz / Overlay / Series / Media |

## 实体关系

```
Project ──1:1──→ background / width / height / fps
   │
   ├── Assets[]      素材库（image/audio/video/subtitle/font）
   ├── Markers[]      时间锚点
   ├── Chapters[]     章节范围
   │
   └── Tracks[]       多轨道
         │
         ├── kind      video / audio
         ├── muted / locked / solo
         ├── Transitions[]    轨道内转场
         │
         └── Clips[]          片段
               │
               ├── scene → Scene 组件（代码库注册）
               ├── params → { 静态值 或 Keyframe }
               ├── style → { enter/exit/blend/filter/opacity/position/... }
               ├── start → 数字 或 SymbolicTime
               └── dur → 数字 或 SymbolicTime
```

## HTML 映射总结

```
Timeline
  └── #stage (project.width × project.height)
        │
        ├── .track[0] (z-index:0)          ← tracks[0]
        │     └── .clip (display:none|block) ← clips[0]
        │           ├── style.mixBlendMode  ← clip.style.blend
        │           ├── style.filter        ← clip.style.filter
        │           ├── style.opacity       ← clip.style.enter/exit 计算
        │           ├── style.transform     ← clip.style.enter/exit 计算
        │           └── <canvas> 或 <div> 或 <svg> 或 <video>  ← scene 内容
        │
        ├── .track[1] (z-index:1)
        │     └── .clip ...
        │
        └── .track[N] (z-index:N)

  + <script>
      renderFrame(t) {
        遍历 track → 遍历 clip → 判断激活 → 解析 keyframe
        → 算 effect → 设 CSS → 渲染 scene
      }
      __onFrame({time}) → renderFrame(t)  // 录制协议
      slider → renderFrame(t)              // 预览拖动
      rAF → renderFrame(t)                 // 预览播放
    </script>
```
