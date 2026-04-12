import { easeOutCubic } from "./easing.js";

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeDuration(effect, fallback) {
  const duration = Number(effect?.dur);
  return duration > 0 ? duration : fallback;
}

function normalizeDistance(effect, fallback = 40) {
  return finiteNumber(Number(effect?.distance), fallback);
}

function applyEffectFrame(ctx, effect, progress, width, height) {
  if (!effect || typeof effect.type !== "string") {
    return;
  }

  const eased = easeOutCubic(progress);
  switch (effect.type) {
    case "fadeIn":
      ctx.globalAlpha *= eased;
      break;
    case "fadeOut":
      ctx.globalAlpha *= 1 - eased;
      break;
    case "slideUp":
      ctx.globalAlpha *= eased;
      ctx.translate(0, normalizeDistance(effect) * (1 - eased));
      break;
    case "slideDown":
      ctx.globalAlpha *= 1 - eased;
      ctx.translate(0, normalizeDistance(effect) * eased);
      break;
    case "scaleIn": {
      const scale = Math.max(eased, 0.0001);
      ctx.globalAlpha *= eased;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      break;
    }
    case "scaleOut": {
      const scale = Math.max(1 - eased, 0.0001);
      ctx.globalAlpha *= 1 - eased;
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      break;
    }
    default:
      break;
  }
}

export function hasClipEffects(clip) {
  return Boolean(clip?.effects?.enter || clip?.effects?.exit);
}

export function applyEnterEffect(ctx, localT, effect, width, height) {
  if (!effect || typeof effect.type !== "string") {
    return;
  }

  const duration = normalizeDuration(effect, 0.5);
  if (localT >= duration) {
    return;
  }

  applyEffectFrame(ctx, effect, localT / duration, width, height);
}

export function applyExitEffect(ctx, localT, clipDuration, effect, width, height) {
  if (!effect || typeof effect.type !== "string") {
    return;
  }

  const duration = normalizeDuration(effect, 0.5);
  const exitStart = clipDuration - duration;
  if (localT < exitStart) {
    return;
  }

  applyEffectFrame(ctx, effect, (localT - exitStart) / duration, width, height);
}
