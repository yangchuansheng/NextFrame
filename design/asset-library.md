---
title: NextFrame Asset Library
summary: 资产库设计。6 类资产、内置 + 用户 + AI 三源、按 id 引用、元数据索引、推荐免费源清单。缓存策略 + 搜索标签 + AI 素材接入。
---

# NextFrame Asset Library

## 一句话

**资产是 clip 消费的原材料。所有资产有统一的 id、元数据、来源标记，clip 通过 id 引用，不存路径。**

---

## 1. 资产类型

| 类型 | 扩展名 | 用途 | MIME |
|------|--------|------|------|
| **video** | mp4 / mov / webm | 视频 clip 素材 | video/* |
| **image** | png / jpg / webp / svg | 图片 clip、背景、icon | image/* |
| **audio** | mp3 / wav / m4a / ogg | 配音、bgm、sfx | audio/* |
| **font** | ttf / otf / woff2 | 文字 scene 使用 | font/* |
| **lut** | cube / 3dl | 色彩查找表（电影级调色） | text/lut |
| **svg-icon** | svg | UI 图标、装饰 | image/svg+xml |

**不作为资产**：纯生成 scene（fourier、particle），它们的参数存在 clip.params 里，不需要外部资源。

---

## 2. 资产引用方式：按 id，不按 path

### 为什么

| 问题 | path 方式 | id 方式 |
|------|-----------|---------|
| 移动项目目录 | 全部失效 | 不变 |
| 重命名文件 | 全部失效 | 不变 |
| 多人协作 | 路径不同步 | id 同步即可 |
| AI 操作 | 要处理字符串路径 | 用 id，简单 |
| 同一素材多处使用 | 重复存储 | 引用计数 |

### project JSON 里的引用

```json
{
  "assets": [
    { "id": "asset_7f3a", "type": "video", "path": "assets/clip1.mp4", ... }
  ],
  "tracks": [{
    "clips": [{
      "scene": "video",
      "params": { "assetId": "asset_7f3a" }
    }]
  }]
}
```

- `assets[]` 是项目内的索引表
- `path` 是相对项目目录的路径（迁移时整个目录一起搬）
- clip 永远用 `assetId`

---

## 3. 内置库 vs 用户库

### 内置库（Built-in）

**跟随 App 分发，版本锁定，不可修改。**

| 类别 | 数量目标 | 位置 |
|------|---------|------|
| SVG 图标 | 1000+（直接打包 Lucide） | `{app}/builtin/icons/` |
| 字体 | 10-20 款（开源字体） | `{app}/builtin/fonts/` |
| 音效 | 50+（UI 音、whoosh、击打） | `{app}/builtin/sfx/` |
| LUT | 20+（电影胶片模拟） | `{app}/builtin/luts/` |
| 示例素材 | 5 个（给 demo/模板用） | `{app}/builtin/demo/` |

内置库 id 格式：`builtin_{category}_{name}`，例如 `builtin_icon_play`。

### 用户库（User）

**每个用户本地存，跨项目共享。**

位置：`~/Library/Application Support/NextFrame/user-assets/`（macOS）

| 功能 | 说明 |
|------|------|
| 导入 | 拖文件到侧栏 / 菜单导入 / 从项目内右键"加入用户库" |
| 组织 | 文件夹 + 标签 |
| 搜索 | 按名字、标签、类型过滤 |
| 删除 | 软删除（带"最近删除"），30 天后清 |

用户库 id 格式：`user_{uuid}`。

### 项目库（Project）

**只存在于当前项目内，随项目保存。**

位置：`{project_dir}/assets/`

- 导入素材时默认复制到项目库（避免原文件移动丢失）
- 可选"仅引用外部"模式（节省空间，但有风险）
- id 格式：`proj_{uuid}`

### 优先级

clip 查找资产时按 `project → user → builtin` 顺序。用户库的 icon 可以覆盖同名内置 icon。

---

## 4. AI 素材接入

### 接入目标

让 AI 生成的素材自动进入资产库，不需要用户手动下载。

### 接入的服务

| 服务 | 类型 | 接入方式 |
|------|------|---------|
| **Kling** | 视频生成 | API 调用 → 下载 → 写入项目库 |
| **Runway** | 视频生成 | 同上 |
| **MidJourney** | 图片生成 | Discord bot / 非官方 API |
| **DALL-E 3** | 图片生成 | OpenAI API |
| **Suno** | 音乐生成 | API 调用 |
| **Udio** | 音乐生成 | API |
| **ElevenLabs** | 语音 | API，返回音频 + 时间戳 |
| **vox (本地)** | TTS | 命令行调用，返回 mp3 + 字级时间戳 |

### UI 流程

```
用户：在侧栏点"AI 生成" → 选 Kling → 输入 prompt → 选时长
         ↓
系统：调 Kling API → 等待（显示进度）→ 下载视频
         ↓
系统：写入项目库 → 生成缩略图 → 写 metadata → 刷新侧栏
         ↓
用户：拖到时间线
```

### Metadata 标记 AI 来源

```json
{
  "id": "proj_a1b2",
  "type": "video",
  "path": "assets/kling_a1b2.mp4",
  "source": {
    "kind": "ai",
    "provider": "kling",
    "model": "kling-1.5",
    "prompt": "a cat walking in snow",
    "cost_credits": 10,
    "created": "2026-04-11T..."
  }
}
```

这样后续可以"重新生成"、"查看 prompt"、"统计成本"。

---

## 5. 元数据（metadata）schema

```json
{
  "id": "proj_7f3a",
  "type": "video",
  "path": "assets/clip1.mp4",
  "name": "clip1.mp4",
  "size": 15728640,
  "created": "2026-04-11T10:00:00Z",

  // 视频/图片
  "dimension": [1920, 1080],
  "duration": 5.23,
  "fps": 30,
  "codec": "h264",
  "bitrate": 8000000,

  // 音频
  "sampleRate": 48000,
  "channels": 2,

  // 图片
  "format": "jpeg",
  "hasAlpha": false,

  // 通用
  "thumbnail": "thumbs/7f3a.jpg",
  "tags": ["城市", "夜景", "光影"],
  "color_palette": ["#1a2b3c", "#ff7e55"],
  "source": { "kind": "local", "importPath": "/Users/xx/Downloads/clip1.mp4" }
}
```

### 缩略图

- 视频：第 1 秒的帧，512×288 JPEG
- 图片：512 宽缩放，保持比例
- 音频：波形 PNG 512×64
- 字体：样张"AaBb中文" 512×128

缩略图在导入时用 ffmpeg/Canvas 生成，缓存到 `{asset_dir}/thumbs/`。

---

## 6. 资产搜索 / 标签

### 搜索字段

| 字段 | 说明 |
|------|------|
| name | 文件名模糊匹配 |
| tags | 标签精确匹配 |
| type | 类型过滤（video/image/...） |
| duration_range | 时长区间（只对 video/audio） |
| dimension_min | 最小尺寸（图片/视频） |
| source_kind | local / ai / builtin |
| color | 按主色检索（图片/视频） |

### AI 自动打标签

导入时：
1. 如果是图片/视频：调本地视觉模型（CLIP-like）产出 3-5 个描述标签
2. 如果是音频：调音频分类模型产出情绪/类型标签
3. 用户可以手动编辑

### UI

- 侧栏搜索框 + 标签 chip
- 快捷键 `Cmd+K` 全局资产搜索

---

## 7. 缓存策略

### 缓存层级

| 层级 | 位置 | 策略 |
|------|------|------|
| L1 内存 | JS Map | 当前项目使用的资产 metadata + 缩略图 blob，打开即加载 |
| L2 磁盘 | 项目目录 | 所有项目内资产文件 |
| L3 用户库 | ~/Library | 跨项目复用 |
| L4 CDN | 未来 | 内置库走 CDN（可选） |

### 视频解码缓存

- 拖动播放头时，同一段视频反复 seek 会解码多次
- 解决：用 `HTMLVideoElement` + `currentTime` 设置，浏览器自带缓存
- 更激进：预解码 N 帧存到 `ImageBitmap` 数组（耗内存，不默认开）

### 清理

- 缩略图缓存 LRU，上限 500MB
- 未被任何项目引用的用户库资产，30 天后清理（可选）

---

## 8. 免费资产源清单（推荐给用户）

**内置 App 的"从免费库导入"面板直接对接这些源的 API**。

### SVG 图标

| 源 | 网址 | 说明 |
|----|------|------|
| **Lucide** | lucide.dev | 内置，1000+ 线性图标 |
| Iconify | iconify.design | 200+ 图标集聚合，30万+ |
| Heroicons | heroicons.com | Tailwind 出品 |
| Tabler Icons | tabler-icons.io | 5000+ MIT |

### 图片

| 源 | 网址 | 许可 |
|----|------|------|
| Unsplash | unsplash.com | Unsplash License（免费商用） |
| Pexels | pexels.com | 免费商用 |
| Pixabay | pixabay.com | CC0 |

### 视频

| 源 | 网址 | 说明 |
|----|------|------|
| Pexels Videos | pexels.com/videos | 免费商用 |
| Pixabay Videos | pixabay.com/videos | CC0 |
| Coverr | coverr.co | 免费商用 |
| Mixkit | mixkit.co | 免费 |

### 音频

| 源 | 网址 | 类型 |
|----|------|------|
| Freesound | freesound.org | sfx / ambient（CC） |
| Pixabay Music | pixabay.com/music | BGM（免费商用） |
| Free Music Archive | freemusicarchive.org | 独立音乐 |
| Zapsplat | zapsplat.com | 专业 sfx（注册即免费） |

### 字体

| 源 | 网址 | 许可 |
|----|------|------|
| Google Fonts | fonts.google.com | OFL/Apache |
| 思源家族 | adobe-fonts | SIL OFL |
| 霞鹜文楷 | github.com/lxgw/LxgwWenKai | SIL OFL |

### 动画资源（未来）

| 源 | 网址 | 说明 |
|----|------|------|
| LottieFiles | lottiefiles.com | Lottie 动画（可以 scene 支持） |
| SVG Repo | svgrepo.com | SVG 动画 |

### LUT

| 源 | 网址 |
|----|------|
| RocketStock | rocketstock.com/free-after-effects-templates/35-free-luts |
| Freepresets | freepresets.com |

---

## 9. 侧栏素材库 UI 规范

### 布局

```
┌──────────────────────────┐
│  [搜索框]                │
├──────────────────────────┤
│  [视频][图片][音频][字][Scene] ← 类型 tab
├──────────────────────────┤
│  [#城市][#夜景][...]     ← 标签 chip（水平滚动）
├──────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐   │
│  │thumb│ │thumb│ │thumb│  ← 网格缩略图
│  │名字 │ │名字 │ │名字 │
│  └────┘ └────┘ └────┘   │
│  ...                      │
├──────────────────────────┤
│  [+ 导入] [+ AI 生成]    │
└──────────────────────────┘
```

### 交互

- 点击缩略图：右键菜单（预览 / 插入 / 加入用户库 / 删除）
- 双击：插入到当前播放头位置
- 拖拽：拖到时间线自动创建 clip
- hover：悬浮预览（视频自动播放静音前 3 秒）

---

## 10. 导入流程

```
用户拖文件到侧栏
     ↓
检测类型 + 校验
     ↓
复制到项目 assets/ 目录
     ↓
提取 metadata（ffprobe）
     ↓
生成缩略图
     ↓
（可选）AI 打标签
     ↓
写入 project.assets[]
     ↓
刷新侧栏网格
```

**错误处理**：

- 不支持的格式：提示转换
- 文件过大（>2GB）：提示确认
- 同名冲突：自动加后缀

---

## 11. 未来扩展

- **云资产库**：团队共享资产池，走自建 S3 或 CDN
- **付费素材市场**：Artgrid / Storyblocks API 对接
- **AI 语义搜索**：用 embedding 做"找一个像这张图的视频"
- **版本管理**：同一资产多版本（AI 多次生成结果）
