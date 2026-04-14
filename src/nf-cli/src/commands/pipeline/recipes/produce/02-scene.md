# Step 2: 做组件 + 单独验证

缺什么组件就做什么。每个组件：写 → preview → 看截图 → 不对就改 → 循环。

## 2.1 先读设计规范

```bash
cat src/nf-core/scenes/shared/design.js
```

这个文件是**唯一真相源**。里面有：
- `TOKENS.interview.*` — 9:16 颜色（金色 #e8c47a，背景 #111111 等）
- `TOKENS.lecture.*` — 16:9 颜色（金色 #d4b483，背景 #1a1510 等）
- `GRID` — 9:16 布局网格（header 0-260px, video 276-814px, subs 830-1170px 等）
- `GRID_16x9` — 16:9 布局网格
- `TYPE` / `TYPE_16x9` — 字号/字重/字体
- `findActiveSub(segments, t)` — 字幕两级查找函数
- `esc()`, `fadeIn()`, `scaleW()`, `scaleH()` 等工具函数

## 2.2 组件契约

每个 scene 必须导出 4 个接口：

```javascript
export const meta = {
  id: "sceneName",           // 唯一 ID
  version: 1,
  ratio: "9:16",             // 或 "16:9"
  category: "overlays",      // backgrounds/media/overlays/typography/browser/data
  label: "Human Name",
  description: "做什么的",
  tech: "dom",
  duration_hint: 20,
  videoOverlay: true,         // 仅视频 scene 需要，recorder 靠这个检测
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    paramName: { type: "string", default: "", label: "说明", group: "content" }
  },
  ai: { when: "什么时候用", how: "怎么用" }
};

export function render(t, params, vp) {
  // t = 当前时间(秒), params = 参数, vp = {width, height}
  // 返回 HTML 字符串
  return `<div>...</div>`;
}

export function screenshots() {
  return [{ t: 0.5, label: "标签" }, { t: 5, label: "中间" }, { t: 19, label: "结尾" }];
}

export function lint(params, vp) {
  const errors = [];
  // 检查参数合法性
  return { ok: errors.length === 0, errors };
}
```

## 2.3 关键规则

### 颜色 — 全部从 TOKENS 取
```javascript
// ✅ 对
color: TOKENS.interview.gold
// ❌ 错 — 禁止硬编码
color: "#e8c47a"
```

### 位置 — 全部从 GRID 取
```javascript
// ✅ 对
const top = scaleH(vp, GRID.video.top);
// ❌ 错 — 禁止硬编码像素
const top = scaleH(vp, 276);
```

### 字幕 — 用 findActiveSub 两级查找
```javascript
import { findActiveSub } from "../../../shared/design.js";

// render 函数里：
const active = findActiveSub(params.segments, t);
if (active) {
  // active.cn = 当前中文
  // active.en = 当前英文（segment 级别）
  // active.speaker = 说话人 → 决定颜色
}
```

**禁止把 segments 拍平成 SRT 数组** — 英文跟 segment 走，中文跟 cn[] 子 cue 走。拍平会导致英文重复跳动。

### 视频 — meta 必须有 videoOverlay: true
```javascript
export const meta = {
  // ...
  videoOverlay: true,  // recorder 靠这个检测哪个层需要 ffmpeg 合成
};
```

### WKWebView 兼容
- 代码块 → 用单个 `<pre>` 元素，不用多个 `<div>`
- 流程图 → 用单个 `<svg>` 元素，不用多个 positioned div
- 原因：WKWebView CALayer.render 在快速 DOM 更新时会丢失多个 absolute-positioned 元素

## 2.4 写完后验证

```bash
# 1. 确认被发现
nextframe scenes <id>

# 2. 硬编码检测（应该 0 结果）
grep -n "#[0-9a-fA-F]\{3,8\}" src/nf-core/scenes/{ratio}/*/*/index.js

# 3. 写一个最小 timeline 测试这个组件
node -e "
  const t = { version:'0.3', ratio:'9:16', width:1080, height:1920, fps:30, duration:10,
    layers:[{ id:'test', scene:'<id>', start:0, dur:10, params:{} }] };
  require('fs').writeFileSync('/tmp/test-scene.json', JSON.stringify(t));
"
nextframe build /tmp/test-scene.json --out /tmp/test-scene.html

# 4. 读截图确认效果
# Read /tmp/test-scene-preview/frame-*.png
```

如果截图不对 → 改 → 重新 build → 再看截图。循环直到满意。

## 2.5 参考老版本

如果做 9:16 访谈组件，参考：

```bash
# 老版本的完整实现
cat /Users/Zhuanz/bigbang/MediaAgentTeam/series/硅谷访谈/E01-Dario-Amodei-指数终局/frames/slide-base.js
cat /Users/Zhuanz/bigbang/MediaAgentTeam/series/硅谷访谈/E01-Dario-Amodei-指数终局/frames/clip-slide.js
cat /Users/Zhuanz/bigbang/MediaAgentTeam/series/硅谷访谈/E01-Dario-Amodei-指数终局/frames/subs-zone.js
```

这三个文件是视觉参考的终极真相。布局、颜色、字号、间距都从这里来。
design.js 的 GRID/TYPE/TOKENS 就是从这里提取的。

## 下一步

全部组件 preview 通过后：

```bash
nextframe produce timeline
```
