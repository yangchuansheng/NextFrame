# 13 — Project Documentation for AI Agents

**CLAUDE.md 和 AGENTS.md 是 AI 的入口。写得好 = AI 一次上手。写得差 = 每次浪费 context。**

## 核心原则

1. **短** — CLAUDE.md ≤ 30 行/crate，根目录 ≤ 50 行。~150 条指令是上限，超了合规性下降
2. **实用** — 每行问自己：没有这行 AI 会犯错吗？不会就删
3. **可发现** — 告诉 AI 怎么找信息，不把信息全塞进去
4. **分层** — 根目录放通用规则，子目录/crate 放局部规则
5. **迭代** — AI 犯错 → 加规则 → 验证不再犯。不预设

## 文件体系

```
NextFrame/
├── .claude/CLAUDE.md           ← Claude Code 读的（项目级）
├── AGENTS.md                   ← Codex 读的（项目级）
├── src/nf-bridge/CLAUDE.md     ← crate 级
├── src/nf-shell/CLAUDE.md
├── src/nf-recorder/CLAUDE.md
├── src/nf-tts/CLAUDE.md
└── src/nf-publish/CLAUDE.md
```

## 根目录 CLAUDE.md 模板（≤ 50 行）

```markdown
# {Project} — {一句话描述}

## 构建
{一条命令构建}
{一条命令测试}
{一条命令 lint}

## CLI
{AI 入口命令 + --help}

## 核心规则
- {规则 1 — AI 不知道就会犯错的}
- {规则 2}
- {规则 3}
- {规则 4}
- {规则 5}

## 模块
{简要列表，每个一句话}

## 找信息
- 规范：spec/standards/
- 架构：spec/architecture/
- 组件：nextframe scenes
```

**不放的：** 教程、历史、设计理念、完整 API 文档。这些放 spec/。

## Crate 级 CLAUDE.md 模板（≤ 30 行）

```markdown
# {crate} — {一句话}

## 构建
cargo check -p {crate}
cargo test -p {crate}

## 结构
src/
├── feature_a/    ← {说明}
├── feature_b/    ← {说明}
└── util/         ← {说明}

## 规则
- {这个 crate 特有的约束}
- {比如：所有 IPC handler 走 validation.rs 检查参数}
```

## AGENTS.md 模板（Codex 用）

```markdown
# NextFrame

AI-native video editor. Rust + JS, macOS.

## Setup
cargo check --workspace
node src/nf-cli/bin/nextframe.js --help

## Standards
Read spec/standards/ for all coding rules.

## Testing
cargo test --workspace
bash scripts/lint-all.sh

## Key Conventions
- All crate names start with nf-
- IPC methods: domain.camelCase (e.g. timeline.load)
- Errors must include "Fix:" suggestion
- No unwrap/expect/panic in production code
```

## 内容规则

### 必须有
| 内容 | 为什么 |
|------|--------|
| 构建命令 | AI 第一件事是确认能编译 |
| 测试命令 | AI 改完代码要验证 |
| 核心约束 | AI 不知道就犯错的规则 |
| 模块导航 | AI 知道去哪找代码 |

### 不准有
| 内容 | 为什么 |
|------|--------|
| 完整 API 文档 | 浪费 context，AI 读代码更准 |
| 教程/入门指南 | AI 不需要学，需要规则 |
| 变更历史 | git log 更权威 |
| 设计理念长文 | 放 spec/，不放 CLAUDE.md |
| AI 已经正确做的事 | 每条多余指令稀释有效指令 |

## 渐进式披露

不把所有信息塞给 AI。告诉它怎么找：

```markdown
## 找信息
- 组件列表：nextframe scenes
- IPC 方法：grep dispatch_inner src/nf-bridge/src/lib.rs
- 规范标准：cat spec/standards/00-index.md
- 架构设计：ls spec/architecture/
```

AI 需要时自己去查，不浪费 context。

## 审计检查

```bash
# CLAUDE.md 行数检查
wc -l .claude/CLAUDE.md
# ≤ 50 行

# 每个 crate 的 CLAUDE.md
for f in src/*/CLAUDE.md; do
  lines=$(wc -l < "$f")
  [ "$lines" -gt 30 ] && echo "TOO LONG: $f ($lines lines)"
done

# AGENTS.md 存在
[ -f AGENTS.md ] && echo "OK" || echo "MISSING: AGENTS.md"

# 必须包含构建命令
grep -q 'cargo\|build\|check' .claude/CLAUDE.md || echo "MISSING: build command in CLAUDE.md"
```

## 更新时机

- **加了新 crate** → 加 CLAUDE.md
- **AI 重复犯同一个错** → 加规则到对应层级的 CLAUDE.md
- **规则没用了**（AI 已经不犯这个错）→ 删掉，减少噪音
- **每季度审查** → 删掉过时的、合并重复的
