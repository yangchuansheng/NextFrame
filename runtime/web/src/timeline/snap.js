function roundTime(value, precision = 4) {
  return Number((Math.max(0, Number(value) || 0)).toFixed(precision));
}

function getGridStep(pxPerSecond) {
  const safePxPerSecond = Number(pxPerSecond) || 0;

  if (safePxPerSecond >= 100) {
    return 0.5;
  }

  if (safePxPerSecond >= 40) {
    return 1;
  }

  if (safePxPerSecond >= 12) {
    return 5;
  }

  return 10;
}

function getThresholdSeconds(strength, zoom) {
  const safeStrength = Math.max(0, Number(strength) || 0);
  const pxPerSecond = Number(zoom?.pxPerSecond) || 0;

  if (!(pxPerSecond > 0)) {
    return safeStrength;
  }

  return Math.min(safeStrength, 8 / pxPerSecond);
}

function addPoint(points, seen, value, priority) {
  if (!Number.isFinite(value)) {
    return;
  }

  const rounded = roundTime(value);
  const key = String(rounded);
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  points.push({ value: rounded, priority });
}

export function computeSnap({ candidateTime, timeline, playhead, zoom, strength = 0.1 }) {
  const safeCandidate = roundTime(candidateTime);
  const threshold = getThresholdSeconds(strength, zoom);
  const points = [];
  const seen = new Set();

  addPoint(points, seen, playhead, 0);

  const tracks = Array.isArray(timeline?.tracks) ? timeline.tracks : [];
  for (const track of tracks) {
    const clips = Array.isArray(track?.clips) ? track.clips : [];
    for (const clip of clips) {
      const start = Number(clip?.start);
      const dur = Number(clip?.dur ?? clip?.duration);
      addPoint(points, seen, start, 1);
      addPoint(points, seen, start + dur, 1);
    }
  }

  const gridStep = getGridStep(zoom?.pxPerSecond);
  addPoint(points, seen, Math.round(safeCandidate / gridStep) * gridStep, 2);

  let closestPoint = safeCandidate;
  let closestDistance = threshold + Number.EPSILON;
  let closestPriority = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = Math.abs(point.value - safeCandidate);
    if (distance > threshold) {
      continue;
    }

    if (distance < closestDistance || (Math.abs(distance - closestDistance) < 0.000001 && point.priority < closestPriority)) {
      closestPoint = point.value;
      closestDistance = distance;
      closestPriority = point.priority;
    }
  }

  return roundTime(closestPoint);
}
