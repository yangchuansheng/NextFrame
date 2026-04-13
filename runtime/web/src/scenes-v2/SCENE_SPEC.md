# Scene 组件接口规范（v0.3.1 — 自适应）

**所有组件必须遵守此接口。**

## 核心变化：自适应尺寸

组件不能假设 1920x1080。必须从 container 读尺寸，用相对单位。

```js
create(container, params) {
  const W = container.clientWidth || 1920;
  const H = container.clientHeight || 1080;
  const S = Math.min(W, H);  // 短边，用于等比缩放
  // 字号用 S 的比例：标题 S*0.06, 正文 S*0.025
}
```

## 字号规范

| 用途 | 公式 | 1920宽 | 1080宽(竖屏) | 1080宽(方形) |
|------|------|--------|-------------|-------------|
| 大标题 | `S * 0.08` | 86px | 86px | 86px |
| 标题 | `S * 0.05` | 54px | 54px | 54px |
| 正文 | `S * 0.025` | 27px | 27px | 27px |
| 小字 | `S * 0.018` | 19px | 19px | 19px |

S = `Math.min(width, height)` 保证所有比例下字号一致。

## 间距规范

| 用途 | 公式 |
|------|------|
| 大间距 | `S * 0.04` |
| 中间距 | `S * 0.02` |
| 小间距 | `S * 0.01` |
| 内边距 | `S * 0.03` |

## 必填字段

```js
export default {
  id: "headline",                    // 必须等于文件名
  type: "dom",                       // dom | canvas | svg | media
  name: "Headline",
  category: "Typography",            // 见分类表
  tags: ["text", "title"],           // 3-8 个英文标签
  description: "自适应大标题，支持渐变色和逐字入场",

  params: {
    text: { type: "string", default: "TITLE", desc: "标题文字" },
    fontSize: { type: "number", default: 0.05, desc: "字号(相对短边比例)", min: 0.02, max: 0.12 },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) { },
  update(els, localT, params) { },
  destroy(els) { },
};
```

## 参数中的 fontSize

**新规则：fontSize 是相对短边的比例（0~1），不是 px。**

- `fontSize: 0.05` → 在 1080p 横屏 = `1080 * 0.05 = 54px`
- `fontSize: 0.05` → 在 1080 竖屏 = `1080 * 0.05 = 54px`（S = min(1080,1920) = 1080）
- `fontSize: 0.05` → 在 1080 方形 = `1080 * 0.05 = 54px`

组件内部：`const actualPx = Math.round(S * (params.fontSize || 0.05));`

## 分类表

Typography / Code / Data Viz / Backgrounds / Effects / Overlay / Layout / Cards / Media / Chrome / Numbers / Diagrams

## Lint 检查

1. id = 文件名
2. type: dom/canvas/svg/media
3. tags: 3-8 个英文
4. description: 10 字以上
5. params: 每个有 type + default + desc
6. create/update/destroy: function
7. 不能硬编码 1920/1080
