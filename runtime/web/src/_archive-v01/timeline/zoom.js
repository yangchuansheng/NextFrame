const MIN_ZOOM = 0.1;
const MAX_ZOOM = 50;
const BASE_PX_PER_SECOND = 24;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createZoomController(initialLevel = 1) {
  let level = clamp(Number(initialLevel) || 1, MIN_ZOOM, MAX_ZOOM);
  let pxPerSecond = BASE_PX_PER_SECOND * level;

  return {
    get level() {
      return level;
    },
    get pxPerSecond() {
      return pxPerSecond;
    },
    setZoom(nextLevel) {
      level = clamp(Number(nextLevel) || 1, MIN_ZOOM, MAX_ZOOM);
      pxPerSecond = BASE_PX_PER_SECOND * level;
      return level;
    },
    timeToPx(time) {
      return Math.max(0, Number(time) || 0) * pxPerSecond;
    },
    pxToTime(px) {
      return Math.max(0, Number(px) || 0) / pxPerSecond;
    },
  };
}

export { BASE_PX_PER_SECOND, MAX_ZOOM, MIN_ZOOM };
