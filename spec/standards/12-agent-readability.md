# 12 — Agent Readability

**目标：AI agent 读代码像读文档，不猜、不搜、不问。**

## CLAUDE.md 规范

项目根和每个 crate 都有 CLAUDE.md，**短小精悍**：

```markdown
# {crate name} — {一句话}

## 构建
{一条命令}

## 核心约束
- {3-5 条最重要的规则}

## 模块结构
{简要目录树}
```

- 总行数 ≤ 30 行
- AI 每次会话开头读一遍，太长浪费 context
- 只放"是什么 + 怎么构建 + 核心约束"，不放教程

## Gold Standard 范例文件

每类文件放一个"标准范例"，AI 照着写新文件：

| 类型 | 范例文件 | 作用 |
|------|---------|------|
| 场景组件 | `components/headline.js` | 新组件照这个写 |
| IPC handler | `domain/project.rs` | 新 handler 照这个写 |
| 集成测试 | `tests/integration/fs_tests.rs` | 新测试照这个写 |
| CLI 命令 | `commands/project/project-new.js` | 新命令照这个写 |

范例文件头部加注释：
```rust
//! Gold standard: new IPC handlers should follow this file's pattern.
```

## 域知识内嵌

### 同义词注释
复杂概念旁边写同义词，AI 搜索时更容易命中：

```rust
/// Project — top-level container for episodes and segments.
/// Also known as: workspace, collection, show.
pub struct Project { ... }
```

```js
// Timeline — the master document describing all tracks, clips, and timing.
// Also known as: composition, sequence, edit decision list (EDL).
```

### Why 注释优先
AI 能读代码知道 what，但猜不到 why：

```rust
// Skip first frame — WebView renders a blank white frame before content loads.
// This is a WebKit behavior on file:// URLs, not a bug in our code.
if frame_index == 0 { continue; }
```

## 结构一致性

### 每个 Rust crate 同一结构
```
src/nf-xxx/
├── CLAUDE.md           ← 30 行以内
├── Cargo.toml
└── src/
    ├── lib.rs / main.rs
    ├── feature_a/
    │   └── mod.rs      ← 契约
    └── feature_b/
        └── mod.rs
```

### 每个 JS 模块同一结构
```
src/nf-runtime/web/src/{module}/
├── index.js            ← 入口 + re-export
├── feature_a.js
└── feature_b.js
```

AI 看过一个模块的结构，就知道所有模块怎么找。

## 不重名

- 项目内不允许两个文件叫同一个名字（除了 mod.rs/index.js）
- AI 搜到多个同名文件会困惑，浪费 context 读每一个
- 用前缀区分：`export_runner.rs` 不叫 `runner.rs`

## 可搜索性

### 函数名 = 功能描述
```rust
// 好：搜 "export" 就能找到
fn handle_export_start(params: &Value) -> Result<Value, String>

// 坏：搜不到
fn hes(p: &Value) -> Result<Value, String>
```

### 常量集中定义
```rust
pub(crate) const EXPORT_RUNNING: &str = "running";
pub(crate) const EXPORT_DONE: &str = "done";
pub(crate) const EXPORT_FAILED: &str = "failed";
```

AI grep "EXPORT_" 就能找到所有状态。

## 反馈循环

AI 改了代码需要快速验证：

| 操作 | 验证方式 | 时间预算 |
|------|---------|---------|
| 改 Rust | `cargo check -p nf-xxx` | ≤ 5s |
| 改 JS | 刷新浏览器 | ≤ 1s |
| 改 timeline | `nextframe validate` | ≤ 200ms |
| 改组件 | `nextframe lint-scenes` | ≤ 500ms |
| 全量检查 | `bash scripts/lint-all.sh` | ≤ 30s |

**不能跑全量测试才知道对不对。** 单模块验证必须快。

## 每次 AI 犯错后

1. 分析 AI 为什么犯错（缺文档？命名误导？结构不一致？）
2. 修环境防止再犯（加注释？改名？加 lint 规则？）
3. 更新 CLAUDE.md 或 standards

**AI 犯错 = 环境的 bug，不是 AI 的 bug。**
