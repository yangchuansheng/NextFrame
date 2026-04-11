// ==========================================
// Fourier project — content definition.
// Author only touches this file (+ narration.txt).
// ==========================================

import { heroScene, fourierScene, spectrumScene, gridScene } from './scenes.js';

const FORMULA = `
  <span class="term" data-term="a">y =</span>
  <span class="term" data-term="1">sin(ωt)</span>
  <span class="term" data-term="b">+</span>
  <span class="term" data-term="3">sin(3ωt)/3</span>
  <span class="term" data-term="b">+</span>
  <span class="term" data-term="5">sin(5ωt)/5</span>
  <span class="term" data-term="b">+</span>
  <span class="term" data-term="7">sin(7ωt)/7</span>
  <span class="term" data-term="e">+ …</span>
`;

export default {
  title: "傅里叶 · 万物皆是圆的叠加",
  subtitle: "A 200-YEAR-OLD SPELL",
  audio: "./projects/fourier/narration.mp3",
  timeline: "./projects/fourier/narration.timeline.json",

  frames: [
    // ---- Frame 1: 方波的秘密 ----
    {
      scene: heroScene,
      startAt: "你看这条线",
      params: {
        title: "你看这条线",
        subtitle: "方方正正，像一座城堡的剪影",
        showWave: true,
      },
      cues: [
        { at: "方方",   op: "pulse" },
        { at: "直上",   op: "pulse" },
        { at: "毫不犹豫", op: "shake" },
        { at: "绝对想不到", op: "shake" },
        { at: "一堆",   op: "set_title", args: "它是用一堆圆画出来的" },
        { at: "画出来", op: "reveal" },
      ],
    },

    // ---- Frame 2: 一个圆 ----
    {
      scene: fourierScene,
      startAt: "先从最简单",
      params: {
        mode: "real-square",
        numCircles: 1,
        speed: 0.28,
        stageTag: "STEP 1",
        stageTitle: "一个圆 → 一条波浪",
      },
      cues: [
        { at: "一个圆", op: "count", args: { num: "1", label: "一个圆" } },
        { at: "红点",   op: "anno",  args: { id: "dot", text: "圆边上的红点 · 笔尖",  x: "22%", y: "14%" } },
        { at: "让圆转", op: "anno_hide", args: "dot" },
        { at: "红点的高度", op: "anno", args: { id: "h", text: "↑ 红点的高度", x: "24%", y: "14%" } },
        { at: "画到右边", op: "anno",  args: { id: "draw", text: "画成一条曲线 →", right: "20%", y: "14%" } },
        { at: "波浪",   op: "anno_hide", args: "h" },
        { at: "正弦波", op: "count", args: { num: "sin", label: "SINE · 正弦波" } },
        { at: "复杂图形", op: "anno_hide", args: "draw" },
      ],
    },

    // ---- Frame 3: 两个圆 ----
    {
      scene: fourierScene,
      startAt: "现在奇迹",
      params: {
        mode: "real-square",
        numCircles: 1,
        speed: 0.28,
        stageTag: "STEP 2",
        stageTitle: "第二个圆 · 奇迹开始",
      },
      cues: [
        { at: "第一步", op: "count", args: { num: "1", label: "一个圆" } },
        { at: "再装一个", op: "set_circles", args: { n: 2 } },
        { at: "三倍快", op: "count", args: { num: "2", label: "两个圆" } },
        { at: "不再是平滑", op: "anno", args: { id: "corner", text: "← 开始有了棱角", right: "18%", y: "24%" } },
        { at: "方波的影子", op: "show_target" },
        { at: "隐约浮现", op: "anno", args: { id: "ghost", text: "蓝色虚线 = 目标方波", right: "18%", bottom: "18%" } },
      ],
    },

    // ---- Frame 4: 一堆圆 ----
    {
      scene: fourierScene,
      startAt: "再加一个",
      params: {
        mode: "real-square",
        numCircles: 2,
        speed: 0.28,
        showTarget: true,
        stageTag: "STEP 3",
        stageTitle: "一堆圆 · 逐渐逼近",
      },
      cues: [
        { at: "再加一个", op: "set_circles", args: { n: 3 } },
        { at: "五倍快",   op: "count", args: { num: "3", label: "三个圆" } },
        { at: "再一个",   op: "set_circles", args: { n: 4 } },
        { at: "七倍快",   op: "count", args: { num: "4", label: "四个圆" } },
        { at: "三个圆",   op: "set_circles", args: { n: 3, snap: true } },
        { at: "有点像",   op: "count", args: { num: "3", label: "有点像了" } },
        { at: "九个圆",   op: "set_circles", args: { n: 9, snap: true } },
        { at: "几乎到位", op: "count", args: { num: "9", label: "几乎到位" } },
        { at: "十九个",   op: "set_circles", args: { n: 19, snap: true } },
        { at: "肉眼",     op: "count", args: { num: "19", label: "肉眼分不出" } },
      ],
    },

    // ---- Frame 5: 咒语（规律 + 公式）----
    {
      scene: fourierScene,
      startAt: "你大概察觉",
      params: {
        mode: "real-square",
        numCircles: 19,
        speed: 0.22,
        showTarget: true,
        formula: FORMULA,
        stageTag: "LAW",
        stageTitle: "傅里叶的咒语",
      },
      cues: [
        { at: "规律",     op: "formula_show" },
        { at: "DN个圆",   op: "formula_hi", args: ["1"] },
        { at: "N倍快",    op: "rule", args: "速度 = n 倍快" },
        { at: "分之一",   op: "rule", args: "半径 = 1 / n" },
        { at: "基数",     op: "rule", args: "只用奇数" },
        { at: "五七九",   op: "formula_hi", args: ["1", "3", "5", "7"] },
        { at: "复理液",   op: "rule", args: "— Joseph Fourier · 1822" },
        { at: "两百年前", op: "count", args: { num: "200", label: "YEARS AGO" } },
        { at: "破壳",     op: "rule_hide" },
      ],
    },

    // ---- Frame 6: 万物皆可画 ----
    {
      scene: fourierScene,
      startAt: "这个魔法",
      params: {
        mode: "real-square",
        numCircles: 19,
        speed: 0.22,
        showTarget: true,
        formula: FORMULA,
        stageTag: "REMIX",
        stageTitle: "换一组配方 → 任意形状",
      },
      cues: [
        { at: "不止",     op: "rule", args: "配方可以换" },
        { at: "三角波",   op: "count", args: { num: "△", label: "三角波" } },
        { at: "再换一组", op: "morph_shape", args: { shape: "heart", label: "心形 / HEART" } },
        { at: "星星",     op: "shape_terms", args: 100 },
        { at: "一只猫",   op: "morph_shape", args: { shape: "cat", label: "🐱 一只猫的轮廓" } },
        { at: "万物皆可", op: "shape_terms", args: 160 },
      ],
    },

    // ---- Frame 7: 反过来（spectrum）----
    {
      scene: spectrumScene,
      startAt: "反过来",
      params: {},
      cues: [
        { at: "反过来",       op: "phase", args: "wave" },
        { at: "复理液变换",   op: "phase", args: "arrow" },
        { at: "里面藏着",     op: "phase", args: "bars" },
        { at: "每个圆转多快", op: "phase", args: "bars" },
      ],
    },

    // ---- Frame 8: 一切的底层 ----
    {
      scene: gridScene,
      startAt: "今天你听",
      params: {
        items: [
          { label: "MP3",    sub: "音频压缩" },
          { label: "JPEG",   sub: "图片压缩" },
          { label: "WiFi",   sub: "无线通信" },
          { label: "X 光",   sub: "医学影像" },
          { label: "地震",   sub: "预警分析" },
          { label: "AI 降噪", sub: "扩散模型" },
        ],
        tagline: "万物皆是圆的叠加 · 两百年前的数学，今天还在跑",
      },
      cues: [
        { at: "MP3",       op: "show", args: 0 },
        { at: "JPEG",      op: "show", args: 1 },
        { at: "WiFi",      op: "show", args: 2 },
        { at: "X光",       op: "show", args: 3 },
        { at: "地震",      op: "show", args: 4 },
        { at: "AI降噪",    op: "show", args: 5 },
        { at: "万物皆是",  op: "tagline" },
      ],
    },
  ],
};
