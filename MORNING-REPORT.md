# 早晨报告 · 2026-04-12

**核心交付：AI 调用 CLI 做出真视频 + HTML 预览 + MP4 导出。全部跑通。**

## 直接看产品

```bash
cd /Users/Zhuanz/bigbang/NextFrame/nextframe-cli

# 方法 1：开浏览器预览（推荐先看这个）
node preview/server.mjs
# 打开 http://localhost:5173
# 左边滑块拖时间，右边编辑 clip，点 Export MP4 导出

# 方法 2：看已经生成的两个 mp4
open examples/out/launch.mp4        # 我（Opus）设计的 12s 产品发布
open examples/out/sonnet-arcade.mp4  # Sonnet 设计的 13s 复古街机
```

## 已经存在的两个视频

| 文件 | 作者 | 时长 | 大小 | 主题 |
|---|---|---|---|---|
| `examples/out/launch.mp4` | Opus（我手写） | 12s 1080p h264 | 2.7MB | fluidBackground + meshGrid + kineticHeadline "NEXTFRAME" + shapeBurst + orbitRings + lowerThirdVelvet |
| `examples/out/sonnet-arcade.mp4` | **Sonnet subagent** | 13s 1080p h264 | 1.4MB | pixelRain Matrix → countdown "3,2,1,GO" → "ARCADE / INSERT COIN" |

**两个视频对比验证了整条管线**：AI 能独立设计主题、选场景、调参数、验证、导出。无人工介入。

## 这次做了什么

### 1. 彻底掉头（24h 前的 30 轮 Rust GUI 建造全部放弃）

旧方案问题：30 轮 Rust shell + wry + bridge + engine 堆砌 100+ 功能，走到 recorder 那一步发现 CLI 签名完全不匹配，walking skeleton 从未真正端到端跑通。

### 2. 19 个 POC 验证基础（A-V）

染色路径、架构、输出、AI 集成、并行、音频同步、多分辨率等。结论：napi-canvas 377ms / 帧可用，ffmpeg pipe 编码可用，多轨合成可用。

### 3. 7 个架构 POC 验证 AI 防呆（W1-W7）

最重要的一套——把"AI 怎么操作时间线"这件事想清楚：
- W1 `scene.describe()` → 让 AI 不看像素就知道画面有啥
- W2 ASCII gantt → 让 AI 一眼看懂多轨结构
- W3 ASCII screenshot → 免费视觉替代（95% 场景够用）
- W4 symbolic time → AI 不写秒数，只写"在 marker-drop 之后 0.5 秒"
- W5 AI tool surface → 7 个函数接口，5 步节奏（THINK→SEARCH→PATCH→ASSERT→RENDER）
- W6 (合并到 sonnet 直接跑) — 已验证：sonnet 用 13 次工具调用做出完整视频
- W7 Sonnet vision 验证 → 95% metadata + 5-15% vision 的架构决策

### 4. 7 份架构文档（spec/architecture/）

```
00-principles.md    — 7 条不变量 + 禁用清单
01-layering.md      — L1-L5 分层
02-modules.md       — scene 必须导出 render + describe + META
03-conventions.md   — Rust/JS 代码规范
04-interfaces.md    — 完整 TypeScript-like API 签名
05-safety.md        — 6 个 safety gate
06-ai-loop.md       — 完整 AI 操作模型 + 5 步节奏 + 时间铁律
07-roadmap.md       — walking → v0.1 → v0.2 → v1.0 路线
```

### 5. BDD 模块（spec/cockpit-app/bdd/）

```
cli-render/         — 8 场景：render/frame/validate/describe/gantt/ascii
cli-timeline-ops/   — 10 场景：new/add/move/resize/remove/set-param/add-marker/list/dup
```

每模块 5 文件：bdd.json + ai_ops.json + design.json + ai_verify.json + prototype.html。

### 6. **nextframe-cli/ 真实可跑 CLI**

这是核心产出。完整结构：

```
nextframe-cli/
├── package.json          （ESM，两个依赖：@napi-rs/canvas + pngjs）
├── README.md             （快速开始 + 子命令表 + AI Director 说明）
├── bin/nextframe.js      （调度器）
├── src/
│   ├── engine/
│   │   ├── time.js       （symbolic time resolver + 环检测 + 0.1s 量化）
│   │   ├── validate.js   （6 个 safety gate）
│   │   ├── render.js     （renderAt 多轨合成）
│   │   └── describe.js   （语义帧元数据）
│   ├── scenes/           （21 个场景，每个都有 render + describe + META）
│   ├── targets/
│   │   ├── napi-canvas.js
│   │   └── ffmpeg-mp4.js
│   ├── cli/              （9 个子命令）
│   ├── views/
│   │   ├── gantt.js
│   │   └── ascii.js
│   └── ai/tools.js
├── examples/
│   ├── minimal.timeline.json
│   ├── launch.timeline.json      ← Opus 写
│   ├── sonnet.timeline.json       ← Sonnet 写
│   └── out/                       ← 渲染好的 mp4
├── preview/              （HTTP server + 纯 JS UI）
│   ├── server.mjs
│   ├── preview.html
│   ├── app.css
│   └── app.js
└── test/smoke.test.js    （6/6 pass）
```

9 个子命令：
```
new / validate / frame / render / describe / gantt / scenes / add-clip / move-clip
```

### 7. HTML 预览 (preview/)

端口 5173，纯 JS 无框架。功能：
- 加载 timeline.json
- 拖动滑块看任意时间点画面（调 /api/frame 渲染单帧 PNG）
- 看 ASCII gantt
- 点 clip 打开 inspector 编辑 start/dur/params，自动保存 + 自动重渲当前帧
- **Export MP4** 按钮 → 调 /api/render → 返回 mp4 URL → 在页面里播放
- **AI Director** 面板 → 输入自然语言 → 后端 spawn `claude -p --model sonnet` subprocess → 让 sonnet 改 timeline → 轮询 /api/ai-status 看进度

### 8. Sonnet 独立做视频（P0 验证）

派了一个 model=sonnet 的 subagent 完全独立地：
1. `nextframe scenes` 看 21 个场景 META
2. 选主题（Retro Arcade）
3. 写 13s timeline.json（4 轨 9 clip 3 章节 2 marker）
4. `nextframe validate` → ok
5. `nextframe frame X 1 probe_t1.png` + t=6 + t=12 三次 probe
6. Read 每个 PNG 视觉评估
7. `nextframe render` → 1.4MB h264 13s 1080p
8. ffprobe 验证
9. 写自评报告

**总用时 4 分钟，13 次 CLI 调用。零干预。**

这直接验证了 `spec/architecture/06-ai-loop.md` 的 5 步节奏在现实中跑得通。

## 代码质量

- 6/6 smoke test pass（scenes/validate/frame/describe/render/mp4 full pipeline）
- ESM only，no TS，no framework，pure Node ≥ 20
- 所有 API 返回 `{ok, value, error, hints}`，不 throw
- Frame-pure：scene 不能有顶级 state / Math.random / Date.now
- 所有时间可 symbolic，可 quantize 0.1s
- 6 个 safety gate 编译进 validate

## git log（新增的提交）

```
ec90278 feat(example): sonnet.timeline.json — retro arcade boot (sonnet-authored)
2b110ba test(cli): smoke test — scenes/validate/frame/describe/render e2e
5dac414 docs(cli): README — quick start, subcommand reference, HTML preview, AI director
3b05f84 feat(cli): nextframe-cli walking skeleton + HTML preview + AI director
16e0b6a docs(bdd): cli-timeline-ops module — mutation commands BDD
2f4cf7e docs(bdd): cli-render module — 5 BDD files for v0.1.5 implement phase
42b2f93 docs(arch): 07-roadmap — walking → v0.1 → v0.2 → v1.0 path
cc9c6a3 docs(arch): 7 design docs fixing W1-W7 learnings
dd1840b feat(poc): W1 scene.describe() — semantic frame metadata for AI
30f6196 feat(poc): W7 real vision LLM (sonnet) — 95% metadata + 5-15% vision validated
2a035c5 feat(poc): W5 AI tool surface — 7 functions + 5-step rhythm
172f94d feat(poc): W4 symbolic time resolver — AI never writes raw seconds
9745c98 feat(poc): W2 ASCII gantt — multi-track timeline as text for LLM
ac6528c feat(poc): W3 ASCII screenshot — free LLM "vision"
```

（还有 6579c31 retrofit 21 scenes，78d64b7 agent 初始化，edda345 bootstrap。）

## 还没做的

- **add-clip 子命令的参数解析可能不完整**（没端到端测）——人手写 JSON 能绕开
- **音频轨道**——v0.1 只支持视频，无音频混音（POC O 验证过可行，未集成）
- **Scene hot reload**（POC R 验证过）
- **GUI 桌面壳**——按 07-roadmap.md 属于 v0.2，不做

## 你早上起来要做什么

1. **先看 examples/out/sonnet-arcade.mp4**——这是 AI 独立做的，直接验证命题
2. **开 preview/server.mjs**，浏览器打开 http://localhost:5173，试试滑块和 AI Director
3. 如果要让 AI 做新视频：
   - 方法 A：UI 里在 AI Director 面板输入要求，等它跑（实时日志可见）
   - 方法 B：命令行 `node bin/nextframe.js new /tmp/x.json && 手改 JSON && render`

## 一句话

**CLI 已跑通，AI 已证明能独立做出视频，HTML 预览可用，下一步按 07-roadmap.md 进 v0.1.4 lint 或直接进 v0.1.5 implement 补 add-clip 这类细节。**
