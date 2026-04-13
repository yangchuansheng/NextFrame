export const TAU = Math.PI * 2;
export const phi = (1 + Math.sqrt(5)) / 2;

/**
 * Linearly interpolate between two numbers.
 * @param {number} a - The start value.
 * @param {number} b - The end value.
 * @param {number} t - The interpolation amount.
 * @returns {number} The interpolated number.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Remap a number from one range into another.
 * @param {number} value - The source value.
 * @param {number} inMin - The source range minimum.
 * @param {number} inMax - The source range maximum.
 * @param {number} outMin - The target range minimum.
 * @param {number} outMax - The target range maximum.
 * @returns {number} The remapped number.
 */
export function remap(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) {
    return outMin;
  }

  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
