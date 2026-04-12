---
title: NextFrame Data Flow
summary: JSON 是 single source of truth。所有 UI 操作经过"修改 JSON → renderAt(t) → 画面更新"的闭环。撤销重做 = JSON 快照栈。拖拽实时预览、提交时写回。
---

# NextFrame Data Flow

## 一句话

**JSON 是一切。UI 是 JSON 的投影，渲染是 JSON 的函数，历史是 JSON 的快照。**

---

## 1. 核心原则：JSON is the single source of truth

### 什么意思

- 整个项目的状态用一个 JSON 对象描述（下文称 `project`）
- UI 不持有独立状态（除了临时交互态：hover、drag 中间值）
- 画面任意时刻 t 的内容 = `render(project, t)`
- 撤销/重做 = 切换 `project` 快照
- 保存 = 把 `project` 写磁盘
- 加载 = 读磁盘反序列化 `project`
- 协作 = 多人同时 patch `project`
- AI 操作 = 生成 `project` diff 并应用

### 为什么

| 方案 | 问题 |
|------|------|
| 响应式 store（MobX / Redux / Zustand）| 状态分散，撤销复杂，AI 难以整体看懂 |
| DOM 即状态（jQuery 式）| 无法 headless 渲染，AI 无法操作 |
| **单一 JSON**（NextFrame 选择） | AI 可读可写、frame-pure、撤销简单、协作友好 |

---

## 2. project JSON 结构（示意）

```json
{
  "version": "1.0",
  "meta": {
    "id": "proj-abc123",
    "name": "我的视频",
    "fps": 60,
    "resolution": [1920, 1080],
    "duration": 30.0,
    "created": "2026-04-11T10:00:00Z",
    "updated": "2026-04-11T10:05:00Z"
  },
  "assets": [
    { "id": "a1", "type": "video", "path": "assets/clip1.mp4", "duration": 5.0 },
    { "id": "a2", "type": "audio", "path": "assets/bgm.mp3", "duration": 120 }
  ],
  "tracks": [
    {
      "id": "v1", "type": "video", "name": "主视频",
      "muted": false, "locked": false, "visible": true,
      "clips": [
        {
          "id": "c1",
          "scene": "video",
          "start": 0.0,
          "duration": 5.0,
          "params": { "assetId": "a1", "volume": 1.0 }
        },
        {
          "id": "c2",
          "scene": "text",
          "start": 5.0,
          "duration": 3.0,
          "params": { "text": "Hello", "font": "Inter", "size": 72 }
        }
      ]
    },
    {
      "id": "a1", "type": "audio", "clips": [
        { "id": "c3", "scene": "bgm", "start": 0, "duration": 30,
          "params": { "assetId": "a2", "volume": 0.4 } }
      ]
    }
  ],
  "selection": ["c1"],
  "playhead": 2.5
}
```

### 关键字段

| 字段 | 说明 |
|------|------|
| `meta.fps` | 所有时间换算的基准 |
| `assets[]` | 外部资源引用表，clip 通过 `params.assetId` 引用 |
| `tracks[]` | 有序数组，index 0 = 最底层 |
| `clip.scene` | scene 注册表里的 id |
| `clip.params` | 该 scene 需要的所有参数 |
| `selection` | 当前选中的 clip id 数组 |
| `playhead` | 播放头位置（秒），UI 状态也放 JSON 里（为了可协作 + AI 可观测）|

---

## 3. 操作环路

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   用户操作   │──────▶│  patch JSON │──────▶│  renderAt(t) │
│   / AI CLI  │       │              │       │              │
└─────────────┘       └──────┬───────┘       └──────┬───────┘
                             │                      │
                             ▼                      ▼
                      ┌─────────────┐        ┌─────────────┐
                      │  push 快照  │        │  DOM 更新   │
                      │  到 history │        │  预览画面   │
                      └─────────────┘        └─────────────┘
```

### 规则

1. **所有修改通过 patch**：不能直接赋值 `project.tracks[0]`，必须 `applyPatch(project, patch)`
2. **patch = 命令**：每个 patch 是一个可序列化的对象，AI 和 UI 用同一套 patch 描述语言
3. **patch 之后**：同步触发 `renderAt(playhead)` 刷新预览
4. **每个有意义的 patch 入栈 history**：拖拽过程中不入栈，mouseup 才入栈

### patch 示例

```json
{ "op": "update", "path": "tracks[0].clips[1].params.text", "value": "World" }
{ "op": "insert", "path": "tracks[0].clips", "index": 2, "value": { ... } }
{ "op": "delete", "path": "tracks[0].clips[0]" }
{ "op": "move",   "from": "tracks[0].clips[1]", "to": "tracks[1].clips[0]" }
```

---

## 4. renderAt(t)：纯函数渲染

```
renderAt(project, t) → HTMLElement
```

### 步骤

1. 找出所有在 `t` 时刻活跃的 clip：`clip.start <= t < clip.start + clip.duration`
2. 按 track 顺序（从底到顶）堆叠
3. 对每个 clip 调用对应 scene 的 `render(t - clip.start, clip.params)`
4. 用绝对定位叠在预览区
5. 处理转场 scene：如果 `t` 落在转场区间，混合前后两个 clip

### frame-pure 保证

- 任意 t 可独立计算，不需要从 0 跑到 t
- 换言之：`renderAt(p, 10.5) === renderAt(p, 10.5)`，跟之前看过什么帧无关
- 这是"拖拽预览丝滑" + "并行多 WebView 渲染"的前提

---

## 5. 撤销/重做（History）

### 数据结构

```js
history = {
  stack: [snap0, snap1, snap2, snap3],  // 全量快照
  cursor: 3                              // 当前位置
}
```

- 每个 snapshot = 一个完整的 `project` JSON（深拷贝）
- 撤销：`cursor--`，加载 `stack[cursor]`
- 重做：`cursor++`，加载 `stack[cursor]`
- 新操作：截断 `stack[cursor+1:]`，追加新快照

### 优化

| 问题 | 方案 |
|------|------|
| 内存大 | 用 [immer](https://immerjs.github.io) 或类似库做结构共享，或保存 patch 序列 + 定期 checkpoint |
| 拖拽产生海量快照 | 拖拽中不入栈，只 mouseup 时入栈一次 |
| 文字输入 | debounce 500ms 才入栈 |

### 栈容量

默认 200 步，超了丢最老的。可在设置里调。

---

## 6. 拖拽交互：实时 vs 提交时

### 两阶段策略

| 阶段 | 做什么 | JSON |
|------|--------|------|
| **drag start** | 记录起始值，开始 ghost 层跟随 | 不改 |
| **drag move** | 实时计算新值，更新 ghost + 实时 renderAt | **改内存中的 project，但不入 history** |
| **drag end** | 确认新值 | 把修改入 history（合并成一个 patch） |
| **drag cancel (ESC)** | 丢弃 | 从 drag start 时的快照恢复 |

### 为什么实时改 project 而不是 ghost

因为要"实时预览"。clip 在时间线上拖时，预览区要同步显示拖到那个位置时的画面。如果只是 ghost 跟随，预览不会更新，就不知道拖到哪了。

### 什么操作用实时 vs 提交时

| 操作 | 策略 |
|------|------|
| 时间线拖 clip 横移 | **实时**（想看预览） |
| 时间线拖 clip 换轨道 | 实时 |
| 剪切 clip 长度 | 实时 |
| inspector 滑块调整（色彩/大小） | 实时 |
| inspector 文字输入 | debounce 500ms 后入 history |
| 颜色选择器 | open 时实时预览，close 时入 history |
| 拖素材到时间线 | 实时显示 drop 预览位置 |

---

## 7. 选中态管理

- 单选：`selection: ["c1"]`
- 多选：`selection: ["c1", "c3"]`（shift-click）
- 清空：`selection: []`（点击空白）
- 框选：mousedown 画矩形，mouseup 时计算框内所有 clip，一次性更新 selection

### inspector 响应

- `selection.length === 0`：显示项目属性（fps、分辨率、总时长）
- `selection.length === 1`：显示该 clip 的 scene params
- `selection.length > 1`：显示共有字段（比如时长、不透明度），修改同时应用到所有选中

---

## 8. 播放头状态

- `playhead: 2.5`（单位秒）
- 播放时：浏览器 rAF 每帧 `playhead += dt`，到末尾停
- 拖尺子：直接 setPlayhead，立即 renderAt
- 键盘 Space：播放/暂停切换
- 左右箭头：前后一帧（`playhead ± 1/fps`）
- Home/End：跳首/末
- 数字小键盘输入时间码：精确跳转

**播放头也是 project 的一部分**，保存时一起存（下次打开回到上次位置）。

---

## 9. 保存 / 加载

### 保存

```js
function save(project) {
  const json = JSON.stringify(project, null, 2)
  fs.writeFile(`${project.meta.id}.nframe.json`, json)
}
```

- 文件扩展名：`.nframe.json`
- 默认保存位置：`~/Documents/NextFrame/projects/{id}/project.json`
- 同目录下 `assets/` 存放复制过来的外部资源
- **不保存 history**：重新打开从空 history 开始

### 加载

```js
function load(path) {
  const json = fs.readFile(path)
  project = JSON.parse(json)
  validate(project)
  renderAt(project, project.playhead)
}
```

- 校验版本：不兼容时走 migration
- 缺失资源：提示用户重新链接

### 自动保存

- 每 30 秒写一次 `project.autosave.json`
- 崩溃恢复时提示

---

## 10. 协作可能性（未来）

**核心：两个人同时 patch 同一个 project，用 CRDT 或 OT 合并。**

### JSON patch 为基础

因为所有修改都是 patch，天然可序列化、可传输、可合并。

| 冲突场景 | 策略 |
|----------|------|
| 两人改同一个 clip 的不同 params | 自动合并（各自字段独立） |
| 两人改同一个 clip 的同一 params | 最后写入胜出 + 提示 |
| 两人删/移同一个 clip | 最后写入胜出 |

### 架构

- 中央服务器接收 patch stream
- 每个客户端本地保持一份 project + 订阅远端 patch
- 远端 patch 到达时，本地 rebase 未提交的 patch

**MVP 不做**，但 JSON-as-truth 架构为未来留好接口。

---

## 11. AI 接口

所有 AI 操作走同一套 patch 语言：

```bash
nextframe patch-add "tracks[0].clips" '{ "scene": "text", "start": 0, "duration": 2, "params": {...} }'
nextframe patch-update "tracks[0].clips[1].params.text" '"新文字"'
nextframe patch-delete "tracks[1].clips[0]"
```

- CLI 和 UI 共享同一套 patch 逻辑
- AI 可以 `nextframe show` 输出当前 project JSON 来"看到"状态
- AI 可以 `nextframe render --at 5.0 --out frame.png` 主动截图验证

---

## 12. 状态流转总图

```
  ┌─────────────────┐
  │   初始 project   │
  └────────┬────────┘
           │
     ┌─────▼─────┐
     │  history  │  ─ 快照栈 ─┐
     └─────┬─────┘             │
           │            ┌──────┴──────┐
           ▼            │ undo / redo │
  ┌─────────────┐       └──────┬──────┘
  │   in-memory │◀─────────────┘
  │   project   │
  └──────┬──────┘
         │
    patch 通道
         │
  ┌──────▼──────┐      ┌──────────────┐
  │  UI 事件    │      │   AI CLI    │
  │  (拖拽/输入) │      │  (patch op) │
  └──────┬──────┘      └──────┬──────┘
         │                    │
         └────────┬───────────┘
                  ▼
           ┌─────────────┐
           │ renderAt(t) │
           └──────┬──────┘
                  ▼
           ┌─────────────┐
           │ 预览 DOM    │
           └─────────────┘
```

---

## 13. 要避免的反模式

| 反模式 | 问题 |
|--------|------|
| UI 组件持有独立 state | 和 JSON 不同步，AI 看不到 |
| 直接 `project.x = y` | 绕过 history |
| 渲染依赖播放历史 | 破坏 frame-pure，跳帧失效 |
| 在 render 里修改 project | 无限循环 |
| history 存 diff 而不是快照 | 实现复杂度高，先不上（MVP 用全量快照） |
