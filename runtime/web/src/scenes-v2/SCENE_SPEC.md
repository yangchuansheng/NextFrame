# Scene 组件开发规范（v0.3.1）

**AI 创建新组件前必读。不符合规范的组件 lint-scenes 不通过。**

## 快速入门

```bash
# 1. 查看现有组件
nextframe scenes

# 2. 创建组件文件
# runtime/web/src/scenes-v2/myScene.js

# 3. 注册到 index.js
# import myScene from './myScene.js'; 加到 ALL_SCENES

# 4. lint 检查
nextframe lint-scenes

# 5. 测试：写 JSON → validate → build → preview → Read 截图
```

## 组件模板（复制这个开始）

```js
import {
  createRoot, createNode, smoothstep, easeOutCubic, clamp,
  toNumber, resolveSize, getStageSize, SANS_FONT_STACK,
} from "../scenes-v2-shared.js";

export default {
  // ── 身份 ──
  id: "myScene",                       // 必须等于文件名（不含.js）
  type: "dom",                         // dom | canvas | svg | media
  name: "My Scene",
  category: "Typography",              // 见分类表
  tags: ["text", "title", "example"],  // 3-8 个英文标签
  description: "一句话描述这个组件做什么，至少 10 个字",

  // ── 参数 ──
  params: {
    text:     { type: "string",  default: "Hello",  desc: "显示文字" },
    fontSize: { type: "number",  default: 0.05,     desc: "字号(短边比例)", min: 0.02, max: 0.12 },
    color:    { type: "string",  default: "#ffffff", desc: "文字颜色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  // ── 生命周期 ──
  create(container, params) {
    // 1. 读取 stage 尺寸（用于字号计算）
    const stage = getStageSize(container);
    const W = container.clientWidth || stage.width;
    const H = container.clientHeight || stage.height;
    const S = Math.min(stage.width || W, stage.height || H);

    // 2. 用 resolveSize 计算字号
    const fs = resolveSize(params.fontSize, S, 0.05);

    // 3. 创建 DOM
    const root = createRoot(container);
    const text = createNode("div", [
      `font-family:${SANS_FONT_STACK}`,
      `font-size:${fs}px`,
      `color:${params.color || "#ffffff"}`,
      "text-align:center",
      "will-change:opacity,transform",
    ].join(";"), params.text || "Hello");
    root.appendChild(text);

    return { root, text };
  },

  update(els, localT, params) {
    // DOM 类型：localT 是 0~1 归一化
    // Canvas/SVG/Media 类型：localT 是秒数
    const enter = smoothstep(0, 0.15, localT);
    const exit = smoothstep(1, 0.85, localT);
    const alpha = enter * exit;
    els.text.style.opacity = alpha;
  },

  destroy(els) {
    els.root.remove();
  },
};
```

## 规则（全部强制）

### 1. 自适应尺寸 — 不准硬编码 px

```
✗ 错误：fontSize: 48           → 只在 1920 宽下好看
✓ 正确：fontSize: resolveSize(params.fontSize, S, 0.05)  → 所有比例都好看
```

- S = `Math.min(stage.width, stage.height)` — 基于 **stage** 不是 container
- 字号用 `resolveSize(value, S, fallback)` — 支持比例/px/关键字
- 间距用 `S * ratio` — 如 `S * 0.02`
- **绝对禁止出现 1920、1080、960、540 等硬编码数字**

### 2. resolveSize 接受的值

| 输入 | 含义 | 1080p 结果 |
|------|------|-----------|
| `0.05` | 短边的 5% | 54px |
| `48` | 48 像素 | 48px |
| `"48px"` | 48 像素 | 48px |
| `"large"` | 关键字 | 54px |
| `null` | 用 fallback | fallback × S |

关键字表：xxsmall(0.012) xsmall(0.016) small(0.02) medium(0.035) large(0.05) xlarge(0.07) xxlarge(0.1)

### 3. create 必须从 stage 读尺寸

```js
create(container, params) {
  const stage = getStageSize(container);
  const W = container.clientWidth || stage.width;
  const H = container.clientHeight || stage.height;
  const S = Math.min(stage.width || W, stage.height || H);
  // 后续所有尺寸用 S 计算
}
```

### 4. localT 规则

| type | localT 范围 | 含义 |
|------|------------|------|
| dom | 0 ~ 1 | 归一化（0=开始, 1=结束） |
| canvas | 0 ~ duration秒 | 绝对时间 |
| svg | 0 ~ duration秒 | 绝对时间 |
| media | 0 ~ duration秒 | 绝对时间 |

DOM 组件推荐时间分配：
- 0 ~ 0.15：入场动画
- 0.15 ~ 0.85：展示
- 0.85 ~ 1.0：出场动画

### 5. 不用 innerHTML

```
✗ 错误：el.innerHTML = '<div>text</div>'
✓ 正确：const div = document.createElement('div'); div.textContent = 'text';
```

### 6. will-change

给动画元素加 `will-change: opacity, transform`，不给静态元素加。

### 7. 图表标签防重叠

SVG 图表的标签字号必须自动 clamp：
```js
const maxLabelFs = Math.floor(chartWidth / (labelCount * 3.5));
const labelFs = Math.min(resolveSize(params.labelSize, S, 0.035), maxLabelFs);
```

### 8. 参数里的 fontSize 用比例值

```
✗ 错误：fontSize: { default: 48 }      → px 值，不自适应
✓ 正确：fontSize: { default: 0.05 }     → 比例值，自动缩放
```

组件内用 `resolveSize` 把比例值转成 px。用户也可以传 px 或关键字，resolveSize 都能处理。

### 9. update 三参数

```js
update(els, localT, params)  // 必须有第三个参数 params
```

### 10. destroy 清理

```js
destroy(els) {
  els.root.remove();  // DOM 类型
  // 或 els.canvas.remove();  // Canvas 类型
}
```

## 分类表

| category | 说明 |
|----------|------|
| Typography | 文字/标题 |
| Code | 代码展示 |
| Data Viz | 数据图表 |
| Backgrounds | 背景效果 |
| Effects | 视觉特效 |
| Overlay | 叠加层（字幕/标签） |
| Layout | 布局容器 |
| Cards | 卡片/标注 |
| Media | 媒体嵌入 |
| Chrome | 框架/外壳 |
| Numbers | 数字展示 |
| Diagrams | 流程/时间线 |

## 开发后检查清单

1. `nextframe lint-scenes` 通过
2. `grep "1920\|1080" myScene.js` 返回空
3. 在 3 种比例下测试（1920x1080, 1080x1920, 1080x1080）
4. preview 截图确认文字可读、不裁切
5. validate 0 warnings
