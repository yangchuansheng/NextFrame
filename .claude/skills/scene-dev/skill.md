---
name: scene-dev
description: >
  NextFrame Scene 组件开发规范。创建新 scene、修改 scene、审查 scene 质量。
  确保每个 scene 满足 ADR-008 强制契约：4 接口 + 主题预设 + AI 元数据 + preview + validate 全绿。
  TRIGGER: "写组件"、"新 scene"、"做 scene"、"加组件"、"scene 开发"、"组件开发"、
  "写背景"、"写标题"、"写图表"、"写叠加层"、"新 scene"。
  DO NOT TRIGGER when: 使用已有 scene 写 timeline、修 engine 代码。
---

# NextFrame Scene 开发规范（ADR-008 强制契约）

## 开发流程（必须按顺序）

```
1. 确定比例 + 类别 → 创建目录
2. 写 index.js（meta 全字段 → render → screenshots → lint）
3. 写 preview.html（打开浏览器验证）
4. validate-scene.js 全绿
5. 测试 lint 拦截（故意传错参数）
6. 做一个 demo timeline 验证组合效果
7. 提交
```

## 目录结构（强制）

```
src/nf-core/scenes/{ratio}/{category}/{sceneName}/
├── index.js        ← 必须：meta + render + screenshots + lint
└── preview.html    ← 必须：浏览器打开即可预览
```

比例目录（禁止 universal）：`16x9/` | `9x16/` | `4x3/`
类别目录：`backgrounds/` | `typography/` | `data/` | `shapes/` | `overlays/` | `media/` | `browser/`

## index.js — 4 个必须导出 + 强制 meta 字段

### meta（全字段必填）

```js
export const meta = {
  // ─── 身份 ───
  id: "sceneName",              // 唯一 ID
  version: 1,                   // 改接口就 +1
  ratio: "9:16",                // 必填，禁止 null，和目录一致

  // ─── 分类与发现 ───
  category: "backgrounds",      // 小写
  label: "Scene Name",          // 英文名
  description: "中文描述，说清楚视觉效果和动画行为",
  tags: ["tag1", "tag2", "tag3"], // 至少 3 个搜索标签
  mood: ["calm", "energetic"],    // 情绪标签
  theme: ["tech", "business"],    // 适用主题

  // ─── 渲染 ───
  tech: "canvas2d",             // canvas2d | webgl | svg | dom | video | lottie
  duration_hint: 12,            // 建议时长（秒）
  loopable: true,               // 能否循环
  z_hint: "bottom",             // bottom | middle | top

  // ─── 主题预设（至少 3 个）───
  default_theme: "theme-name",
  themes: {
    "theme-name": { /* params 子集 */ },
    // 至少 3 个预设
  },

  // ─── 参数 ───
  params: {
    paramName: {
      type: "number",           // number | string | boolean | color | enum | array | object | file
      default: 270,             // 必须有（除非 required: true）
      range: [0, 360],          // number 必须有
      step: 1,                  // number 必须有
      label: "中文名",          // 必须有
      semantic: "english desc for AI", // 必须有，写清楚含义和取值范围的效果
      group: "color",           // content | color | style | animation | shape
    },
  },

  // ─── AI 指南（全字段必填）───
  ai: {
    when: "什么场景适合用，中文",
    how: "怎么在 timeline 里用，中文",
    example: { /* 完整 params 示例 */ },
    theme_guide: "每个 theme 的中文一句话说明",
    avoid: "什么情况不要用",
    pairs_with: ["scene-id-1", "scene-id-2"],
  },
};
```

### render(t, params, vp) → HTML string

```js
export function render(t, params, vp) {
  const { width, height } = vp; // 画布尺寸（像素）
  // 返回 HTML 片段
}
```

**强制规则：**
- 纯函数 — 相同 (t, params, vp) → 相同输出
- 禁止 Math.random()（除非用 seed）、Date.now()、全局状态
- 禁止 setTimeout / setInterval / requestAnimationFrame / fetch
- 返回的 HTML 宽高 = vp.width × vp.height

**按 tech 类型的输出格式：**

| tech | 返回什么 | 注意 |
|------|---------|------|
| canvas2d | `<canvas width={W} height={H}>` + `<script>绘制</script>` | canvas 尺寸 = vp，不要写死 1080 |
| svg | `<svg viewBox="0 0 {W} {H}">` | viewBox 天然缩放 |
| dom | `<div style="width:{W}px;height:{H}px">` | 尺寸跟 vp 走 |
| webgl | `<canvas>` + WebGL init `<script>` | — |
| video | `<video src currentTime={t}>` | — |
| lottie | Lottie player 定位到 t 帧 | — |

**⚠️ 踩坑记录：Canvas 和 DOM 混合渲染时，所有 scene 必须用同一个 viewport 尺寸。不要 Canvas 用 1080 而 DOM 用 380。**

### screenshots() → 截图时间点

```js
export function screenshots() {
  return [
    { t: 0,   label: "开始" },
    { t: 2.5, label: "动画中" },
    { t: 4.5, label: "完成" },
  ];
}
```

至少 3 个：开始、中间、结束。label 用中文。

### lint(params, vp) → 检查结果

```js
export function lint(params, vp) {
  const errors = [];
  // 必须检查：
  // 1. 文字溢出安全区（viewport × 0.9）
  // 2. 数组长度合理
  // 3. required 参数非空
  // 4. 数值在 range 内
  // 5. theme 名字在 themes{} 里存在
  // 每个 error 格式："描述。Fix: 修复建议"
  return { ok: errors.length === 0, errors };
}
```

## preview.html 规范

**必须有的 7 个 UI 元素：**

1. 正确比例的画布
2. 进度条（可点击跳转）
3. 播放/暂停按钮
4. 时间显示（当前 / 总时长）
5. 参数控件面板（按 group 分组，number → slider，string → text input）
6. 组件信息（比例、技术、时长）
7. 循环播放（t % duration）

**渲染规则：**
- Canvas：画在显示尺寸上（不要画 1080 再 CSS 缩小，会卡）
- SVG：用 viewBox，天然清晰
- DOM：直接用显示尺寸

**参考：** `scenes/9x16/backgrounds/auroraGradient/preview.html`

## 渲染技术选择

| 场景类型 | 推荐 tech | 原因 |
|---------|----------|------|
| 渐变/粒子/噪声 | canvas2d | 像素级操作 |
| 3D/Shader | webgl | GPU 加速 |
| 图表/图形 | svg | 矢量不糊 |
| 文字排版/卡片/毛玻璃 | dom | CSS 排版 + backdrop-filter |
| 视频片段 | video | HTML5 Video |
| 设计师动画 | lottie | .json 格式 |

## 主题系统

```json
// timeline 里用法（3 种）：
// 1. 只选 theme（AI 安全选择）
{ "scene": "auroraGradient", "theme": "ocean-teal" }

// 2. theme + 微调
{ "scene": "auroraGradient", "theme": "ocean-teal", "params": { "intensity": 1.5 } }

// 3. 纯自定义
{ "scene": "auroraGradient", "params": { "hueA": 150 } }
```

合并优先级：`params.default < themes[name] < timeline.params`

## 验证命令

```bash
# 验证单个（16 项检查）
node src/nf-core/scenes/validate-scene.js <scene-dir>

# 验证全部
for d in $(find src/nf-core/scenes -name "index.js" -exec dirname {} \;); do
  node src/nf-core/scenes/validate-scene.js "$d"
done

# 测试 lint 拦截
node src/nf-core/scenes/validate-scene.js <dir> --params '{"text":"超长文字..."}'

# 预览
open <scene-dir>/preview.html

# 做 demo timeline 测试组合
# 参考 output/demo-9x16.html
```

## 质量标准（全部必须满足）

| # | 检查项 | 标准 |
|---|--------|------|
| 1 | validate-scene.js | 16/16 通过 |
| 2 | preview.html | 打开能看到流畅动画 |
| 3 | 参数可调 | 所有 params 在预览面板有控件且实时生效 |
| 4 | lint 拦截 | 故意传溢出/空值能报错带 Fix 建议 |
| 5 | render 纯函数 | 相同输入 → 相同输出 |
| 6 | 主题预设 | 至少 3 个 theme，default_theme 有效 |
| 7 | AI 元数据 | when/how/example/theme_guide/avoid/pairs_with 全有 |
| 8 | 组合测试 | 在 demo timeline 里和其他 scene 叠加不冲突 |

## 已有示例

| Scene | 技术 | 路径 |
|-------|------|------|
| auroraGradient | canvas2d | scenes/9x16/backgrounds/auroraGradient/ |
| kineticHeadline | dom | scenes/9x16/typography/kineticHeadline/ |
| barChartReveal | svg | scenes/9x16/data/barChartReveal/ |
| circleRipple | canvas2d | scenes/9x16/shapes/circleRipple/ |
| lowerThirdVelvet | dom | scenes/9x16/overlays/lowerThirdVelvet/ |

**Demo timeline：** `output/demo-9x16.html`（5 个 scene 叠加的 12 秒视频）
