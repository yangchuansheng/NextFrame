---
title: NextFrame UI Layout
summary: 编辑器 5 区布局 + 多轨道时间线规范 + 暗色主题色板 + 交互态 + 字体图标规范。直接对齐 `/Users/Zhuanz/bigbang/NextFrame/poc/03-editor-mockup/index.html` 已实现的高保真原型。
---

# NextFrame UI Layout

## 一句话

**5 区经典编辑器布局，暗色主题，以时间线为核心。所有 CSS 变量和视觉语言直接从 `poc/03-editor-mockup/index.html` 抄。**

---

## 1. 总体布局

```
┌──────────────────────────────────────────────────┐
│  TopBar (52px)                                   │  顶部菜单 + 播放控件 + 导出
├──────────┬─────────────────────────┬─────────────┤
│          │                         │             │
│  Left    │     Preview             │   Right     │
│  Sidebar │     (center)            │   Inspector │
│  280px   │     flex: 1             │   300px     │
│          │                         │             │
├──────────┴─────────────────────────┴─────────────┤
│  Timeline (320px)                                │  多轨道时间线
└──────────────────────────────────────────────────┘
```

### CSS 变量（从 `03-editor-mockup` 抄）

```css
--top-h: 52px;       /* 顶部菜单高度 */
--timeline-h: 320px; /* 底部时间线高度 */
--sidebar-l: 280px;  /* 左侧素材库宽度 */
--sidebar-r: 300px;  /* 右侧属性面板宽度 */
--tools-h: 40px;     /* 时间线工具条高度 */
--track-h: 48px;     /* 单轨道高度 */
```

### Grid 模板

```css
body {
  display: grid;
  grid-template-rows: var(--top-h) 1fr var(--timeline-h);
}
.main {
  display: grid;
  grid-template-columns: var(--sidebar-l) 1fr var(--sidebar-r);
}
```

---

## 2. 五个区域的职责

| 区域 | 尺寸 | 职责 | 主要组件 |
|------|------|------|---------|
| **TopBar** | 100% × 52px | 菜单、品牌、全局操作 | logo / 项目名 / 撤销重做 / 播放控制 / 导出 |
| **Left Sidebar** | 280px × 1fr | 资产和 scene 库 | 标签切换（素材 / Scene / 音频）、网格列表、拖拽源 |
| **Preview** | 1fr × 1fr | 画面预览 + 画布 | 视频显示区 16:9、安全框、尺子、缩放、抓手 |
| **Right Inspector** | 300px × 1fr | 选中对象的属性 | 折叠分组：变换 / 尺寸 / 滤镜 / scene 自定义 params |
| **Timeline** | 100% × 320px | 多轨道时间线 | 轨道头、时间尺、clip 块、播放头、缩放条 |

### 可折叠

- Left / Right 可 collapse（宽度变 40px，只留竖排 icon）
- Timeline 可 collapse（高度变 80px，只留播放头和主轨道）

---

## 3. 多轨道时间线视觉规范

### 组成

```
┌──────┬──────────────────────────────────────────┐
│      │  时间尺  0s  1s  2s  3s  4s  5s        │  --tools-h (40px)
│      ├──────────────────────────────────────────┤
│ V3 👁│    ┌────┐                                │  --track-h (48px)
│ V2 👁│  ┌─┤clip├─┐   ┌──────┐                  │  --track-h (48px)
│ V1 👁│──┴─┴────┴─┴───┴──────┴──────────────    │  --track-h (48px)
│ A1 🔊│  ~~~~~~~~~~~~~~~~~~~~~~~~~~             │  --track-h (48px)
│ A2 🔊│            ~~~~~~~~~~~                   │  --track-h (48px)
└──────┴────────────────↑─────────────────────────┘
       轨道头 72px      播放头 (红色 2px)
```

### clip 视觉

| 属性 | 值 | 说明 |
|------|-----|------|
| 高度 | `var(--track-h) - 6px` = 42px | 上下留 3px gap |
| 圆角 | 6px | 左右整体圆角 |
| 边框 | 1px solid rgba(255,255,255,0.06) | 默认态 |
| 选中边框 | 2px solid var(--accent) | 选中态 |
| hover 亮度 | filter: brightness(1.15) | hover 态 |
| 拖拽态 | opacity: 0.6 + shadow | 正在拖 |
| 阴影 | `0 2px 6px rgba(0,0,0,0.4)` | 所有 clip |

### clip 背景按类型配色

| scene 类型 | 背景 | 用途 |
|-----------|------|------|
| video | `--blue` (#6a9cff) | 视频素材 |
| image | `--green` (#5fd9a8) | 图片 |
| text / title | `--accent` (#ff7e55) | 文字类 |
| generative | `--purple` (#b878ff) | 生成动画（fourier 等） |
| effect / 叠加 | `--pink` (#ff7ab8) | 滤镜、特效 |
| transition | `--yellow` (#ffc858) | 转场 |
| audio | `--green` 低饱和 | 音频（波形叠加在上） |

### 播放头（playhead）

- 宽 2px，颜色 `--red` (#ff5c6e)
- 顶端三角形 handle（10px × 10px）
- 可拖拽定位
- 上下贯穿所有轨道

### 时间尺（ruler）

- 背景 `--bg2`，高 `--tools-h` = 40px
- 主刻度每秒一根，次刻度每 1/10 秒
- 字体 SF Mono 11px，颜色 `--dim`

---

## 4. 交互态

| 态 | 触发 | 视觉变化 |
|----|------|---------|
| default | 无操作 | 静态色 |
| hover | 鼠标悬停 | bg 提亮 6%，border 提亮 |
| focus | 键盘 focus | 1px outline `--accent` |
| selected | 点击选中 | 2px border `--accent`，右侧 inspector 同步 |
| active/pressed | 鼠标按下 | 暗 6% + 轻微 scale(0.98) |
| dragging | 拖拽中 | opacity 0.6 + 投影跟随光标 |
| dropping | 拖拽目标 hover 区 | dashed border `--accent` + 背景淡色 |
| disabled | 不可用 | opacity 0.4，cursor not-allowed |

**所有过渡动画**：`transition: all 0.12s ease` —— 够快不拖沓。

---

## 5. 暗色主题色板

### 背景梯度

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg0` | #0a0a0f | 最深，body/画布外 |
| `--bg1` | #12121a | TopBar / 侧栏底 |
| `--bg2` | #181821 | Panel 背景 |
| `--bg3` | #1e1e28 | 卡片背景 |
| `--bg4` | #262632 | hover 态、高亮层 |

### 分割线

| 变量 | 值 |
|------|-----|
| `--line` | #2a2a36 |
| `--line-soft` | #1f1f2a |

### 文字

| 变量 | 值 | 用途 |
|------|-----|------|
| `--fg` | #e8e8f0 | 主文字 |
| `--dim` | #7a7a8e | 次要文字 |
| `--dim2` | #5a5a6c | 辅助、禁用 |

### 强调色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--accent` | #ff7e55 | 主强调（品牌橙） |
| `--accent-soft` | #ffb48f | 强调柔和 |
| `--green` | #5fd9a8 | 成功、音频 |
| `--blue` | #6a9cff | 视频、信息 |
| `--purple` | #b878ff | 生成动画 |
| `--pink` | #ff7ab8 | 特效 |
| `--yellow` | #ffc858 | 转场、警告 |
| `--red` | #ff5c6e | 播放头、错误 |

### 品牌渐变

```css
background: linear-gradient(135deg, #ff7e55, #ff6bb5 60%, #b878ff);
```

用于 logo、导出按钮、hero 卡片。

---

## 6. 字体规范

| 场景 | 字体 | 大小 |
|------|------|------|
| UI 默认 | `-apple-system, "PingFang SC", "Helvetica Neue", "Segoe UI", sans-serif` | 13px |
| 小字（标签、计数） | 同上 | 11px |
| 标题 | 同上 bold | 15-18px |
| 数字 / 时间码 / 代码 | `"SF Mono", "JetBrains Mono", "Menlo", monospace` | 12-13px |
| 字距 | `letter-spacing: 0.01em` | 全局略松 |

**规则**：所有时间码（`00:00:12.04`）、坐标、帧号、数值输入，统一用 SF Mono 等宽，防跳动。

---

## 7. 图标库

**推荐：[Lucide](https://lucide.dev)（lucide-static SVG）**

理由：
- 1000+ 图标，风格统一（线性 2px stroke）
- 免费 ISC license
- 纯 SVG，零 JS，可直接 inline
- Figma / VSCode / Linear 都在用，和暗色主题百搭

备选：Heroicons（Tailwind 出品，偏粗一些，适合更厚重风格）。

### 常用图标清单

| 用途 | Lucide 名 |
|------|-----------|
| 播放 | `play` |
| 暂停 | `pause` |
| 快退/快进 | `skip-back` / `skip-forward` |
| 撤销/重做 | `undo-2` / `redo-2` |
| 剪刀切分 | `scissors` |
| 删除 | `trash-2` |
| 眼睛可见 | `eye` / `eye-off` |
| 静音 | `volume-2` / `volume-x` |
| 锁定 | `lock` / `unlock` |
| 导出 | `download` |
| 设置 | `settings-2` |
| 视频 / 图片 / 文字 / 音频 | `film` / `image` / `type` / `music` |
| scene 库 | `sparkles` |

**尺寸约定**：UI 按钮内 16px，侧栏标签 18px，TopBar 主按钮 20px。stroke-width: 2。

---

## 8. 参考截图与原型

| 原型 | 路径 | 看什么 |
|------|------|--------|
| 编辑器整体 | `/Users/Zhuanz/bigbang/NextFrame/poc/03-editor-mockup/index.html` | 5 区布局、时间线、侧栏、inspector 全貌 |
| Scene 原子库 | `/Users/Zhuanz/bigbang/NextFrame/poc/04-atoms-showcase/index.html` | 24 个 scene 的视觉预览，clip 配色参考 |
| Top-tier 效果 | `/Users/Zhuanz/bigbang/NextFrame/poc/05-top-tier/01-product-reveal.html` | 高级特效和转场视觉 |
| Frame-pure | `/Users/Zhuanz/bigbang/NextFrame/poc/01-frame-pure/index.html` | 任意时刻跳帧的视觉反馈 |
| 多轨道 | `/Users/Zhuanz/bigbang/NextFrame/poc/02-multi-track/index.html` | 多轨道时间线交互原型 |

---

## 9. 响应式

**只支持桌面**：最小窗口 1280 × 800。低于此尺寸直接提示"请放大窗口"。不做移动端。

大屏（2560+）：等比放大 CSS 变量，保持内容密度。字体不变。

---

## 10. 无障碍（基本线）

- 所有交互元素有 `aria-label`
- 焦点可见（outline 不消失）
- 对比度 ≥ WCAG AA（`--fg` on `--bg0` = 15:1 ✅）
- 键盘全可达：Tab 遍历 + Enter/Space 激活 + 方向键定位 clip
- 不靠颜色唯一传达信息（clip 类型有 icon + 文字 label，不只是色块）
