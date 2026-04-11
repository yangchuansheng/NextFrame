/**
 * Clamp a number into an inclusive range.
 * @param {number} value - The number to clamp.
 * @param {number} min - The minimum allowed value.
 * @param {number} max - The maximum allowed value.
 * @returns {number} The clamped number.
 */
export function clamp(value, min = 0, max = 1) {
  if (min > max) {
    return clamp(value, max, min);
  }

  return Math.min(max, Math.max(min, value));
}

/**
 * Compute a smoothstep interpolation in the unit interval.
 * @param {number} t - The interpolation amount.
 * @returns {number} The eased value.
 */
export function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * Compute an ease-out cubic interpolation in the unit interval.
 * @param {number} t - The interpolation amount.
 * @returns {number} The eased value.
 */
export function easeOutCubic(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Compute an ease-in-out cubic interpolation in the unit interval.
 * @param {number} t - The interpolation amount.
 * @returns {number} The eased value.
 */
export function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5
    ? 4 * x * x * x
    : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
