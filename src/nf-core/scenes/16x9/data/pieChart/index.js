export const meta = {
  id: "pieChart",
  version: 1,
  ratio: "16:9",

  category: "data",
  label: "Pie Chart",
  description: "饼图各扇形从 0 角度依次扩展动画。每个扇形带 easeInOut 缓动，数值标签在扇形到位后淡入显示。SVG 矢量渲染，支持多色主题。",
  tags: ["chart", "pie", "data", "donut", "proportion", "share", "composition"],
  mood: ["professional", "informative", "visual"],
  theme: ["business", "report", "analytics", "marketing"],

  tech: "svg",
  duration_hint: 6,
  loopable: false,
  z_hint: "middle",

  default_theme: "aurora-violet",
  themes: {
    "aurora-violet":  { hueStart: 250, hueSpan: 200, saturation: 70, lightness: 60 },
    "warm-sunset":    { hueStart: 15,  hueSpan: 120, saturation: 75, lightness: 58 },
    "green-nature":   { hueStart: 100, hueSpan: 100, saturation: 65, lightness: 55 },
    "cool-ocean":     { hueStart: 190, hueSpan: 80,  saturation: 72, lightness: 58 },
    "neon-spectrum":  { hueStart: 300, hueSpan: 300, saturation: 85, lightness: 62 },
  },

  params: {
    title:      { type: "string",  default: "市场占比",    label: "图表标题",   semantic: "chart title displayed centered above the pie", group: "content" },
    unit:       { type: "string",  default: "%",           label: "单位后缀",   semantic: "suffix appended after each value label (%, K, etc.)", group: "content" },
    data:       { type: "array",   default: [35, 25, 20, 12, 8], label: "数据",  semantic: "numeric values for each slice; auto-normalized to percentages", group: "content" },
    labels:     { type: "array",   default: ["产品A", "产品B", "产品C", "产品D", "产品E"], label: "标签", semantic: "text label for each slice, must match data array length", group: "content" },
    hueStart:   { type: "number",  default: 250, range: [0, 360],   step: 1,    label: "起始色相", semantic: "hue of the first slice", group: "color" },
    hueSpan:    { type: "number",  default: 200, range: [30, 360],  step: 5,    label: "色相跨度", semantic: "total hue range spread across all slices", group: "color" },
    saturation: { type: "number",  default: 70,  range: [30, 100],  step: 1,    label: "饱和度",   semantic: "HSL saturation for all slices", group: "color" },
    lightness:  { type: "number",  default: 60,  range: [30, 80],   step: 1,    label: "亮度",     semantic: "HSL lightness for all slices", group: "color" },
    innerRadius:{ type: "number",  default: 0,   range: [0, 0.7],   step: 0.05, label: "内圆半径", semantic: "0=solid pie, 0.4=donut; fraction of outer radius", group: "style" },
    animDur:    { type: "number",  default: 1.2, range: [0.4, 3.0], step: 0.1,  label: "动画时长", semantic: "seconds for each slice to fully expand", group: "animation" },
    stagger:    { type: "number",  default: 0.15, range: [0.05, 0.5], step: 0.01, label: "扇形延迟", semantic: "seconds between each slice starting to expand", group: "animation" },
  },

  ai: {
    when: "展示构成比例、市场份额、分类占比。横屏比例适合演示文稿、报告、数据看板。",
    how: "传 data 和 labels 数组，长度必须一致（最多 8 条）。设 innerRadius>0 可得甜甜圈图。叠在背景上。",
    example: { title: "市场占比", data: [35, 25, 20, 12, 8], labels: ["产品A","产品B","产品C","产品D","产品E"], unit: "%" },
    theme_guide: "aurora-violet=蓝紫渐变, warm-sunset=暖橙日落, green-nature=绿色自然, cool-ocean=冷蓝海洋, neon-spectrum=霓虹全谱",
    avoid: "data 超过 8 个扇形太密看不清标签。data 和 labels 长度不一致会 lint 报错。值太小(<3%)的扇形无法显示标签。",
    pairs_with: ["auroraGradient", "kineticHeadline", "barChartReveal"],
  },
};

export function render(t, params, vp) {
  const { title, unit, data, labels, hueStart, hueSpan, saturation, lightness, innerRadius, animDur, stagger } = params;
  const W = vp.width, H = vp.height;
  const n = data.length;

  // Normalize data to percentages
  const total = data.reduce((s, v) => s + v, 0) || 1;
  const pct = data.map((v) => v / total);

  // Layout: pie centered, title above
  const cx = W * 0.42;
  const cy = H * 0.54;
  const outerR = Math.min(W * 0.28, H * 0.4);
  const innerR = outerR * innerRadius;

  // easeInOut
  const ease = (p) => p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

  // Build arc paths
  let slices = "";
  let valueLabels = "";
  let legendItems = "";

  let angleStart = -Math.PI / 2; // Start from top

  for (let i = 0; i < n; i++) {
    const delay = i * stagger;
    const progress = Math.max(0, Math.min(1, (t - delay) / animDur));
    const eased = ease(progress);

    const fullAngle = pct[i] * Math.PI * 2;
    const sweepAngle = fullAngle * eased;
    const angleEnd = angleStart + sweepAngle;

    const hue = (hueStart + (hueSpan * i) / Math.max(1, n - 1)) % 360;
    const color = `hsl(${hue},${saturation}%,${lightness}%)`;
    const opacity = 0.3 + eased * 0.7;

    if (sweepAngle > 0.001) {
      const x1 = cx + Math.cos(angleStart) * outerR;
      const y1 = cy + Math.sin(angleStart) * outerR;
      const x2 = cx + Math.cos(angleEnd) * outerR;
      const y2 = cy + Math.sin(angleEnd) * outerR;
      const largeArc = sweepAngle > Math.PI ? 1 : 0;

      let path;
      if (innerR > 0) {
        // Donut slice
        const ix1 = cx + Math.cos(angleStart) * innerR;
        const iy1 = cy + Math.sin(angleStart) * innerR;
        const ix2 = cx + Math.cos(angleEnd) * innerR;
        const iy2 = cy + Math.sin(angleEnd) * innerR;
        path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
      } else {
        // Solid pie slice
        path = `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }

      slices += `<path d="${path}" fill="${color}" opacity="${opacity}" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>`;

      // Value label at slice midpoint
      if (progress > 0.85 && pct[i] > 0.04) {
        const labelAlpha = Math.min(1, (progress - 0.85) / 0.15);
        const midAngle = angleStart + fullAngle / 2;
        const labelR = innerR > 0 ? (innerR + outerR) / 2 : outerR * 0.65;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        const displayVal = Math.round(pct[i] * 100);
        valueLabels += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,${labelAlpha})" font-size="${H * 0.028}" font-weight="700" font-family="Inter,-apple-system,sans-serif">${displayVal}${unit}</text>`;
      }
    }

    // Legend — right side
    const legendX = W * 0.72;
    const legendY = H * 0.28 + i * H * 0.1;
    const legendAlpha = Math.min(1, Math.max(0, (t - delay - animDur * 0.6) / 0.3));
    if (legendAlpha > 0) {
      legendItems += `<rect x="${legendX}" y="${legendY - H * 0.018}" width="${H * 0.03}" height="${H * 0.03}" rx="3" fill="${color}" opacity="${legendAlpha * opacity}"/>`;
      legendItems += `<text x="${legendX + H * 0.045}" y="${legendY}" dominant-baseline="middle" fill="rgba(255,255,255,${legendAlpha * 0.85})" font-size="${H * 0.026}" font-family="Inter,-apple-system,sans-serif">${labels[i] || ""}</text>`;
      const valPct = Math.round(pct[i] * 100);
      legendItems += `<text x="${W * 0.95}" y="${legendY}" text-anchor="end" dominant-baseline="middle" fill="rgba(255,255,255,${legendAlpha * 0.55})" font-size="${H * 0.024}" font-family="Inter,-apple-system,sans-serif" font-variant-numeric="tabular-nums">${valPct}${unit}</text>`;
    }

    // Advance angle only by full angle (not eased), so next slice starts after this one's full arc
    angleStart += fullAngle;
  }

  const titleOpacity = Math.min(1, t / 0.5);

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;display:block;background:transparent" xmlns="http://www.w3.org/2000/svg">
  <text x="${W * 0.42}" y="${H * 0.1}" text-anchor="middle" fill="rgba(255,255,255,${titleOpacity})" font-size="${H * 0.055}" font-weight="700" font-family="Inter,-apple-system,sans-serif">${title}</text>
  ${slices}
  ${valueLabels}
  ${legendItems}
</svg>`;
}

export function screenshots() {
  return [
    { t: 0,   label: "开始" },
    { t: 1.5, label: "扇形展开中" },
    { t: 4.5, label: "全部完成" },
  ];
}

export function lint(params, vp) {
  const errors = [];

  if (params.data.length > 8) {
    errors.push(`数据条数 ${params.data.length} 超过 8 条上限。Fix: 减少到 8 条以内`);
  }
  if (params.data.length < 2) {
    errors.push(`饼图至少需要 2 个数据。Fix: 提供 2 条以上数据`);
  }
  if (params.data.length !== params.labels.length) {
    errors.push(`数据条数 ${params.data.length} 和标签数 ${params.labels.length} 不一致。Fix: 保持数量相同`);
  }
  if (params.data.some((v) => v < 0)) {
    errors.push(`数据包含负数。Fix: 所有数据必须为非负数`);
  }
  const titleW = params.title.length * vp.width * 0.035 * 0.6;
  if (titleW > vp.width * 0.84) {
    errors.push(`标题"${params.title}"预估宽度超出安全区。Fix: 缩短标题（建议 10 字以内）`);
  }
  if (params.innerRadius < 0 || params.innerRadius >= 1) {
    errors.push(`innerRadius ${params.innerRadius} 超出范围 [0, 0.7]。Fix: 设置为 0~0.7 之间`);
  }

  return { ok: errors.length === 0, errors };
}
