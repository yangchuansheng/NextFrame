# 10 — AI Development Environment

**目标：让 AI 不可能犯错的开发环境。不靠文档教 AI，靠环境约束 AI。**

AI 写了错代码 = 环境没拦住 = 环境的 bug。

## 三层防线

```
第 1 层：编译期拦截（写错了编译不过）
第 2 层：运行时可观测（跑起来能看到一切）
第 3 层：验证期断言（改完了自动验证对不对）
```

---

## 第 1 层：编译期拦截

**原则：能用类型系统拦的，不用 runtime check。**

### Rust 侧

| 机制 | 作用 | 配置 |
|------|------|------|
| clippy deny 6 条 | unwrap/expect/panic/unreachable/todo/wildcard = 编译红线 | Cargo.toml |
| `pub(crate)` 默认 | AI 不小心暴露内部类型 → 编译报错 | 人工审查 |
| Cargo workspace lint 继承 | 新 crate 忘加 lint → 继承兜底 | `[lints] workspace = true` |
| 模块边界 | 反向依赖 → Cargo.toml 不允许 → 编译不过 | 依赖图 |
| 类型约束 | `Result<T, String>` 强制处理错误 | 编码规则 |

### JS 侧

| 机制 | 作用 | 检查 |
|------|------|------|
| lint-all.sh | var/console.log/文件大小/依赖方向 | 提交前跑 |
| validate 门禁 | Timeline JSON 6 道检查 | 编辑后自动跑 |
| scene lint | 组件 params/ratio/id 检查 | `nextframe lint-scenes` |

### 关键：AI 写完代码后第一件事

```bash
cargo check --workspace && cargo clippy --workspace -- -D warnings && bash scripts/lint-all.sh
```

不过 = 不提交。没有例外。

---

## 第 2 层：运行时可观测

**原则：AI 不用猜产品在干什么，随时能查。**

### 结构化日志

```rust
// 不要这样
println!("export started");

// 要这样
trace_log!("export", "start", json!({ "pid": pid, "path": path, "fps": fps }));
```

日志格式：
```json
{"ts":"2026-04-14T08:30:00Z","module":"export","event":"start","data":{"pid":1,"path":"/tmp/out.mp4"}}
{"ts":"2026-04-14T08:30:01Z","module":"export","event":"frame","data":{"n":1,"render_ms":12}}
{"ts":"2026-04-14T08:30:45Z","module":"export","event":"done","data":{"pid":1,"total_ms":45000}}
```

AI 用 `grep` + `jq` 就能分析。不需要看 UI。

### IPC 调用链

每个 bridgeCall 自动记录：

```json
{"method":"timeline.load","params":{"path":"..."},"ok":true,"ms":12}
{"method":"export.start","params":{"..."},"ok":false,"error":"ffmpeg not found","ms":3}
```

AI 看这个就知道哪个调用失败了、为什么失败、花了多久。

### DOM 语义标注

关键 UI 元素必须有 `data-nf-*` 属性：

```html
<div data-nf-role="preview" data-nf-time="5.3">
<div data-nf-role="clip" data-nf-clip-id="clip-3" data-nf-track="0">
<div data-nf-role="timeline" data-nf-duration="30">
<button data-nf-action="export" data-nf-state="idle">
```

AI 用 CSS selector 精确定位元素，不用猜 class name：
```js
document.querySelector('[data-nf-role="preview"]')
document.querySelector('[data-nf-clip-id="clip-3"]')
document.querySelectorAll('[data-nf-role="clip"]').length
```

### 状态快照

任意时刻导出当前产品状态：

```bash
nextframe app eval "JSON.stringify({
  page: currentView,
  project: currentProject,
  episode: currentEpisode,
  stage: pipelineStage,
  clipCount: document.querySelectorAll('[data-nf-role=clip]').length,
  timelineDuration: deriveTimelineDuration(timeline)
})"
```

AI 对比"期望状态 vs 实际状态"来判断操作是否成功。

### 崩溃现场

panic hook 写 `~/.nf-crash/crash-{timestamp}.json`：

```json
{
  "timestamp": "2026-04-14T08:30:00Z",
  "message": "index out of bounds",
  "backtrace": ["..."],
  "last_10_logs": ["..."],
  "system": { "os": "macOS 15.0", "memory_mb": 450 }
}
```

AI 下次启动读这个文件就能分析崩溃原因。

---

## 第 3 层：验证期断言

**原则：AI 改完代码后，用产品自己的工具验证，不用人看。**

### 改 timeline → validate

```bash
nextframe validate segment.json
# 6 道门禁自动检查：schema、scene-exists、overlap、bounds、font-size、ratio
# 返回 JSON：每条 pass/fail + fix 建议
```

### 改组件 → lint-scenes

```bash
nextframe lint-scenes
# 检查：id=文件名、params 有 schema、ratio 正确、render 函数存在
```

### 改 UI → 截图对比

```bash
# 改前
nextframe app screenshot -o before.png
# 改代码...
# 改后
nextframe app screenshot -o after.png
# AI 自己对比两张图
```

### 改 render → describe 断言

```bash
nextframe app eval "describeFrame(5)"
# 返回第 5 秒的语义描述
# AI 检查：title 是否正确、元素数量是否符合预期
```

### 改 Rust → cargo test

```bash
cargo test --workspace
# 243 个测试全过 = 没有回归
```

---

## 错误必须可修复

每条错误信息格式：

```
failed to {动作}: {原因}. Fix: {修复建议}
```

| 层 | 好的错误 | 坏的错误 |
|----|---------|---------|
| 编译 | `error: unused variable 'x'. Fix: prefix with _` | `error E0001` |
| 运行 | `failed to load timeline: file not found at /x. Fix: check path exists` | `Error: null` |
| 验证 | `gate font-size FAIL: clip c3 title 96px > max 54px. Fix: reduce to ≤54` | `validation failed` |

**没有 Fix 的错误 = 死胡同。AI 不知道下一步。= 环境的 bug。**

---

## 开发流程闭环

AI 写新功能的标准流程：

```
1. 写代码
2. cargo check + clippy          ← 第 1 层拦截
3. cargo test                    ← 回归检查
4. bash scripts/lint-all.sh      ← 全量 lint
5. nextframe validate            ← 数据检查（如果改了 timeline）
6. nextframe lint-scenes          ← 组件检查（如果改了 scene）
7. nextframe app screenshot       ← 视觉验证（如果改了 UI）
8. git commit                    ← 全过了才提交
```

**任何一步不过 = 回到第 1 步修。不跳步。**

---

## 新功能必须提供的可观测性

| 检查项 | 不满足 = |
|--------|---------|
| 关键操作有 trace_log | AI 看不到发生了什么 |
| DOM 元素有 data-nf-* | AI 找不到元素 |
| 错误信息有 Fix 建议 | AI 修不了 |
| 有 validate/lint 检查 | AI 验不了 |
| 状态可通过 app eval 查询 | AI 不知道当前情况 |

**5 项全满足 = AI 开发友好。缺一项 = 功能没做完。**
