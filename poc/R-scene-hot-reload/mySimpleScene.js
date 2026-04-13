export default function mySimpleScene(ctx, params = {}) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.18;
  const hue = ((params.hue % 360) + 360) % 360;

  ctx.fillStyle = "#090b12";
  ctx.fillRect(0, 0, width, height);

  const halo = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.8);
  halo.addColorStop(0, `hsla(${hue}, 95%, 62%, 0.95)`);
  halo.addColorStop(0.45, `hsla(${hue}, 95%, 55%, 0.4)`);
  halo.addColorStop(1, `hsla(${(hue + 40) % 360}, 95%, 45%, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}
