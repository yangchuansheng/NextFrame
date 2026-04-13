# NextFrame — AI-Native Video Editor

## 当前版本：v0.3 (HTML-First Hybrid Rendering)

## 核心架构

Timeline JSON → engine-v2 → 单文件 HTML → 浏览器播放/录制

- **数据格式**：flat `layers[]`（不是旧的 tracks/clips）
- **组件**：48 个 scene（DOM/Canvas/SVG/WebGL/Media），在 `runtime/web/src/scenes-v2/`
- **引擎**：`runtime/web/src/engine-v2.js`（层管理、renderFrame、enter/exit/transition）
- **打包**：`runtime/web/src/bundle.cjs`（timeline JSON → 单文件 HTML）
- **CLI**：`nextframe-cli/bin/nextframe.js`（AI 唯一入口）

## AI 用 CLI 的流程

```bash
nextframe scenes                    # 查看 48 个组件
nextframe scene headline            # 查看组件参数
nextframe validate timeline.json    # 验证格式
nextframe build timeline.json -o out.html  # 生成 HTML
```

## 如果没有合适的组件 → 按规范自己写

组件格式：
```js
// runtime/web/src/scenes-v2/myScene.js
export default {
  id: "myScene",
  type: "dom",           // dom / canvas / svg / webgl / media
  name: "My Scene",
  category: "Typography",
  defaultParams: { text: "Hello", fontSize: 72 },
  create(container, params) { /* 创建 DOM/Canvas → return els */ },
  update(els, localT, params) { /* DOM: localT 0~1, 其他: 秒数 */ },
  destroy(els) { els.root.remove(); }
};
```

写完后加到 `runtime/web/src/scenes-v2/index.js` 注册。

## 关键文件

| 文件 | 作用 |
|------|------|
| `spec/architecture/05-data-model.md` | 数据模型（layer 格式） |
| `spec/architecture/06-cli-v03.md` | CLI 命令设计 |
| `runtime/web/src/engine-v2.js` | 运行时引擎 |
| `runtime/web/src/scenes-v2/` | 48 个组件 |
| `runtime/web/src/bundle.cjs` | HTML 打包器 |
| `output/` | 已验证的 demo HTML |
