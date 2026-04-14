# Step 1: 确认素材 + 检查组件

## 1.1 确认素材

根据视频类型检查输入素材是否存在。

### 有素材（访谈切片）

```bash
# 视频片段
ls clips/clip_01.mp4
ffprobe -v quiet -show_entries format=duration -of csv=p=0 clips/clip_01.mp4

# 翻译数据 — 必须有 segments 数组
node -e "
  const f = require('./translate/clip_01.fine.json');
  console.log('segments:', f.segments.length, 'duration:', f.clip_duration);
  const seg = f.segments[0];
  console.log('sample:', JSON.stringify({s:seg.s, e:seg.e, speaker:seg.speaker, cn_count:seg.cn.length}));
"
```

**检查 fine.json 结构：**
- `segments` 是数组
- 每个 segment 有 `s`(number), `e`(number), `speaker`(string), `en`(string), `cn`(array)
- 每个 cn 条目有 `text`(string), `s`(number), `e`(number)
- segment.cn 的时间范围在 segment.s 和 segment.e 之内

如果结构不对 → 停。这是上游管线的问题，不在 NextFrame 解决。

### 纯创作（讲解视频）

```bash
# 确认有脚本或数据文件
ls script.md    # 脚本
ls data/*.json  # 或数据文件
```

纯创作不需要 fine.json，但需要知道总时长和内容分几个阶段（phase）。

## 1.2 检查组件

```bash
nextframe scenes
```

### 9:16 需要 7 个

| scene | 类别 | 作用 |
|-------|------|------|
| interviewBg | backgrounds | 深黑底 + 金色光晕 + 网格 + 暗角 |
| interviewHeader | overlays | 顶部系列名 + 标题 + 分隔线 |
| interviewVideoArea | media | 视频嵌入框（recorder 叠加真实视频） |
| interviewBiSub | overlays | 双语字幕（两级查找：segment→英文, cn[]→中文） |
| interviewMeta | overlays | 时间信息 + 话题 + 标签 |
| interviewBrand | overlays | 底部品牌 + 团队署名 |
| progressBar9x16 | overlays | 进度条 |

### 16:9 需要 9 个

| scene | 类别 | 作用 |
|-------|------|------|
| darkGradient | backgrounds | 深色暖棕背景 |
| headlineCenter | typography | 全屏居中大标题 |
| codeTerminal | browser | 代码块（单个 pre 元素） |
| flowDiagram | data | 流程图（单个 svg 元素） |
| lecturePanel | typography | 右侧说明面板 |
| subtitleBar | overlays | 底部字幕条 |
| progressBar | overlays | 底部进度条 |
| slideChrome | overlays | 顶部品牌栏 + 水印 |
| videoClip | media | 视频嵌入 |

## 分支

- **全有** → 跳到 `nextframe produce timeline`
- **缺组件** → 进 `nextframe produce scene`

## 下一步

```bash
# 缺组件
nextframe produce scene

# 组件齐全
nextframe produce timeline
```
