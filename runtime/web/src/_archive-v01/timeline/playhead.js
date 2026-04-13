import { TRACK_HEADER_WIDTH } from "./track.js";

export function createPlayhead({ headerWidth = TRACK_HEADER_WIDTH } = {}) {
  const marker = document.createElement("div");
  marker.className = "timeline-playhead-marker";

  const line = document.createElement("div");
  line.className = "timeline-playhead-line";

  return {
    marker,
    line,
    setTime(time, zoom) {
      const offset = zoom.timeToPx(time);
      marker.style.left = `${offset}px`;
      line.style.left = `${headerWidth + offset}px`;
    },
  };
}
