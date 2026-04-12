// ccConfidentialLabel — the "ANTHROPIC CONFIDENTIAL · LEAKED" pill.
// Replicates .confidential-label from 01-intro.html:
//   font-family: mono, 15px, 700, letter-spacing .18em, uppercase
//   color: --ac #da7756
//   border: 1px solid --ac-25, bg: --ac-10, border-radius 4px
// Frame-pure: enter fade driven by progress param.

export function ccConfidentialLabel(t, params = {}, ctx) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const text = params.text || "ANTHROPIC CONFIDENTIAL · LEAKED";
  const cx = width * (params.cx ?? 0.5);
  const cy = height * (params.cy ?? 0.22);
  const dur = params.dur ?? 3;
  const enter = 0.6;
  const alpha = Math.min(1, Math.max(0, t / enter));
  const offsetY = (1 - alpha) * -12;

  const fontSize = Math.round(height * 0.018);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, offsetY);
  ctx.font = `700 ${fontSize}px "SF Mono", Menlo, monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Measure for background pill
  const padX = Math.round(fontSize * 1.2);
  const padY = Math.round(fontSize * 0.5);
  const spacedText = text.split("").join("\u2009"); // approximate letter-spacing
  const metrics = ctx.measureText(spacedText);
  const boxW = Math.ceil(metrics.width) + padX * 2;
  const boxH = fontSize + padY * 2;
  const boxX = cx - boxW / 2;
  const boxY = cy - boxH / 2;
  const radius = 4;

  // Background
  ctx.fillStyle = "rgba(218,119,86,0.10)";
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(218,119,86,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label text
  ctx.fillStyle = "#da7756";
  ctx.fillText(spacedText, cx, cy);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
