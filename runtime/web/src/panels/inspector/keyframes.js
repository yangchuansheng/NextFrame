import { setClipParamCommand } from "../../commands.js";

const DRAG_THRESHOLD_PX = 3;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function roundTime(value) {
  return Number((Math.max(0, value) || 0).toFixed(4));
}

function findSelectedClip(state) {
  const selectedClipId = state?.selectedClipId;
  const tracks = Array.isArray(state?.timeline?.tracks) ? state.timeline.tracks : [];

  for (const track of tracks) {
    const clips = Array.isArray(track?.clips) ? track.clips : [];
    const clip = clips.find((candidate) => candidate?.id === selectedClipId);
    if (clip) {
      return { clip, track };
    }
  }

  return null;
}

function isKeyframesParam(param) {
  return Boolean(param && param.type === "keyframes" && Array.isArray(param.keyframes));
}

function getCurrentParam(store, paramName) {
  const selection = findSelectedClip(store?.state);
  if (!selection) {
    return null;
  }

  return {
    ...selection,
    param: selection.clip?.params?.[paramName],
  };
}

function getClipDuration(clip) {
  const duration = Number(clip?.dur);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function getLocalPlayheadTime(store, clip) {
  const clipDuration = getClipDuration(clip);
  const localTime = (Number(store?.state?.playhead) || 0) - (Number(clip?.start) || 0);
  return roundTime(Math.min(Math.max(localTime, 0), clipDuration));
}

function normalizeKeyframes(keyframes, clipDuration) {
  return (Array.isArray(keyframes) ? keyframes : [])
    .filter((keyframe) => isFiniteNumber(keyframe?.time))
    .map((keyframe) => ({
      time: roundTime(Math.min(Math.max(keyframe.time, 0), clipDuration)),
      value: keyframe?.value,
      ease: keyframe?.ease || "linear",
    }))
    .sort((left, right) => left.time - right.time);
}

function buildKeyframesParam(keyframes) {
  return {
    type: "keyframes",
    keyframes,
  };
}

function commitParam(store, dispatch, trackId, clipId, paramName, value) {
  if (typeof dispatch === "function") {
    dispatch(setClipParamCommand({
      clipId,
      trackId,
      param: paramName,
      value,
    }));
    return;
  }

  store?.mutate?.((state) => {
    const selection = findSelectedClip(state);
    if (!selection) {
      return;
    }

    if (!selection.clip.params || typeof selection.clip.params !== "object") {
      selection.clip.params = {};
    }

    if (value === undefined) {
      delete selection.clip.params[paramName];
      return;
    }

    selection.clip.params[paramName] = value;
  });
}

function setKeyframesValue({
  clipDuration,
  currentParam,
  fallbackValue,
  updater,
}) {
  const existingKeyframes = normalizeKeyframes(currentParam?.keyframes, clipDuration);
  const nextKeyframes = updater(existingKeyframes);

  if (nextKeyframes.length === 0) {
    return typeof fallbackValue === "number" ? fallbackValue : 0;
  }

  return buildKeyframesParam(nextKeyframes);
}

function upsertKeyframe(keyframes, time, value) {
  const nextTime = roundTime(time);
  const existingIndex = keyframes.findIndex((keyframe) => keyframe.time === nextTime);

  if (existingIndex >= 0) {
    const nextKeyframes = [...keyframes];
    nextKeyframes[existingIndex] = {
      ...nextKeyframes[existingIndex],
      value,
      ease: nextKeyframes[existingIndex].ease || "linear",
    };
    return nextKeyframes;
  }

  return [
    ...keyframes,
    {
      time: nextTime,
      value,
      ease: "linear",
    },
  ].sort((left, right) => left.time - right.time);
}

function moveKeyframe(keyframes, index, time) {
  const source = keyframes[index];
  if (!source) {
    return keyframes;
  }

  const nextTime = roundTime(time);
  const filtered = keyframes.filter((_, candidateIndex) => candidateIndex !== index && keyframes[candidateIndex].time !== nextTime);
  filtered.push({
    ...source,
    time: nextTime,
    ease: source.ease || "linear",
  });
  return filtered.sort((left, right) => left.time - right.time);
}

function deleteKeyframe(keyframes, index) {
  return keyframes.filter((_, candidateIndex) => candidateIndex !== index);
}

function timeToPercent(time, clipDuration) {
  if (!(clipDuration > 0)) {
    return 0;
  }

  return (Math.min(Math.max(time, 0), clipDuration) / clipDuration) * 100;
}

export function renderKeyframeEditor({ paramName, currentValue, store, dispatch } = {}) {
  const root = document.createElement("div");
  root.className = "inspector-keyframes";

  const timeline = document.createElement("div");
  timeline.className = "inspector-keyframes-strip";

  const playhead = document.createElement("div");
  playhead.className = "inspector-keyframes-playhead";
  timeline.appendChild(playhead);

  const actions = document.createElement("div");
  actions.className = "inspector-keyframes-actions";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "inspector-keyframes-add";
  addButton.textContent = "+";
  addButton.setAttribute("aria-label", `Add ${paramName} keyframe`);
  actions.appendChild(addButton);

  root.append(timeline, actions);

  const context = getCurrentParam(store, paramName);
  const clip = context?.clip;
  const clipDuration = getClipDuration(clip);
  const currentParam = context?.param;
  const keyframes = isKeyframesParam(currentParam)
    ? normalizeKeyframes(currentParam.keyframes, clipDuration)
    : [];
  const localTime = clip ? getLocalPlayheadTime(store, clip) : 0;

  playhead.style.left = `${timeToPercent(localTime, clipDuration)}%`;

  addButton.disabled = !context || !isFiniteNumber(currentValue);
  addButton.addEventListener("click", () => {
    const latest = getCurrentParam(store, paramName);
    if (!latest || !isFiniteNumber(currentValue)) {
      return;
    }

    commitParam(
      store,
      dispatch,
      latest.track?.id ?? null,
      latest.clip.id,
      paramName,
      setKeyframesValue({
        clipDuration: getClipDuration(latest.clip),
        currentParam: latest.param,
        fallbackValue: currentValue,
        updater(existingKeyframes) {
          return upsertKeyframe(existingKeyframes, getLocalPlayheadTime(store, latest.clip), currentValue);
        },
      }),
    );
  });

  keyframes.forEach((keyframe, index) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "inspector-keyframes-marker";
    marker.setAttribute("aria-label", `Keyframe ${index + 1} at ${keyframe.time}s`);
    marker.title = `${keyframe.time}s`;
    marker.style.left = `${timeToPercent(keyframe.time, clipDuration)}%`;

    marker.addEventListener("pointerdown", (event) => {
      if (!context) {
        return;
      }

      event.preventDefault();
      const pointerId = event.pointerId;
      const startX = event.clientX;
      let moved = false;

      marker.setPointerCapture?.(pointerId);

      const handlePointerMove = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }

        const rect = timeline.getBoundingClientRect();
        const deltaX = moveEvent.clientX - startX;
        if (Math.abs(deltaX) >= DRAG_THRESHOLD_PX) {
          moved = true;
        }

        if (!moved || rect.width <= 0) {
          return;
        }

        const ratio = Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, 0), 1);
        marker.style.left = `${ratio * 100}%`;
      };

      const finishDrag = (endEvent) => {
        if (endEvent.pointerId !== pointerId) {
          return;
        }

        marker.releasePointerCapture?.(pointerId);
        marker.removeEventListener("pointermove", handlePointerMove);
        marker.removeEventListener("pointerup", finishDrag);
        marker.removeEventListener("pointercancel", finishDrag);

        const latest = getCurrentParam(store, paramName);
        if (!latest) {
          return;
        }

        if (!moved) {
          commitParam(
            store,
            dispatch,
            latest.track?.id ?? null,
            latest.clip.id,
            paramName,
            setKeyframesValue({
              clipDuration: getClipDuration(latest.clip),
              currentParam: latest.param,
              fallbackValue: currentValue,
              updater(existingKeyframes) {
                return deleteKeyframe(existingKeyframes, index);
              },
            }),
          );
          return;
        }

        const rect = timeline.getBoundingClientRect();
        const ratio = rect.width > 0
          ? Math.min(Math.max((endEvent.clientX - rect.left) / rect.width, 0), 1)
          : 0;
        const nextTime = roundTime(ratio * getClipDuration(latest.clip));

        commitParam(
          store,
          dispatch,
          latest.track?.id ?? null,
          latest.clip.id,
          paramName,
          setKeyframesValue({
            clipDuration: getClipDuration(latest.clip),
            currentParam: latest.param,
            fallbackValue: currentValue,
            updater(existingKeyframes) {
              return moveKeyframe(existingKeyframes, index, nextTime);
            },
          }),
        );
      };

      marker.addEventListener("pointermove", handlePointerMove);
      marker.addEventListener("pointerup", finishDrag);
      marker.addEventListener("pointercancel", finishDrag);
    });

    timeline.appendChild(marker);
  });

  return root;
}
