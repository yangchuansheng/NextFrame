---
name: scene-dev
description: >
  NextFrame Scene 组件开发规范。创建新 scene、修改 scene、审查 scene 质量。
  确保每个 scene 有完整接口（meta+render+screenshots+lint+preview）、通过 16 项检查、可预览。
  TRIGGER: "写组件"、"新 scene"、"做 scene"、"加组件"、"scene 开发"、"组件开发"、
  "写背景"、"写标题"、"写图表"、"写叠加层"。
  DO NOT TRIGGER when: 使用已有 scene 写 timeline（那是正常使用）、修 engine 代码。
---

# NextFrame Scene 开发规范

## 核心规则

**每个 scene 是一个目录，4 个必须接口，1 个必须文件。** 不满足 = 不合格。

## 目录结构（强制）

```
src/nf-core/scenes/{ratio}/{category}/{sceneName}/
├── index.js        ← 必须：meta + render + screenshots + lint
└── preview.html    ← 必须：浏览器打开即可预览动画 + 调参
```

比例目录：`16x9/` | `9x16/` | `4x3/`
类别目录：`backgrounds/` | `typography/` | `data/` | `shapes/` | `overlays/` | `media/` | `browser/`

**比例目录 = ratio 声明。** meta.ratio 必须和目录一致。放错目录 = validate 报错。

## index.js 接口（4 个全部必须）

### 1. meta（对象）

```js
export const meta = {
  // ─── 身份（必填）───
  id: "sceneName",              // 唯一 ID，timeline 里引用
  ratio: "9:16",                // 必填，和目录一致。禁止 null。
  category: "backgrounds",      // 小写
  
  // ─── 展示（必填）───
  label: "Scene Name",          // 人看的名字
  description: "一句话中文描述",
  
  // ─── 渲染（必填）───
  tech: "canvas2d",             // canvas2d | webgl | svg | dom | video | lottie
  duration_hint: 12,            // 建议时长（秒）
  
  // ─── 可选 ───
  loopable: true,               // 能否循环
  tags: ["gradient", "ambient"],// 搜索标签
  version: 1,                   // 接口版本
  
  // ─── 参数（必填，对象格式）───
  params: {
    paramName: {
      type: "number",           // number | string | boolean | color | enum | array | object | file
      default: 270,             // 必须有（除非 required: true）
      range: [0, 360],          // number 类型必须有
      step: 1,                  // 滑块步长
      label: "中文名",          // 人看
      semantic: "english desc", // AI 看
      group: "color",           // 分组：content | color | style | animation | shape
      required: false,          // 是否必填
    },
  },
  
  // ─── AI 指南（推荐）───
  ai: {
    when: "什么时候用这个组件",
    example: { paramName: 270 },
    avoid: "什么情况不要用",
  },
};
```

### 2. render(t, params, vp) → HTML string

```js
/**
 * 渲染一帧。纯函数。
 * @param {number} t — 本地时间（秒）
 * @param {object} params — 合并后的参数（用户值 + 默认值）
 * @param {{ width: number, height: number }} vp — 画布尺寸（像素）
 * @returns {string} HTML 片段
 */
export function render(t, params, vp) {
  // Canvas 2D → 返回 <canvas> + <script>
  // SVG → 返回 <svg viewBox="...">
  // DOM → 返回 <div> 树
  // 宽高 = vp.width × vp.height
}
```

**规则：**
- 纯函数，相同输入 → 相同输出
- 不用 setTimeout / setInterval / requestAnimationFrame
- 不依赖全局状态
- 返回的 HTML 宽高 = viewport

### 3. screenshots() → 截图时间点

```js
/**
 * 声明关键时刻，引擎会在这些时刻截图给 AI 看。
 * @returns {{ t: number, label: string }[]}
 */
export function screenshots() {
  return [
    { t: 0, label: "开始" },
    { t: 2, label: "动画中" },
    { t: 4, label: "结束" },
  ];
}
```

**至少 3 个时间点：** 开始、中间、结束。

### 4. lint(params, vp) → 检查结果

```js
/**
 * 检查参数合法性 + 内容是否超出安全区。
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function lint(params, vp) {
  const errors = [];
  // 检查文字溢出
  // 检查数据条数
  // 检查必填项
  // 每个 error 必须带 "Fix: ..." 修复建议
  return { ok: errors.length === 0, errors };
}
```

**lint 必须检查的：**
- 文字内容是否超出安全区宽度
- 数组数据是否超出合理范围
- required 参数是否提供
- 数值是否在 range 内

## preview.html 规范

**浏览器直接打开 = 看到动画 + 能调参数。**

必须有：
- 正确比例的画布（实际分辨率渲染，CSS 缩小显示）
- 进度条（可点击跳转）
- 播放/暂停按钮
- 时间显示
- 参数控件面板（从 meta.params 生成）
- 组件信息（比例、技术、时长）

**Canvas 场景：** canvas.width/height = 实际分辨率，canvas.style = 缩小尺寸。不能画小图拉大。
**SVG 场景：** 用 viewBox，天然不模糊。
**DOM 场景：** 用 transform: scale() 缩小显示。

## 渲染技术选择

| 场景类型 | 推荐技术 | 原因 |
|---------|---------|------|
| 渐变/粒子/噪声 | canvas2d | 像素级操作 |
| 3D/Shader | webgl | GPU 加速 |
| 图表/图形 | svg | 矢量，缩放不糊 |
| 文字排版/卡片 | dom | CSS 排版最强 |
| 视频片段 | video | HTML5 Video |
| 设计师动画 | lottie | .json 格式 |

## 开发流程

```
1. 确定比例和类别 → 创建目录
2. 写 index.js（meta → render → screenshots → lint）
3. 写 preview.html（打开浏览器验证效果）
4. 运行 validate：
   node src/nf-core/scenes/validate-scene.js <scene-dir>
   → 16 项检查全绿
5. 测试 lint 拦截：
   node src/nf-core/scenes/validate-scene.js <scene-dir> --params '{"text":"超长文字..."}'
   → 确认 lint 能拦住溢出
6. 提交
```

## 验证命令

```bash
# 验证单个 scene（16 项检查）
node src/nf-core/scenes/validate-scene.js src/nf-core/scenes/9x16/backgrounds/auroraGradient

# 验证所有 scene
for d in $(find src/nf-core/scenes -name "index.js" -exec dirname {} \;); do
  node src/nf-core/scenes/validate-scene.js "$d"
done

# 带自定义参数验证（测试 lint）
node src/nf-core/scenes/validate-scene.js <dir> --params '{"text":"很长的文字"}'

# 打开预览
open <scene-dir>/preview.html
```

## 质量标准

| 检查项 | 标准 |
|--------|------|
| validate-scene.js | 16/16 通过 |
| preview.html | 打开能看到动画 |
| 参数可调 | 所有 params 在预览面板有控件 |
| lint 拦截 | 溢出/空值/超范围能报错 |
| render 纯函数 | 相同 t + params → 相同输出 |
| 清晰度 | Canvas 全分辨率渲染，SVG 用 viewBox |

## 已有示例（参考）

| Scene | 技术 | 路径 |
|-------|------|------|
| auroraGradient | canvas2d | scenes/9x16/backgrounds/auroraGradient/ |
| kineticHeadline | dom | scenes/9x16/typography/kineticHeadline/ |
| barChartReveal | svg | scenes/9x16/data/barChartReveal/ |
| circleRipple | canvas2d | scenes/9x16/shapes/circleRipple/ |
| lowerThirdVelvet | dom | scenes/9x16/overlays/lowerThirdVelvet/ |
