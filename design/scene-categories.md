---
title: NextFrame Scene Categories
summary: 所有 scene 类型的分组清单。6 大类、60+ 具体 scene，标记已有原型和优先级。每个 scene 是一个纯函数 `render(t, params) → HTML`，时间线里按 id 引用。
---

# NextFrame Scene Categories

## 原则

- **Scene = 纯函数**：接收时间 t 和 params，输出当前帧 HTML/CSS/Canvas，无副作用、无累积状态
- **按 id 注册**：时间线 JSON 里写 `"scene": "fourier"`，引擎查表
- **组合优于继承**：特效叠加在内容 scene 上，转场作为独立 scene
- **P0/P1/P2 优先级**：
  - **P0** = MVP 必需（首发 demo 要能跑通一条完整视频）
  - **P1** = 第一轮迭代加入（覆盖 80% 场景）
  - **P2** = 长尾 / 特殊需求

---

## 1. 内容类（Content）

展示"实质内容"的 scene。

| id | 名称 | 说明 | 原型 | 优先级 |
|----|------|------|------|--------|
| `video` | 视频素材 | 播放本地/网络视频文件 | — | **P0** |
| `image` | 图片 | 单张图片定格或 ken-burns | `poc/04-atoms-showcase/09-ken-burns.html` | **P0** |
| `text` | 文字块 | 自定义字体、颜色、动画 | `poc/04-atoms-showcase/17-typewriter-code.html` | **P0** |
| `svgIcon` | SVG 图标 | 从资产库引用一个 icon | — | P1 |
| `shape` | 几何图形 | 矩形/圆/多边形（用于遮罩、装饰） | — | P1 |
| `code` | 代码高亮 | 带语法高亮的代码块 | `poc/04-atoms-showcase/17-typewriter-code.html` | P1 |
| `chart` | 图表 | 柱状/折线/饼图（数据可变动画） | `poc/05-top-tier/02-dashboard.html` | P2 |
| `markdown` | Markdown 块 | 富文本渲染 | — | P2 |
| `webembed` | iframe 嵌入 | 网页截图/嵌入 | — | P2 |

---

## 2. 生成动画类（Generative）

纯数学/算法驱动，不依赖素材。

| id | 名称 | 说明 | 原型 | 优先级 |
|----|------|------|------|--------|
| `fourier` | 傅立叶画线 | 多个旋转向量合成封闭曲线 | `poc/07-fourier-engine/fourier/` | **P0** |
| `particle` | 粒子系统 | 通用粒子（火花/烟/尘） | `poc/05-top-tier/05-particle-art.html` | **P0** |
| `flow-field` | 流场 | Perlin noise 驱动的流线 | — | P1 |
| `lissajous` | 李萨如曲线 | 参数化正弦合成 | — | P1 |
| `tunnel` | 隧道 | 透视隧道效果 | `poc/04-atoms-showcase/24-tunnel.html` | P1 |
| `constellation` | 星座连线 | 点阵 + 自动连线 | `poc/04-atoms-showcase/22-galaxy.html` | P1 |
| `fluid-wave` | 流体波 | 水面/光波扭曲 | `poc/04-atoms-showcase/23-fluid-wave.html` | P1 |
| `galaxy` | 星系旋转 | 螺旋星云 | `poc/04-atoms-showcase/22-galaxy.html` | P1 |
| `morph-text` | 文字形变 | SVG 路径插值 | `poc/05-top-tier/04-morphing-text.html` | P1 |
| `rotating-cube` | 旋转立方体 | 3D 立方体 | `poc/04-atoms-showcase/21-rotating-cube.html` | P2 |
| `webgl-hero` | WebGL 英雄画面 | shader 驱动背景 | `poc/05-top-tier/03-webgl-hero.html` | P2 |
| `l-system` | L-System | 分形植物 | — | P2 |

---

## 3. 叠加 UI 类（Overlay UI）

显示在内容上的信息层，常见于 vlog/解说。

| id | 名称 | 说明 | 原型 | 优先级 |
|----|------|------|------|--------|
| `titleCard` | 标题卡 | 全屏标题 + 副标题 | — | **P0** |
| `lowerThird` | 下三分之一 | 姓名 + 头衔条 | `poc/04-atoms-showcase/20-lower-third.html` | **P0** |
| `caption` | 字幕 | 底部字幕（字级同步 vox） | `poc/04-atoms-showcase/18-karaoke.html` | **P0** |
| `karaoke` | 卡拉 OK 字幕 | 逐字高亮 | `poc/04-atoms-showcase/18-karaoke.html` | P1 |
| `chapter` | 章节提示 | 全屏章节号 + 名 | — | P1 |
| `countdown` | 倒计时 | 3-2-1 起始 | — | P1 |
| `hud` | HUD 指示器 | 右上角 / 四角 UI 框 | `poc/05-top-tier/02-dashboard.html` | P1 |
| `progress-bar` | 进度条 | 顶部进度线 | — | P1 |
| `badge` | 角标 | "NEW"/"LIVE" 标签 | — | P2 |
| `watermark` | 水印 | logo + 半透明 | — | P2 |
| `neon-sign` | 霓虹招牌 | 发光文字 | `poc/04-atoms-showcase/19-neon-sign.html` | P2 |

---

## 4. 特效类（Effects / Filters）

叠加在其他 scene 上的滤镜和修饰。

| id | 名称 | 说明 | 原型 | 优先级 |
|----|------|------|------|--------|
| `blur` | 模糊 | 高斯模糊 | — | **P0** |
| `glow` | 发光 | 外发光 | — | **P0** |
| `vignette` | 暗角 | 四角变暗 | — | **P0** |
| `chromatic` | 色差 | RGB 分离 | — | P1 |
| `glitch` | 故障 | 抖动 + 色差 + 错位 | `poc/04-atoms-showcase/05-glitch-text.html` | P1 |
| `vhs` | VHS 磁带 | 扫描线 + 跟踪误差 | `poc/04-atoms-showcase/06-vhs-tracking.html` | P1 |
| `film-grain` | 胶片颗粒 | 噪点 + 划痕 | `poc/04-atoms-showcase/01-film-grain.html` | P1 |
| `crt` | CRT 显示器 | 扫描线 + 曲面 | `poc/04-atoms-showcase/02-crt-tv.html` | P1 |
| `duotone` | 双色调 | 单色映射 | `poc/04-atoms-showcase/08-duotone-pulse.html` | P1 |
| `lens-flare` | 镜头光晕 | 太阳光斑 | `poc/04-atoms-showcase/04-lens-flare.html` | P1 |
| `vaporwave` | 蒸汽波 | 紫粉渐变 + 网格 | `poc/04-atoms-showcase/07-vaporwave.html` | P2 |
| `letterbox` | 黑边 | 宽银幕黑条 | `poc/04-atoms-showcase/03-letterbox-reveal.html` | P2 |
| `snow` | 雪花 | 覆盖层粒子 | `poc/04-atoms-showcase/14-snow-night.html` | P2 |
| `heart-rain` | 爱心雨 | 装饰粒子 | `poc/04-atoms-showcase/15-heart-rain.html` | P2 |
| `confetti` | 彩纸 | 撒花粒子 | `poc/04-atoms-showcase/13-confetti.html` | P2 |
| `beat-strobe` | 节拍闪光 | 跟 BPM 闪屏 | `poc/04-atoms-showcase/16-beat-strobe.html` | P2 |

---

## 5. 转场类（Transitions）

连接两段 scene 的过渡 scene，通常时长 0.3-1s。

| id | 名称 | 说明 | 原型 | 优先级 |
|----|------|------|------|--------|
| `crossfade` | 交叉淡化 | opacity 互切 | — | **P0** |
| `cut` | 直切 | 无过渡（零时长） | — | **P0** |
| `wipe` | 擦除 | 方向性擦除（左/右/上/下） | — | **P0** |
| `slide` | 滑动 | 整屏滑入滑出 | — | P1 |
| `whip-pan` | 甩镜 | 快速模糊横移 | `poc/04-atoms-showcase/11-whip-pan.html` | P1 |
| `zoom-punch` | 变焦冲击 | 快速缩放切换 | `poc/04-atoms-showcase/12-zoom-punch.html` | P1 |
| `morph` | 形变 | SVG 路径融合 | `poc/05-top-tier/04-morphing-text.html` | P1 |
| `iris` | 光圈 | 圆形收缩/扩张 | — | P2 |
| `page-turn` | 翻页 | 3D 书页效果 | — | P2 |
| `dissolve` | 溶解 | 噪点融合 | — | P2 |
| `glitch-cut` | 故障切换 | glitch 过程中切 | — | P2 |

---

## 6. 音频类（Audio）

音频 scene 不可视，但占据音频轨道。

| id | 名称 | 说明 | 原型 | 优先级 |
|----|------|------|------|--------|
| `voiceover` | 配音 | vox TTS 产出，带字级时间戳 | — | **P0** |
| `bgm` | 背景音乐 | 循环或单次 | — | **P0** |
| `sfx` | 音效 | 点击、whoosh、击打 | — | **P0** |
| `ambient` | 环境音 | 风、雨、咖啡馆 | — | P1 |
| `ducking` | 自动闪避 | 人声出现时 bgm 自动降音 | — | P1 |
| `equalizer` | 均衡器 | 频段调节（可视化给 hud） | — | P2 |

---

## 7. 特殊 scene

| id | 名称 | 说明 | 优先级 |
|----|------|------|--------|
| `empty` | 空 scene | 占位符，纯黑或透明 | P0 |
| `debug` | 调试 scene | 显示 t / fps / frame 号 | P0 |
| `parallax` | 视差滚动 | 多层不同速度 | `poc/04-atoms-showcase/10-parallax.html` P1 |
| `parallax-scene` | 视差场景（高级） | `poc/05-top-tier/06-parallax-scene.html` | P1 |
| `product-reveal` | 产品展示 | 3D 旋转 + 光照 | `poc/05-top-tier/01-product-reveal.html` | P2 |

---

## 8. P0 scene 总清单（MVP）

**只做这 15 个就能跑通第一条完整视频**：

### 内容
1. `video`
2. `image`
3. `text`

### 生成
4. `fourier`
5. `particle`

### 叠加
6. `titleCard`
7. `lowerThird`
8. `caption`

### 特效
9. `blur`
10. `glow`
11. `vignette`

### 转场
12. `crossfade`
13. `cut`
14. `wipe`

### 音频
15. `voiceover` + `bgm` + `sfx`（同一个实现器）

---

## 9. scene 命名规范

- **id**：kebab-case，英文单词，语义化：`lower-third` ✅、`lt3` ❌
- **展示名**：中文 + 英文并列："下三分之一 Lower Third"
- **分类标签**：上述 6 类之一，UI 按 tag 过滤
- **icon**：每个 scene 在 Lucide 里挑一个对应图标
- **预览**：每个 scene 提供一张静态缩略图（`thumb.png` 512×288）
- **params schema**：JSON schema，决定 inspector 显示什么控件

### 注册示例

```json
{
  "id": "fourier",
  "name": "傅立叶画线",
  "category": "generative",
  "icon": "sparkles",
  "thumb": "/assets/scenes/fourier/thumb.png",
  "priority": "P0",
  "params": {
    "points": { "type": "array", "default": [] },
    "color": { "type": "color", "default": "#ff7e55" },
    "speed": { "type": "number", "default": 1.0, "min": 0.1, "max": 5 }
  }
}
```

---

## 10. 扩展路径

- **社区 scene 市场**：v0.5+，用户可发布自定义 scene（一个 HTML 文件 + JSON schema）
- **AI 生成 scene**：给 Claude 看 20 个现有 scene 源码，让它按描述写新的
- **scene 组合**：允许 scene 嵌套（一个 scene 内部调用另一个 scene），用于模板化

---

## 参考

- **原子库索引**：`/Users/Zhuanz/bigbang/NextFrame/poc/04-atoms-showcase/index.html`
- **Top-tier 示范**：`/Users/Zhuanz/bigbang/NextFrame/poc/05-top-tier/` 下 6 个高保真 demo
- **Fourier 引擎**：`/Users/Zhuanz/bigbang/NextFrame/poc/07-fourier-engine/fourier/`
