export const meta = {
  id: "barChartReveal",
  ratio: "9:16",
  category: "data",
  label: "Bar Chart Reveal",
  description: "柱状图逐个升起动画",
  tech: "svg",
  duration_hint: 5,
  loopable: false,
  tags: ["chart", "bar", "data", "reveal"],
  params: {
    title:    { type: "string", default: "月度增长", label: "图表标题", semantic: "chart title text", group: "content" },
    unit:     { type: "string", default: "%", label: "单位", semantic: "value unit suffix", group: "content" },
    data:     { type: "array", default: [72, 85, 63, 91, 78, 95], label: "数据", semantic: "bar values array", group: "content" },
    labels:   { type: "array", default: ["1月", "2月", "3月", "4月", "5月", "6月"], label: "标签", semantic: "bar labels array", group: "content" },
    hueStart: { type: "number", default: 200, range: [0, 360], step: 1, label: "起始色相", semantic: "first bar hue", group: "color" },
    hueEnd:   { type: "number", default: 320, range: [0, 360], step: 1, label: "结束色相", semantic: "last bar hue", group: "color" },
    stagger:  { type: "number", default: 0.12, range: [0.05, 0.5], step: 0.01, label: "柱子延迟", semantic: "delay between bars", group: "animation" },
    barDur:   { type: "number", default: 0.85, range: [0.2, 2], step: 0.05, label: "生长时长", semantic: "single bar grow duration", group: "animation" },
  },
  ai: {
    when: "需要展示数据对比时使用",
    example: { title: "月度增长", data: [72, 85, 63, 91, 78, 95], labels: ["1月","2月","3月","4月","5月","6月"] },
    avoid: "数据不要超过 8 条，否则柱子太窄",
  },
};

export function render(t, params, vp) {
  const { title, unit, data, labels, hueStart, hueEnd, stagger, barDur } = params;
  const W = vp.width, H = vp.height;
  const n = data.length;
  const maxVal = Math.max(...data, 1);
  const chartX = W * 0.1, chartW = W * 0.8;
  const chartY = H * 0.25, chartH = H * 0.5;
  const barW = chartW / n * 0.6;
  const gap = chartW / n;

  const easeOut = (p) => p * (2 - p);

  let bars = "";
  let valueLabels = "";
  let barLabels = "";

  for (let i = 0; i < n; i++) {
    const delay = i * stagger;
    const progress = Math.max(0, Math.min(1, (t - delay) / barDur));
    const ease = easeOut(progress);
    const barH = (data[i] / maxVal) * chartH * ease;
    const x = chartX + i * gap + (gap - barW) / 2;
    const y = chartY + chartH - barH;
    const hue = hueStart + (hueEnd - hueStart) * (i / Math.max(1, n - 1));

    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="hsl(${hue},70%,60%)" opacity="${0.3 + ease * 0.7}"/>`;

    if (progress > 0.8) {
      const labelOpacity = Math.min(1, (progress - 0.8) / 0.2);
      valueLabels += `<text x="${x + barW / 2}" y="${y - 12}" text-anchor="middle" fill="rgba(255,255,255,${labelOpacity})" font-size="${W * 0.028}" font-weight="600">${data[i]}${unit}</text>`;
    }
    barLabels += `<text x="${x + barW / 2}" y="${chartY + chartH + W * 0.04}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="${W * 0.024}">${labels[i] || ""}</text>`;
  }

  const titleOpacity = Math.min(1, t / 0.5);

  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;display:block;background:#0a0a12" xmlns="http://www.w3.org/2000/svg">
  <text x="${W / 2}" y="${H * 0.15}" text-anchor="middle" fill="rgba(255,255,255,${titleOpacity})" font-size="${W * 0.045}" font-weight="700" font-family="Inter,-apple-system,sans-serif">${title}</text>
  <line x1="${chartX}" y1="${chartY + chartH}" x2="${chartX + chartW}" y2="${chartY + chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  ${bars}
  ${valueLabels}
  ${barLabels}
</svg>`;
}

export function screenshots() {
  return [
    { t: 0, label: "开始" },
    { t: 1.5, label: "部分柱子升起" },
    { t: 4, label: "全部显示" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  if (params.data.length > 8) {
    errors.push(`数据条数 ${params.data.length} 超过 8 条上限。Fix: 减少到 8 条以内`);
  }
  if (params.data.length !== params.labels.length) {
    errors.push(`数据条数 ${params.data.length} 和标签数 ${params.labels.length} 不一致。Fix: 保持数量相同`);
  }
  const titleW = params.title.length * vp.width * 0.045 * 0.6;
  if (titleW > vp.width * 0.9) {
    errors.push(`标题"${params.title}"预估宽度超出安全区。Fix: 缩短标题`);
  }
  return { ok: errors.length === 0, errors };
}
