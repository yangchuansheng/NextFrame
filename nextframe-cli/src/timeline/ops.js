// Timeline pure operations.
// Every op returns {ok, value, error, hints} and never mutates input.
// Reference: spec/architecture/04-interfaces.md (Timeline Ops API).

import { validateTimeline } from "../engine/validate.js";

function clone(t) {
  return JSON.parse(JSON.stringify(t));
}

function findClipLocation(timeline, clipId) {
  for (let ti = 0; ti < (timeline.tracks || []).length; ti++) {
    const trk = timeline.tracks[ti];
    for (let ci = 0; ci < (trk.clips || []).length; ci++) {
      if (trk.clips[ci].id === clipId) return { ti, ci, track: trk, clip: trk.clips[ci] };
    }
  }
  return null;
}

function commit(newTimeline) {
  const v = validateTimeline(newTimeline);
  if (!v.ok) {
    return {
      ok: false,
      error: { code: "INVALID_AFTER_OP", message: "operation produced invalid timeline", hint: v.errors?.[0]?.message },
      details: v,
    };
  }
  return { ok: true, value: newTimeline };
}

/**
 * Add a clip to a track.
 */
export function addClip(timeline, trackId, clip) {
  if (!clip || typeof clip !== "object" || !clip.id) {
    return { ok: false, error: { code: "BAD_CLIP", message: "clip must have id" } };
  }
  const t = clone(timeline);
  const trk = (t.tracks || []).find((x) => x.id === trackId);
  if (!trk) {
    return {
      ok: false,
      error: { code: "TRACK_NOT_FOUND", message: `no track "${trackId}"`, ref: trackId },
      hints: [{ msg: `available: ${(t.tracks || []).map((x) => x.id).join(", ")}` }],
    };
  }
  // Check id collision
  for (const tk of t.tracks) {
    for (const c of tk.clips || []) {
      if (c.id === clip.id) {
        return {
          ok: false,
          error: { code: "DUP_CLIP_ID", message: `clip "${clip.id}" already exists`, ref: clip.id },
        };
      }
    }
  }
  trk.clips = trk.clips || [];
  trk.clips.push(clone(clip));
  return commit(t);
}

/**
 * Remove a clip by id.
 */
export function removeClip(timeline, clipId) {
  const t = clone(timeline);
  const loc = findClipLocation(t, clipId);
  if (!loc) {
    return { ok: false, error: { code: "CLIP_NOT_FOUND", message: `no clip "${clipId}"`, ref: clipId } };
  }
  loc.track.clips.splice(loc.ci, 1);
  return commit(t);
}

/**
 * Move a clip's start time (raw or symbolic).
 */
export function moveClip(timeline, clipId, newStart) {
  const t = clone(timeline);
  const loc = findClipLocation(t, clipId);
  if (!loc) {
    return { ok: false, error: { code: "CLIP_NOT_FOUND", message: `no clip "${clipId}"`, ref: clipId } };
  }
  loc.clip.start = newStart;
  return commit(t);
}

/**
 * Resize (set duration) of a clip.
 */
export function resizeClip(timeline, clipId, newDur) {
  const t = clone(timeline);
  const loc = findClipLocation(t, clipId);
  if (!loc) {
    return { ok: false, error: { code: "CLIP_NOT_FOUND", message: `no clip "${clipId}"`, ref: clipId } };
  }
  loc.clip.dur = newDur;
  return commit(t);
}

/**
 * Set a single param on a clip.
 */
export function setParam(timeline, clipId, key, value) {
  const t = clone(timeline);
  const loc = findClipLocation(t, clipId);
  if (!loc) {
    return { ok: false, error: { code: "CLIP_NOT_FOUND", message: `no clip "${clipId}"`, ref: clipId } };
  }
  loc.clip.params = { ...(loc.clip.params || {}), [key]: value };
  return commit(t);
}

/**
 * Find clip ids matching a predicate.
 */
export function findClips(timeline, predicate = {}) {
  const ids = [];
  for (const trk of timeline.tracks || []) {
    if (predicate.trackId && trk.id !== predicate.trackId) continue;
    for (const clip of trk.clips || []) {
      if (predicate.sceneId && clip.scene !== predicate.sceneId) continue;
      ids.push(clip.id);
    }
  }
  return ids;
}

export function getClip(timeline, clipId) {
  const loc = findClipLocation(timeline, clipId);
  return loc ? loc.clip : null;
}
