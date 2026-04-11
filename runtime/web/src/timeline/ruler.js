export function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function getTickStep(pxPerSecond) {
  if (pxPerSecond >= 100) {
    return 1;
  }
  if (pxPerSecond >= 40) {
    return 5;
  }
  return 10;
}

function getMinorTickStep(majorStep) {
  if (majorStep === 1) {
    return 0.5;
  }
  if (majorStep === 5) {
    return 1;
  }
  return 2;
}

function createTick(className, leftPx, label) {
  const tick = document.createElement("div");
  tick.className = className;
  tick.style.left = `${leftPx}px`;
  if (label) {
    const text = document.createElement("span");
    text.textContent = label;
    tick.appendChild(text);
  }
  return tick;
}

export function renderRuler(container, { duration, zoom }) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  const majorStep = getTickStep(zoom.pxPerSecond);
  const minorStep = getMinorTickStep(majorStep);
  const width = Math.max(zoom.timeToPx(safeDuration), 1);

  container.replaceChildren();
  container.style.width = `${width}px`;
  container.style.minWidth = "100%";

  const ticks = document.createDocumentFragment();
  const majorCount = Math.floor(safeDuration / majorStep);
  const minorCount = Math.floor(safeDuration / minorStep);

  for (let index = 0; index <= minorCount; index += 1) {
    const time = index * minorStep;
    const ratio = time / majorStep;
    if (Math.abs(ratio - Math.round(ratio)) < 0.000001) {
      continue;
    }
    ticks.appendChild(createTick("timeline-ruler-tick timeline-ruler-tick-minor", zoom.timeToPx(time)));
  }

  for (let index = 0; index <= majorCount; index += 1) {
    const time = index * majorStep;
    ticks.appendChild(createTick("timeline-ruler-tick timeline-ruler-tick-major", zoom.timeToPx(time), formatTime(time)));
  }

  if (majorCount * majorStep < safeDuration) {
    ticks.appendChild(createTick("timeline-ruler-tick timeline-ruler-tick-major", width, formatTime(safeDuration)));
  }

  container.appendChild(ticks);

  return { majorStep, minorStep, width };
}
