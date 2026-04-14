export const meta = {
  id: "interviewVideoArea",
  version: 1,
  ratio: "9:16",
  category: "media",
  label: "Interview Video Area",
  description: "访谈视频占位区。黑色矩形 + 圆角 + 细边框，实际录制时外部视频覆盖此区域。",
  tags: ["video", "placeholder", "interview", "media", "clip"],
  mood: ["professional", "broadcast"],
  theme: ["interview", "podcast"],
  tech: "dom",
  duration_hint: 81,
  loopable: true,
  z_hint: "middle",
  default_theme: "standard",
  themes: {
    "standard":       { topFrac: 0.14, heightFrac: 0.48, borderRadius: 16, borderOpacity: 0.15 },
    "tall":           { topFrac: 0.12, heightFrac: 0.55, borderRadius: 12, borderOpacity: 0.15 },
    "compact":        { topFrac: 0.16, heightFrac: 0.40, borderRadius: 20, borderOpacity: 0.12 },
  },
  params: {
    topFrac:       { type: "number", default: 0.14, range: [0.05, 0.4],  step: 0.01, label: "顶部位置(比例)", semantic: "top edge as fraction of viewport height", group: "shape" },
    heightFrac:    { type: "number", default: 0.48, range: [0.2, 0.7],   step: 0.01, label: "高度(比例)",    semantic: "height as fraction of viewport height", group: "shape" },
    borderRadius:  { type: "number", default: 16,   range: [0, 40],      step: 2,    label: "圆角(px)",      semantic: "corner radius in pixels", group: "style" },
    borderOpacity: { type: "number", default: 0.15, range: [0, 0.5],     step: 0.01, label: "边框透明度",    semantic: "border opacity 0=none 0.5=visible", group: "style" },
  },
  ai: {
    when: "访谈视频中放置视频占位区。实际录制时，真实视频素材在后期覆盖此区域。放在背景层之上、字幕层之下。",
    example: { topFrac: 0.14, heightFrac: 0.48, borderRadius: 16, borderOpacity: 0.15 },
    avoid: "不要把字幕放在此区域内，字幕应放在单独的 interviewBiSub 层",
  },
};

export function render(t, params, vp) {
  const { topFrac, heightFrac, borderRadius, borderOpacity } = params;
  const W = vp.width, H = vp.height;
  const margin = W * 0.04;
  const rectW = W - margin * 2;
  const rectH = Math.round(H * heightFrac);
  const rectTop = Math.round(H * topFrac);
  const border = `1px solid rgba(255,255,255,${borderOpacity})`;

  return `<div style="width:${W}px;height:${H}px;position:relative;overflow:hidden">
  <div style="position:absolute;left:${margin}px;top:${rectTop}px;width:${rectW}px;height:${rectH}px;background:#000;border-radius:${borderRadius}px;border:${border};overflow:hidden">
    <!-- video overlay area — aspect ratio marker lines -->
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.06">
      <div style="color:rgba(255,255,255,0.8);font-size:${W * 0.035}px;font-family:monospace;letter-spacing:0.1em">16:9</div>
    </div>
  </div>
</div>`;
}

export function screenshots() {
  return [
    { t: 0,  label: "视频占位区" },
    { t: 20, label: "视频占位区（中段）" },
    { t: 60, label: "视频占位区（末尾）" },
  ];
}

export function lint(params, vp) {
  const errors = [];
  const bottom = params.topFrac + params.heightFrac;
  if (bottom > 0.9) errors.push(`topFrac(${params.topFrac}) + heightFrac(${params.heightFrac}) = ${bottom.toFixed(2)} 超出 0.9，视频区会溢出屏幕。Fix: 减小 heightFrac`);
  if (params.borderRadius < 0 || params.borderRadius > 40) errors.push("borderRadius 超出范围 [0, 40]。Fix: 设为 0–40");
  return { ok: errors.length === 0, errors };
}
