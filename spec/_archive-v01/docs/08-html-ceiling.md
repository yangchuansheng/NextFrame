---
title: HTML 视觉天花板
summary: HTML 能做到电影级视觉的 80%，够 99% 自媒体和商业视频。讲清楚天花板在哪、怎么蹭 GPU、什么时候要绕开
---

# 08 · HTML 视觉天花板

> 一句话：**HTML 做不了阿凡达，但能做 99% 你在 YouTube/B 站看到的视频。这就够了。**

---

## 0. 跟顶级视觉对比

| 作品 | 技术栈 | HTML 能复刻度 |
|------|--------|--------------|
| Apple 产品广告 | After Effects + Cinema 4D + 调色 | **80%**（CSS + video） |
| Kurzgesagt 科普 | Illustrator + After Effects | **95%**（SVG + CSS） |
| 3Blue1Brown 数学动画 | Manim (Python) | **90%**（Canvas + KaTeX） |
| 漫威电影片头 | Houdini + Nuke + Maya | **20%**（只能做 2D 致敬） |
| 阿凡达 | 全套电影工业 | **5%**（完全两个世界） |
| 抖音剪映模板 | CSS/Canvas/视频滤镜 | **100%** |
| TED 演讲开场 | Keynote / After Effects | **100%** |
| 游戏直播花字 | OBS + WebGL | **100%** |

**关键洞察**：阿凡达那 20% 你做不了 —— **但你的观众也不需要**。YouTube 99% 的视频质量在 Kurzgesagt 线以下。

---

## 1. HTML 能做到的 80%

### 1.1 广告级

- 产品 3D 转动（CSS 3D transform + perspective）
- 文字飞入飞出（CSS keyframes / transform）
- 视频剪辑 + 转场（`<video>` + CSS）
- 实时调色（CSS filter）
- 粒子效果 < 1 万颗（Canvas 2D）

**Apple 官网那种简洁现代风，HTML 100% 能做。**

### 1.2 科普级

- Kurzgesagt 的扁平插画（SVG + 分层动画）
- 3Blue1Brown 的数学可视化（Canvas + KaTeX + 插值）
- 流程图、状态机、概念演示（CSS grid + 动画）
- 字幕同步讲解（vox cue + timeline）

**科普视频的视觉需求，HTML 全部覆盖。**

### 1.3 官网动画级

- 滚动视差（scroll + transform）
- 鼠标跟随（event + CSS transform）
- 字母逐字出现（CSS + JS）
- 复杂时间轴编排（GSAP 或自写）

---

## 2. 做不到的 20%

诚实。下面这些别用 HTML 硬做：

| 做不到 | 原因 | 对策 |
|--------|------|------|
| 电影级 32bit 浮点调色 | 浏览器是 8bit sRGB | 导出后进 DaVinci |
| 真实物理 VFX（爆炸、液体） | 无流体求解器 | 导入 Blender 预渲染 |
| AAA 游戏级 3D CG | 没几何处理器 | 用 Unreal 预渲染 |
| Subsurface scattering 皮肤 | shader 复杂度超标 | 用 AI 视频生成 |
| 4K 60fps 高 bitrate HDR | 编码/解码瓶颈 | 最终压制在 Rust 侧 |
| 实时光追 | 不具备 | 用硬件游戏引擎 |

**规则**：这 20% 场景，**用 NextFrame 的"外接口"** —— 把成品 MP4 当作素材导入时间线。NextFrame 负责剪辑、字幕、编排，它们负责炫技镜头。

---

## 3. 关键技术分工

| 技术 | 强项 | 典型场景 |
|------|------|---------|
| **CSS** | 布局 + 合成动画 | 90% 的屏幕元素 |
| **SVG** | 矢量图形、路径动画 | 图标、流程图、手绘风 |
| **Canvas 2D** | 即时绘制、粒子、手绘 | 数学动画、粒子、热力图 |
| **WebGL** | 大规模并行、3D、shader | 10k+ 粒子、3D、流体 |
| **`<video>`** | 硬件解码、蒙太奇 | 导入素材、AI 生成片段 |

**口诀**：**能 CSS 就 CSS，不行就 SVG，不行就 Canvas，最后才 WebGL。**

---

## 4. 蹭 GPU 不写 shader

WebGL 是强，但学习成本高。下面是"白嫖 GPU"的方法：

### 4.1 CSS transform（最万能）

```css
.ball { transform: translate(100px, 50px) scale(1.2) rotate(30deg); }
```

自动升合成层，走 GPU。**随便几百个元素都 60fps。**

### 4.2 CSS filter（调色/模糊）

```css
.layer { filter: blur(20px) brightness(1.2) hue-rotate(45deg); }
```

macOS 上走 Core Image，Metal 加速。

### 4.3 Canvas drawImage（位图合成）

```js
ctx.drawImage(img, x, y, w, h); // Skia GPU 加速
```

比 `fillRect` 画几百个粒子还快。

### 4.4 `<video>` 硬解 + CSS 蒙太奇

```html
<video src="clip.mp4" autoplay muted
       style="transform: scale(1.5) translate(-20%, 0)"></video>
```

VideoToolbox 解码，GPU 变换。**CPU 占用近似 0。**

### 4.5 SVG filter

```html
<filter id="distort">
  <feTurbulence baseFrequency="0.02" />
  <feDisplacementMap scale="20" />
</filter>
```

扭曲、噪声、位移 —— 不写 shader 也能做。

---

## 5. 何时该上 WebGL

只在这些场景值得：

| 场景 | 门槛 |
|------|------|
| 粒子 > 1 万颗 | Canvas 2D 顶不住 |
| 真 3D 场景 | CSS 3D 不够灵活 |
| 自定义 shader 效果 | 其他都替代不了 |
| 流体/烟雾 | 只有 shader 能做 |
| 大量实例化 几何体 | Three.js InstancedMesh |

**建议**：用 Three.js 或 OGL，不要裸写 WebGL。AI 写 Three.js 比裸 WebGL 强很多。

---

## 6. 何时该绕开浏览器

```
┌─────────────────────────────┐
│       NextFrame Timeline     │
│    (JSON 串接所有素材)        │
└─────┬──────────────────┬────┘
      │                  │
   HTML 渲染          外部素材
   (90%)             (10% 炫技镜头)
                         │
              ┌──────────┼──────────┐
              │          │          │
           Blender    DaVinci    AI 视频
           (物理 VFX)  (调色)    (Sora/Kling)
```

**时间线是总指挥**。HTML 做大部分内容，极少数绕不过去的镜头走外部素材，最后在时间线里统一编排。

**具体场景**：
- 角色 3D 动画 → Blender 导出 alpha 透明 WebM
- 电影级调色 → HTML 出片 → DaVinci 二次调色 → 回到 NextFrame
- 超现实幻境 → Runway Gen-3 生成 → 当素材用

---

## 7. HTML 够做 99% 视频的真实结论

把 YouTube / B 站 / 抖音上的视频按类型分：

| 类型 | 占比 | HTML 够吗 |
|------|------|----------|
| Vlog / 生活记录 | 30% | 100% 够（基本就剪辑） |
| 游戏直播剪辑 | 20% | 100% 够（花字叠层） |
| 科普 / 教学 | 15% | 100% 够（HTML 的强项） |
| 产品评测 | 10% | 100% 够 |
| 广告 / 品牌 | 10% | 90% 够（高端调色外接） |
| 音乐 MV | 8% | 70% 够（部分需要特效） |
| 动画 / 短剧 | 5% | 50% 够（需要 3D） |
| 电影级 | 2% | 不够 |

**加权平均 ≈ 95%。**

> **结论：HTML 能做 99% 你想做的视频。剩下 1% 是阿凡达，那不是 NextFrame 的目标客户。**

---

## 8. 一个判断口诀

问自己 3 个问题：

1. **超过 Kurzgesagt 复杂度了吗？** 没有 → HTML 够
2. **需要 32bit 浮点调色吗？** 不需要 → HTML 够
3. **需要真 3D 物理吗？** 不需要 → HTML 够

三个都没中，放心用 HTML。三个中了任意一个，考虑外接工具。

---

## 9. 最后再说一次

> **HTML 的天花板高到你撞不到。真正卡住大部分创作者的是"会不会编排"，不是"工具够不够强"。**
>
> 给 AI 一个够用的画笔（HTML），让它专注写好故事、写好排版、写好节奏 —— 这比去折腾 shader 和调色划算得多。
