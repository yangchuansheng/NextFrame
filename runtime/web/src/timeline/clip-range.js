export const CLIP_SNAP_STEP = 0.1;
export const MIN_CLIP_DURATION = 0.1;

function roundToPrecision(value, precision = 4) {
  return Number((Number(value) || 0).toFixed(precision));
}

export function getClipDuration(clip) {
  const duration = Number(clip?.dur ?? clip?.duration);
  return Number.isFinite(duration) ? duration : 0;
}

export function snapClipTime(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  const snapped = Math.round(safeValue / CLIP_SNAP_STEP) * CLIP_SNAP_STEP;
  return roundToPrecision(snapped, 1);
}

export function clampClipDuration(value) {
  return Math.max(MIN_CLIP_DURATION, snapClipTime(value));
}

export function hasTrackOverlap(track, start, dur, { ignoreClipId = null } = {}) {
  const nextStart = Math.max(0, Number(start) || 0);
  const nextDur = Math.max(0, Number(dur) || 0);
  const nextEnd = nextStart + nextDur;
  const clips = Array.isArray(track?.clips) ? track.clips : [];

  return clips.some((clip) => {
    if (clip?.id === ignoreClipId) {
      return false;
    }

    const clipStart = Number(clip?.start) || 0;
    const clipEnd = clipStart + getClipDuration(clip);
    return nextStart < clipEnd && clipStart < nextEnd;
  });
}
