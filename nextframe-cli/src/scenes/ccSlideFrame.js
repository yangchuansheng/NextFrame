// ccSlideFrame — warm-brown slide shell for claude-code series.
// Replicates theme.css: --bg #1a1510 with a subtle radial warmth and
// top/bottom rule lines in --rule rgba(245,236,224,.10).
// Frame-pure: accepts (t, params, ctx).

export function ccSlideFrame(t, params = {}, ctx) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const bg = params.bg || "#1a1510";
  const rule = params.rule || "rgba(245,236,224,0.10)";
  const watermark = params.watermark || "OPC · 王宇轩";

  // Base fill
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle radial warmth from upper right — the terracotta leak that
  // makes the slide feel lit from above-right.
  const cx = width * 0.78;
  const cy = height * 0.22;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.72);
  g.addColorStop(0, "rgba(218,119,86,0.15)");
  g.addColorStop(0.45, "rgba(218,119,86,0.04)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Top rule
  ctx.strokeStyle = rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.09);
  ctx.lineTo(width * 0.92, height * 0.09);
  ctx.stroke();

  // Bottom rule
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.91);
  ctx.lineTo(width * 0.92, height * 0.91);
  ctx.stroke();

  // Top-left episode tag
  ctx.fillStyle = "rgba(245,236,224,0.50)";
  ctx.font = `700 ${Math.round(height * 0.018)}px "SF Mono", Menlo, monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const tag = params.episodeTag || "E01 · PROMPT ANATOMY";
  ctx.fillText(tag, width * 0.08, height * 0.055);

  // Top-right watermark brand
  ctx.fillStyle = "rgba(245,236,224,0.35)";
  ctx.font = `500 ${Math.round(height * 0.016)}px "SF Mono", Menlo, monospace`;
  ctx.textAlign = "right";
  ctx.fillText(watermark, width * 0.92, height * 0.055);

  // Bottom progress hint — thin underline
  const prog = Math.min(1, Math.max(0, (params.progress ?? 0)));
  ctx.strokeStyle = "#da7756";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.945);
  ctx.lineTo(width * 0.08 + width * 0.84 * prog, height * 0.945);
  ctx.stroke();
}
