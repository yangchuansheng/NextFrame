# G7 — Design Alignment

**骨架人定，血肉 AI 填。偏离骨架 = bug。**

## 三步闭环

```
理解 → 锁定 → 执行检查
```

### Step 1: 理解（让人真正懂）

每个关键设计决策，AI 必须用**类比 + 可视化**让人理解透彻：

- 一个核心逻辑 = 一个 HTML walkthrough
- 用日常生活类比解释技术概念
- 展示"对的长什么样" + "错的长什么样"
- 人说"我懂了" = 进入锁定

**输出：** `spec/cockpit-app/prototypes/{feature}-explained.html`

**不是文档。是交互式画面，能点、能看、能感受。**

例：
- "Timeline 的本质是什么？" → 类比乐谱：每个音符有开始时间和时长，多条谱线叠加
- "帧跳转为什么重要？" → 类比电梯：按楼层号直接到，不用一层层爬
- "Pipeline 5 阶段？" → 类比工厂流水线：原料→加工→组装→质检→出货

### Step 2: 锁定（人确认后不准改）

人理解并确认后，核心逻辑写入锁定文件：

```json
// spec/cockpit-app/data/dev/adrs.json
{
  "id": "ADR-010",
  "title": "Every timeline event maps to exactly one renderable frame",
  "status": "accepted",
  "confirmed_by": "human",
  "confirmed_date": "2026-04-14",
  "invariant": "For any time t in [0, duration], renderFrame(t) produces a deterministic visual output",
  "analogy": "Like a music score: any beat position has exactly one set of notes playing",
  "prototype": "spec/cockpit-app/prototypes/frame-mapping-explained.html",
  "consequences": "No lazy loading of frames, no async rendering, pure function of time"
}
```

**锁定字段：**
- `invariant` — 用代码语言描述不变量
- `analogy` — 用人话描述同一件事
- `prototype` — 可视化解释的 HTML 路径
- `confirmed_by: human` — 人确认过

### Step 3: 执行检查（AI 不偏离骨架）

AI 开发时的规则：

**开发前：**
- 读对应 ADR 的 invariant
- 读对应 BDD 的 Given/When/Then
- 读 prototype HTML 理解预期

**开发中：**
- 新代码不能违反 ADR invariant
- 如果需要改 invariant → 必须先回到 Step 1，人重新确认

**开发后：**
- 验证 invariant 是否被保持（测试 / describe / 截图）
- 对比 prototype vs 实际截图

## 什么必须走这个流程

| 类型 | 必须走？ | 例子 |
|------|---------|------|
| 核心不变量 | **必须** | 帧纯函数、timeline schema、IPC 协议 |
| 产品交互流程 | **必须** | Pipeline 5 阶段、项目三级结构 |
| 架构决策 | **必须** | 分层、crate 划分、技术选型 |
| 视觉风格 | **必须** | 设计语言、配色体系 |
| 具体实现细节 | 不需要 | 某个函数怎么写、CSS 怎么调 |
| Bug 修复 | 不需要 | 修一个具体的 bug |

**判断标准：如果这个决策错了，后面大量代码要重写 → 必须走。**

## 锁定文件的位置

```
spec/cockpit-app/
├── data/dev/adrs.json          ← 所有锁定的决策（ADR）
├── bdd/{module}/bdd.json       ← 所有锁定的行为（BDD）
├── prototypes/{feature}.html   ← 帮助理解的可视化
└── data/core/manifesto.json    ← 产品宪法（最高级锁定）
```

## AI 开发指令模板

AI 收到开发任务时，必须先执行：

```
1. 读 ADR：这个功能有哪些锁定的不变量？
2. 读 BDD：这个功能的 Given/When/Then 是什么？
3. 读 Prototype：预期的交互/视觉是什么样？
4. 开发
5. 验证：invariant 是否保持？BDD 是否满足？截图是否匹配 prototype？
```

**跳过 1-3 直接开发 = 违规。**

## 偏离处理

```
发现偏离 → 停止开发 → 回到 Step 1
  → 如果是 AI 理解错了 → 修代码
  → 如果是设计需要改 → 人重新确认 → 更新 ADR → 再开发
```

**AI 不能自己决定改 ADR。只有人能改。**
