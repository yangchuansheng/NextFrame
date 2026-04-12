---
title: JSON 时间线格式
summary: NextFrame 时间线的完整 JSON schema。多轨道 tracks 数组，每个 track 有 clips 数组，每个 clip 引用一个 scene + 参数。所有编辑操作都是 JSON patch。本文定义字段、一个 10 秒 4 轨道完整示例、编辑操作映射、版本兼容策略。
---

# JSON 时间线格式

## 一句话

**时间线是一个 JSON 对象。人和 AI 都改它，UI 自动同步。**

没有第二份状态。没有数据库。没有 AST。就是一个 JSON。

---

## 顶层 Schema

```json
{
  "version": "1",
  "meta": {
    "title": "我的 AI 视频",
    "createdAt": "2026-04-11T12:00:00Z",
    "fps": 60,
    "width": 1920,
    "height": 1080,
    "duration": 10.0,
    "bgColor": "#000000"
  },
  "assets": [
    { "id": "a1", "path": "assets/ai_clip_1.mp4", "kind": "video" },
    { "id": "a2", "path": "assets/logo.png", "kind": "image" },
    { "id": "a3", "path": "assets/narration.wav", "kind": "audio" }
  ],
  "tracks": [
    { "id": "t1", "name": "bg", "kind": "visual", "clips": [...] },
    { "id": "t2", "name": "main", "kind": "visual", "clips": [...] },
    { "id": "t3", "name": "text", "kind": "visual", "clips": [...] },
    { "id": "t4", "name": "audio", "kind": "audio", "clips": [...] }
  ]
}
```

### 顶层字段

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `version` | ✅ | string | Schema 版本号，当前 "1" |
| `meta` | ✅ | object | 项目元数据 |
| `assets` | ✅ | array | 资产声明列表（可为空） |
| `tracks` | ✅ | array | 轨道列表，顺序 = 渲染顺序（上面盖下面） |

### meta 字段

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `title` | | string | 项目名 |
| `fps` | ✅ | number | 帧率 |
| `width` | ✅ | number | 输出宽度（像素） |
| `height` | ✅ | number | 输出高度 |
| `duration` | ✅ | number | 总时长（秒） |
| `bgColor` | | string | 默认背景色（所有轨道透明时露出） |
| `createdAt` | | string | ISO 时间戳 |
| `updatedAt` | | string | ISO 时间戳 |

---

## Track 结构

```json
{
  "id": "t1",
  "name": "background",
  "kind": "visual",
  "muted": false,
  "locked": false,
  "clips": [
    // ...一堆 clip
  ]
}
```

### Track 字段

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `id` | ✅ | string | 唯一 ID（通常 `t1`、`t2` 或 UUID） |
| `name` | | string | 显示名 |
| `kind` | ✅ | string | `visual` / `audio` |
| `muted` | | bool | 禁用整条轨道 |
| `locked` | | bool | 锁定，UI 不能拖拽 |
| `clips` | ✅ | array | clip 列表，按 `start` 排序 |

### 为什么分 visual 和 audio 两种 kind

- `visual` 走 canvas 合成管线
- `audio` 走 Web Audio 管线
- 两种渲染路径不同，导出时也分开处理
- 但 clip 的字段几乎一样

---

## Clip 结构

```json
{
  "id": "c_abc123",
  "scene": "text",
  "start": 2.0,
  "dur": 3.5,
  "zIndex": 0,
  "locked": false,
  "muted": false,
  "params": {
    "text": "Hello NextFrame",
    "color": "#ffffff",
    "x": 0.5,
    "y": 0.5,
    "anchor": "cc",
    "animIn": { "kind": "fadeIn", "dur": 0.3 }
  }
}
```

### Clip 字段

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `id` | ✅ | string | 唯一 ID |
| `scene` | ✅ | string | scene 名字（必须在 registry 里已注册） |
| `start` | ✅ | number | 起始时间（秒，相对时间线起点 0） |
| `dur` | ✅ | number | 持续时长（秒） |
| `zIndex` | | number | 同一轨道内的 z 序，默认 0 |
| `locked` | | bool | UI 不能拖 |
| `muted` | | bool | 禁用单个 clip |
| `params` | ✅ | object | 传给 scene 函数的参数 |

### start 和 dur 的语义

- Clip 在时间线上**活跃的区间**是 `[start, start + dur)`
- `t < start` 或 `t >= start + dur` 时，scene 不会被调用
- Scene 内部能拿到的相对时间是 `t - start`
- `dur` 可以超过资产本身的长度（video 会循环或定格，取决于 scene 实现）

---

## 完整示例：10 秒 4 轨道 AI 讲解视频

```json
{
  "version": "1",
  "meta": {
    "title": "什么是 Frame-Pure",
    "fps": 60,
    "width": 1920,
    "height": 1080,
    "duration": 10.0,
    "bgColor": "#0a0a0f",
    "createdAt": "2026-04-11T12:00:00Z"
  },
  "assets": [
    { "id": "a1", "path": "assets/ai_bg_nebula.mp4", "kind": "video" },
    { "id": "a2", "path": "assets/code_example.png", "kind": "image" },
    { "id": "a3", "path": "assets/fonts/inter.ttf", "kind": "font" },
    { "id": "a4", "path": "assets/narration.wav", "kind": "audio" }
  ],
  "tracks": [
    {
      "id": "t1",
      "name": "background",
      "kind": "visual",
      "clips": [
        {
          "id": "c_bg_1",
          "scene": "video",
          "start": 0,
          "dur": 10.0,
          "zIndex": 0,
          "params": {
            "src": "assets/ai_bg_nebula.mp4",
            "fit": "cover",
            "opacity": 0.4,
            "volume": 0
          }
        }
      ]
    },
    {
      "id": "t2",
      "name": "main",
      "kind": "visual",
      "clips": [
        {
          "id": "c_title",
          "scene": "titleCard",
          "start": 0,
          "dur": 2.5,
          "zIndex": 10,
          "params": {
            "title": "Frame-Pure",
            "subtitle": "NextFrame 的地基",
            "animIn": { "kind": "fadeIn", "dur": 0.5 },
            "animOut": { "kind": "fadeOut", "dur": 0.3 }
          }
        },
        {
          "id": "c_formula",
          "scene": "text",
          "start": 2.8,
          "dur": 3.2,
          "zIndex": 10,
          "params": {
            "text": "f(t) → frame",
            "fontFamily": "Inter",
            "fontFile": "assets/fonts/inter.ttf",
            "size": 0.15,
            "color": "#ff5a00",
            "weight": 700,
            "x": 0.5,
            "y": 0.5,
            "anchor": "cc",
            "animIn": { "kind": "typeIn", "dur": 0.8 }
          }
        },
        {
          "id": "c_code",
          "scene": "image",
          "start": 6.2,
          "dur": 3.8,
          "zIndex": 10,
          "params": {
            "src": "assets/code_example.png",
            "fit": "contain",
            "x": 0.1,
            "y": 0.2,
            "w": 0.8,
            "h": 0.6,
            "animIn": { "kind": "slideUp", "dur": 0.4 }
          }
        }
      ]
    },
    {
      "id": "t3",
      "name": "lower-third",
      "kind": "visual",
      "clips": [
        {
          "id": "c_l3",
          "scene": "lowerThird",
          "start": 1.5,
          "dur": 8.5,
          "zIndex": 20,
          "params": {
            "title": "NextFrame",
            "subtitle": "AI 原生视频编辑器",
            "style": "velvet"
          }
        }
      ]
    },
    {
      "id": "t4",
      "name": "voiceover",
      "kind": "audio",
      "clips": [
        {
          "id": "c_vo",
          "scene": "audio",
          "start": 0,
          "dur": 10.0,
          "params": {
            "src": "assets/narration.wav",
            "volume": 1.0,
            "fadeIn": 0.2,
            "fadeOut": 0.5
          }
        }
      ]
    }
  ]
}
```

**读解**：
- 第 0-2.5 秒：大标题 + 背景视频 + lowerThird 淡入
- 第 2.8-6.0 秒：中间显示 `f(t) → frame` 公式（打字效果）
- 第 6.2-10.0 秒：代码图从底部滑入
- 整个 10 秒都有旁白

---

## 编辑操作 → JSON 修改映射

所有 UI 编辑和 AI 编辑最终都是在改这份 JSON。这张表是所有操作的字典：

| 操作 | JSON 修改 |
|------|-----------|
| 拖一个 clip 往后 1 秒 | `clip.start += 1` |
| 拉长一个 clip | `clip.dur += delta` |
| 剪切 clip 在 t=3 处 | 分裂：一个 `dur = 3 - start`，新建一个 `start = 3, dur = 原 dur - 3` |
| 删除 clip | `track.clips = track.clips.filter(c => c.id !== id)` |
| 复制 clip | 深拷贝 + 新 ID + push 到同轨道 |
| 移动 clip 到另一条轨道 | 从旧 track.clips 删，push 到新 track.clips |
| 新建轨道 | `tracks.push({ id, name, kind, clips: [] })` |
| 调一个 clip 的音量 | `clip.params.volume = 0.8` |
| 改文字内容 | `clip.params.text = 'new text'` |
| 改淡入时长 | `clip.params.animIn.dur = 0.5` |
| 锁定整条轨道 | `track.locked = true` |
| 整体提速 2x | 所有 clip 的 `start /= 2, dur /= 2`（加上 meta.duration /= 2）|
| 撤销 | 切换到上一个 JSON 快照 |
| 重做 | 切换到下一个 JSON 快照 |

**关键**：每个操作都是"产生一个新的 JSON 对象"（immutable 更新），而不是原地改。这样快照 / undo / diff / 云同步都是免费的。

---

## AI 操作示例

AI 收到指令："把标题放大一倍，颜色改成红色"。

AI 生成的 patch：

```json
[
  { "op": "replace", "path": "/tracks/1/clips/0/params/size", "value": 0.3 },
  { "op": "replace", "path": "/tracks/1/clips/0/params/color", "value": "#ff0000" }
]
```

或者 AI 直接产出完整新 JSON（适合大修改）。引擎 diff 一下、应用、重渲染。

---

## 嵌套 composition（未来）

一个 clip 的 `scene` 可以是 `composition`，指向另一份完整的时间线 JSON：

```json
{
  "id": "c_sub",
  "scene": "composition",
  "start": 0,
  "dur": 5,
  "params": {
    "timeline": {
      "version": "1",
      "meta": { "width": 1920, "height": 1080, "fps": 60, "duration": 5 },
      "tracks": [ /* ... */ ]
    },
    "x": 0.1, "y": 0.1, "w": 0.4, "h": 0.3
  }
}
```

**这是画中画、镜头合成、模板复用的统一解决方案**。初期不实现，设计上留好接口。嵌套 composition 仍然是 frame-pure —— 子时间线的 `renderAt(t)` 是一个纯函数，父级当成一个 scene 调用。

---

## 版本兼容策略

### 原则

1. **只加字段，不改语义**：新字段必须有默认值，老 JSON 不带这个字段时行为等同默认值
2. **不删字段**：老字段如果废弃，标注 `deprecated` 但仍然识别
3. **Major 版本必须提供 migration 工具**：自动把 v1 JSON 转成 v2 JSON

### 当前版本：`"version": "1"`

### Migration 规则

```js
const migrations = {
  '1->2': (json) => {
    // 把 v1 的 xxx 字段改成 v2 的 yyy 字段
    return { ...json, version: '2', /* ... */ }
  }
}

function loadTimeline(json) {
  while (json.version !== CURRENT_VERSION) {
    const migrate = migrations[`${json.version}->${nextVersion(json.version)}`]
    if (!migrate) throw new Error(`No migration from ${json.version}`)
    json = migrate(json)
  }
  return json
}
```

**承诺**：一个项目的 `.nframe.json` 文件在未来所有版本都能打开，要么原生支持要么自动迁移。

---

## 文件格式

- 扩展名：`.nframe.json`
- 编码：UTF-8
- 缩进：2 空格（可读性 > 文件大小）
- **平铺在一个文件里**，不拆多文件
- 大项目（>1MB）用 gzip 压缩成 `.nframe.json.gz`

### 资产跟 JSON 的关系

默认：JSON 文件里的资产路径是相对路径，相对于 JSON 同目录下的 `assets/` 文件夹。

**项目结构**：
```
my-project/
├── project.nframe.json    ← 时间线
└── assets/
    ├── ai_clip_1.mp4
    ├── narration.wav
    └── logo.png
```

**打包**：导出成 `.zip` 带所有资产时，用 `my-project.nframeproj.zip`。

---

## JSON 是契约

这份 schema 是 NextFrame 最核心的对外 API。

- 所有 UI 按这个 schema 读写
- 所有 scene 按这个 schema 读 params
- 所有 AI 指令按这个 schema 产出 patch
- 所有第三方工具（将来）按这个 schema 跟 NextFrame 交换数据

**改 schema 比改代码慎重 10 倍。** 任何字段增删都要走 migration 路线。

---

## 调试技巧

- 遇到问题先 `console.log(JSON.stringify(timeline, null, 2))` 看完整快照
- 每次编辑前存一个快照，坏了回滚
- AI 出错时，让它输出 patch 而不是整份 JSON，便于 diff
- 时间线文件可以直接 Git 版本控制，diff 可读
