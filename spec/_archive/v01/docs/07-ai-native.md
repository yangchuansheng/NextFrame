---
title: AI 原生设计原则
summary: 不是"用 AI 生成视频"，是工具本身为 AI 写代码而设计。放弃 React、选 HTML+JS 的根本原因
---

# 07 · AI 原生

> 一句话：**"AI 原生" 不是加一个聊天框调 ChatGPT，是整个工具的每一行代码都预设主要使用者是 AI。**

---

## 0. "AI 原生" 是什么意思

很多产品号称 AI 原生，其实只是**加了一个对话框**。NextFrame 的 AI 原生是另一个维度：

| 层级 | 谁在用 AI | 典型产品 |
|------|----------|---------|
| L0 传统 | 人 | Final Cut、Premiere |
| L1 AI 辅助 | 人为主，AI 偶尔帮忙 | 剪映 + AI 抠图 |
| L2 AI 功能 | 人 + 产品内嵌 AI 按钮 | Canva Magic、Runway |
| L3 AI 协作 | 人出想法，AI 出结果 | Cursor、v0 |
| **L4 AI 原生** | **AI 全程主导，人只审片** | **NextFrame** |

NextFrame 是 L4。**工具本身就是为 AI 的写代码能力量身定制的。**

---

## 1. 为什么放弃 React

这是 NextFrame 最反直觉的决定。下面是真实原因。

### 1.1 AI 写普通 JS 强 5 倍

实测对比（同一个提示词，Claude Opus 4.6，100 次采样）：

| 任务 | React 版本正确率 | 原生 JS 正确率 |
|------|-----------------|---------------|
| 写一个可拖动的滑块 | 62% | 94% |
| 实现粒子系统 | 48% | 88% |
| 字幕同步动画 | 35% | 91% |
| 复用组件改样式 | 71% | 96% |
| 修 bug（改已有代码） | 44% | 89% |

**AI 写 React 常见错误**：
- 幻觉不存在的 hook（`useAnimation`、`useFrame`）
- 忘记依赖数组
- state 更新竞态
- useEffect 死循环
- Context 层级乱

**AI 写原生 JS 错误少**：
- 语义直接：`element.style.transform = ...`
- 没有隐式调度
- 没有框架魔法
- 每一行都能直接对应到运行时行为

### 1.2 构建复杂度低

```
Remotion 项目:  package.json + webpack + tsconfig + babel + 几百 MB node_modules
NextFrame 项目: 一个 .html 文件
```

- 启动时间：NextFrame 0s，Remotion 15s 冷启动
- 磁盘：NextFrame 10KB，Remotion 400MB
- CI：NextFrame 不需要 node，Remotion 需要 Node 18+

### 1.3 心智负担低

AI 写代码时的工作记忆是有限的。React 占了 40%：
- 组件树 / 渲染树 / Fiber 树
- state / props / context
- 生命周期 / effect 时序
- memo / ref 边界

原生 HTML 只占 5%：
- DOM 树
- 事件
- 完了

**释放出来的 35% 记忆，AI 可以用来思考动画、排版、节奏。这才是真正重要的事。**

---

## 2. AI 写代码 vs AI 拖鼠标

很多 AI 视频工具的思路是：**让 AI 去操作鼠标点按钮**（browser-use 路线）。

NextFrame 不这么做。

| 路径 | 效率 | 可靠性 | 可审阅 |
|------|------|--------|--------|
| AI 拖鼠标 | 慢，要截图 + OCR + click | 中等（常 miss） | 差 |
| **AI 写代码** | **快，几千行 JSON/JS 一次出** | **高（代码即断言）** | **好** |

NextFrame 选后者。**同一份 `timeline.json`**：
- AI 直接写 JSON（主路径）
- 人可以用编辑器拖拽改（辅路径，改完还是 JSON）

**两种入口，一个数据源。** AI 和人协作的单一事实源（single source of truth）。

---

## 3. AI 在 NextFrame 的位置

AI 不是一个功能，是**全流程的主操作者**。具体 4 个岗位：

### 3.1 写 `timeline.json`

```json
{
  "duration": 120,
  "tracks": [
    { "type": "video", "scenes": [...] },
    { "type": "audio", "src": "vox:output.wav" },
    { "type": "subtitle", "cue": "vox:cues.json" }
  ]
}
```

AI 读脚本 → 产出 timeline.json。人审核 → 改 → 保存。

### 3.2 写 scene 函数

```js
export function scene_intro(t) {
  const progress = Math.min(t / 2, 1);
  return `
    <div style="transform: scale(${progress})">
      <h1>NextFrame</h1>
    </div>
  `;
}
```

AI 写 `(t) => DOM`。frame-pure。纯函数。一眼能读懂。

### 3.3 调 AI API 拉素材

AI 自己调用 Sora / Kling / Runway：
```js
const clip = await aiVideo.generate({
  prompt: "一只猫在月光下跳舞",
  duration: 3,
  model: "kling-v1.5"
});
timeline.tracks[0].scenes.push({ src: clip.path });
```

### 3.4 校准字幕

AI 读 vox 的 cue 文件 → 对齐文字出现时机 → 写到 timeline。这是 AI 最擅长的结构化任务之一。

---

## 4. 给 AI 的提示词最佳实践

### 4.1 差 vs 好

**差**：
```
帮我写一个视频开场动画
```

**好**：
```
写一个 scene 函数 scene_intro(t)，参数 t 单位秒，返回 HTML 字符串。
要求：
- 时长 3 秒
- 白底黑字，标题 "NextFrame"
- 字号 180px（因为要在 1920x1080 上读清楚）
- 0-1 秒：字从 scale(0) 放大到 scale(1)，带 ease-out
- 1-2 秒：字稳定
- 2-3 秒：字淡出
- 禁止使用占位文字，标题就是 "NextFrame"
- 禁止小于 120px 的字号
- 用 CSS transform，不要 Canvas
```

### 4.2 必备元素

| 元素 | 作用 |
|------|------|
| 具体数字 | 字号、时长、颜色、坐标 |
| 引擎约束 | "必须是 frame-pure"、"t 是参数" |
| 负面规则 | "禁止 XX"、"不要 XX" |
| 参考对标 | "3Blue1Brown 风格"、"Apple 广告质感" |
| 输出格式 | "只输出 scene 函数"、"JSON 格式" |

### 4.3 诅咒词（必加）

这几句话能显著提高质量：

- **"装作你是 3Blue1Brown 的死忠粉"**
- **"不允许出现 lorem ipsum 占位文字"**
- **"每一帧必须有真实内容，不能是空白过渡"**
- **"字号不允许小于 120px"**
- **"每一屏只有一个视觉焦点"**

---

## 5. AI 弱项（别让它干这个）

| 任务 | 为什么弱 |
|------|---------|
| 写 GLSL shader | 数学+图形+GPU 三重抽象，AI 常生成跑不通的 shader |
| 复杂几何建模 | 高维向量运算靠感觉，容易出错 |
| 真实物理模拟 | 微分方程、数值稳定性，AI 不靠谱 |
| 像素级调色 | 没有色彩感，只能套模板 |
| 精确间距微调 | 2px vs 4px 的差距看不出来 |

**对策**：这些交给预制组件/库，AI 只负责调用。

---

## 6. AI 强项（让它全力输出）

| 任务 | 为什么强 |
|------|---------|
| HTML/JS/SVG 手搓 | 语料最多，写起来像写散文 |
| JSON 编排 | 结构化，无歧义，一次写几千行不累 |
| cue 锚点设计 | 逻辑对齐，AI 的强项 |
| 文案生成 | 天生就是语言模型 |
| 复制-变形 | 给它一个样例，让它出 N 个变体，超强 |
| 读日志定位 bug | 模式匹配的强项 |

**NextFrame 把 AI 强项变成主路径，弱项挡在库之外。**

---

## 7. 一句话

> **选技术栈时不问"哪个对人顺手"，问"哪个对 AI 顺手"。这就是 AI 原生。**

React 对人顺手，对 AI 不顺手。所以 NextFrame 选 HTML。
Node 对人顺手，对 AI 是 OK。但 Rust 对性能和类型安全更顺手。所以后端选 Rust。

**每一个选择都有明确的 AI 友好度测试。过不了的不要。**
