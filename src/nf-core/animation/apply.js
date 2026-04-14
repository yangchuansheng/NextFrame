/**
 * apply.js — Browser-friendly animation utilities.
 * Returns CSS strings (transform + opacity) rather than mutating a Canvas ctx.
 * Works standalone in <script> tags with no ES module imports.
 */

// ─── Easing functions (mirrored from engine/keyframes.js) ───

function easingLinear(t) { return t; }
function easingEaseIn(t) { return t * t; }
function easingEaseOut(t) { return t * (2 - t); }
function easingEaseInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function easingSpring(t) { return 1 - Math.cos(t * Math.PI * 0.5) * Math.exp(-6 * t); }
function easingBounce(t) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
  if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
  t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
}
function easingElastic(t) {
  if (t === 0 || t === 1) return t;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 0.3);
}
function easingExpo(t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)); }
function easingBack(t) { const c = 1.70158; return t * t * ((c + 1) * t - c); }
function easingCirc(t) { return 1 - Math.sqrt(1 - t * t); }

const EASING_MAP = {
  linear: easingLinear,
  easeIn: easingEaseIn,
  easeOut: easingEaseOut,
  easeInOut: easingEaseInOut,
  spring: easingSpring,
  bounce: easingBounce,
  elastic: easingElastic,
  expo: easingExpo,
  back: easingBack,
  circ: easingCirc,
};

/** All available easing names. */
export const EASING_NAMES = Object.keys(EASING_MAP);

/**
 * Apply easing to t ∈ [0,1].
 * @param {string} easingName
 * @param {number} t — raw progress 0-1
 * @returns {number} eased value 0-1
 */
export function applyEasing(easingName, t) {
  const fn = EASING_MAP[easingName] || easingLinear;
  return Math.max(0, Math.min(1, fn(Math.max(0, Math.min(1, t)))));
}

// ─── Effect → CSS string ───

/**
 * Each effect function takes eased progress (0-1) and returns
 * { opacity: number, transform: string }.
 * No Canvas ctx involved — pure CSS values.
 */

function effectFadeIn(p)   { return { opacity: p, transform: 'none' }; }
function effectFadeOut(p)  { return { opacity: 1 - p, transform: 'none' }; }

function effectSlideUp(p, dist = 40) {
  return { opacity: p, transform: `translateY(${dist * (1 - p)}px)` };
}
function effectSlideDown(p, dist = 40) {
  return { opacity: p, transform: `translateY(${-dist * (1 - p)}px)` };
}
function effectSlideLeft(p, dist = 40) {
  return { opacity: p, transform: `translateX(${-dist * (1 - p)}px)` };
}
function effectSlideRight(p, dist = 40) {
  return { opacity: p, transform: `translateX(${dist * (1 - p)}px)` };
}

function effectScaleIn(p) {
  return { opacity: p, transform: `scale(${p})` };
}
function effectScaleOut(p) {
  return { opacity: 1 - p, transform: `scale(${1 - p})` };
}

function effectSpringIn(p) {
  const spring = 1 - Math.cos(p * Math.PI * 4) * Math.exp(-6 * p);
  const scale = 0.5 + spring * 0.5;
  return { opacity: p, transform: `scale(${scale})` };
}
function effectSpringOut(p) {
  const spring = 1 - Math.cos(p * Math.PI * 4) * Math.exp(-6 * p);
  const scale = 0.5 + spring * 0.5;
  return { opacity: 1 - p, transform: `scale(${scale})` };
}

function effectBlurIn(p) {
  const blur = 20 * (1 - p);
  return { opacity: p, transform: 'none', filter: blur > 0.5 ? `blur(${blur}px)` : 'none' };
}
function effectBlurOut(p) {
  const blur = 20 * p;
  return { opacity: 1 - p, transform: 'none', filter: blur > 0.5 ? `blur(${blur}px)` : 'none' };
}

function effectBounceIn(p) {
  const b = easingBounce(p);
  return { opacity: p, transform: `scale(${b})` };
}

function effectWipeReveal(p) {
  // CSS clip-path wipe left-to-right
  return { opacity: 1, transform: 'none', clipPath: `inset(0 ${Math.round((1 - p) * 100)}% 0 0)` };
}

const EFFECT_MAP = {
  fadeIn:     effectFadeIn,
  fadeOut:    effectFadeOut,
  slideUp:    effectSlideUp,
  slideDown:  effectSlideDown,
  slideLeft:  effectSlideLeft,
  slideRight: effectSlideRight,
  scaleIn:    effectScaleIn,
  scaleOut:   effectScaleOut,
  springIn:   effectSpringIn,
  springOut:  effectSpringOut,
  blurIn:     effectBlurIn,
  blurOut:    effectBlurOut,
  bounceIn:   effectBounceIn,
  wipeReveal: effectWipeReveal,
};

/** All available effect names. */
export const EFFECT_NAMES = Object.keys(EFFECT_MAP);

/**
 * Apply a named effect at progress p ∈ [0,1].
 * Returns a CSS style string: "opacity:X; transform:Y; ...".
 * @param {string} effectName
 * @param {number} progress — 0-1 (already eased if desired)
 * @param {object} [opts] — optional params like { distance: 60 }
 * @returns {string} CSS style string
 */
export function applyEffect(effectName, progress, opts = {}) {
  const fn = EFFECT_MAP[effectName] || effectFadeIn;
  const p = Math.max(0, Math.min(1, progress));
  const dist = opts.distance;
  const result = dist !== undefined ? fn(p, dist) : fn(p);
  const parts = [`opacity:${result.opacity.toFixed(3)}`, `transform:${result.transform}`];
  if (result.filter && result.filter !== 'none') parts.push(`filter:${result.filter}`);
  if (result.clipPath) parts.push(`clip-path:${result.clipPath}`);
  return parts.join(';');
}
