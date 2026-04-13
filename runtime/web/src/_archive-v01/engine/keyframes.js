function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeKeyframes(param) {
  if (!param || param.type !== "keyframes" || !Array.isArray(param.keyframes)) {
    return [];
  }

  return param.keyframes
    .filter((keyframe) => isFiniteNumber(keyframe?.time))
    .map((keyframe) => ({
      time: keyframe.time,
      value: keyframe?.value,
      ease: keyframe?.ease || "linear",
    }))
    .sort((left, right) => left.time - right.time);
}

/**
 * Evaluate a clip param at the given local clip time.
 * Literal values are returned as-is. Keyframed numeric params are linearly
 * interpolated and clamped to the nearest endpoint outside the keyframe range.
 *
 * @param {unknown} param
 * @param {number} localT
 * @returns {unknown}
 */
export function evalParam(param, localT) {
  const keyframes = normalizeKeyframes(param);
  if (keyframes.length === 0) {
    return param;
  }

  if (keyframes.length === 1) {
    return keyframes[0].value;
  }

  const time = Number.isFinite(localT) ? localT : keyframes[0].time;
  if (time <= keyframes[0].time) {
    return keyframes[0].value;
  }

  const lastKeyframe = keyframes[keyframes.length - 1];
  if (time >= lastKeyframe.time) {
    return lastKeyframe.value;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const right = keyframes[index];
    if (time > right.time) {
      continue;
    }

    const left = keyframes[index - 1];
    if (time === right.time || right.time <= left.time) {
      return right.value;
    }

    const leftValue = Number(left.value);
    const rightValue = Number(right.value);
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
      return time - left.time <= right.time - time ? left.value : right.value;
    }

    const progress = (time - left.time) / (right.time - left.time);
    return leftValue + ((rightValue - leftValue) * progress);
  }

  return lastKeyframe.value;
}
