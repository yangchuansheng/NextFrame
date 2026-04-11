import {
  randomizeParamsCommand,
  setClipFieldCommand,
  setClipParamCommand,
  setProjectAspectPresetCommand,
} from "../../commands.js";
import { evalParam } from "../../engine/index.js";
import { ASPECT_PRESETS, createProjectFromPreset, findAspectPresetForProject } from "../../project/presets.js";
import { SCENE_MANIFEST_BY_ID } from "../../scenes/index.js";
import { renderField } from "./field.js";
import { renderKeyframeEditor } from "./keyframes.js";
import {
  createClipOrganizeSection,
  createInspectorSection,
  createReadonlyRow,
  createSceneRandomizeButton,
} from "./sections.js";

const INSPECTOR_STATE = Symbol("nextframe.inspector.mount");

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

function findAssetById(state, assetId) {
  if (typeof assetId !== "string" || assetId.length === 0) {
    return null;
  }

  const assets = Array.isArray(state?.assets) ? state.assets : [];
  return assets.find((asset) => asset?.id === assetId) ?? null;
}

function getFieldType(param) {
  if (param?.type === "text") {
    return "text";
  }

  if (param?.type === "color") {
    return "color";
  }

  if (param?.type === "select" && Array.isArray(param?.options)) {
    return "select";
  }

  if (param?.ui === "hue" || param?.type === "range") {
    return "range";
  }

  if (param?.type === "number" || param?.type === "integer") {
    return "number";
  }

  if (param?.type === "string") {
    return "text";
  }

  return "text";
}

function coerceParamValue(rawValue, param, previousValue) {
  if (param?.type === "integer") {
    return Math.round(Number(rawValue) || 0);
  }

  if (param?.type === "number" || param?.type === "range") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : Number(previousValue) || 0;
  }

  if (
    param?.type === "text"
    || param?.type === "string"
    || param?.type === "color"
    || param?.type === "select"
  ) {
    return String(rawValue);
  }

  if (typeof previousValue === "object" && previousValue !== null) {
    try {
      return JSON.parse(String(rawValue));
    } catch {
      return previousValue;
    }
  }

  return String(rawValue);
}

function isKeyframesParam(value) {
  return Boolean(value && value.type === "keyframes" && Array.isArray(value.keyframes));
}

function isNumericParam(param, fieldType = getFieldType(param)) {
  return (
    fieldType === "range"
    || fieldType === "number"
    || Array.isArray(param?.range)
  );
}

function getClipDuration(clip) {
  const duration = Number(clip?.dur ?? clip?.duration);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function roundKeyframeTime(value) {
  return Number((Math.max(0, value) || 0).toFixed(4));
}

function getClipLocalPlayhead(state, clip) {
  const clipDuration = getClipDuration(clip);
  const localTime = (Number(state?.playhead) || 0) - (Number(clip?.start) || 0);
  return roundKeyframeTime(Math.min(Math.max(localTime, 0), clipDuration));
}

function normalizeKeyframesParam(value, clipDuration) {
  return (Array.isArray(value?.keyframes) ? value.keyframes : [])
    .filter((keyframe) => Number.isFinite(keyframe?.time))
    .map((keyframe) => ({
      time: roundKeyframeTime(Math.min(Math.max(keyframe.time, 0), clipDuration)),
      value: keyframe?.value,
      ease: keyframe?.ease || "linear",
    }))
    .sort((left, right) => left.time - right.time);
}

function upsertKeyframedNumber(paramValue, time, value, clipDuration) {
  const nextTime = roundKeyframeTime(Math.min(Math.max(time, 0), clipDuration));
  const keyframes = normalizeKeyframesParam(paramValue, clipDuration);
  const existingIndex = keyframes.findIndex((keyframe) => keyframe.time === nextTime);

  if (existingIndex >= 0) {
    keyframes[existingIndex] = {
      ...keyframes[existingIndex],
      value,
      ease: keyframes[existingIndex].ease || "linear",
    };
  } else {
    keyframes.push({
      time: nextTime,
      value,
      ease: "linear",
    });
  }

  keyframes.sort((left, right) => left.time - right.time);
  return {
    type: "keyframes",
    keyframes,
  };
}

function getDisplayedNumericValue(paramValue, defaultValue, localT) {
  const resolvedValue = isKeyframesParam(paramValue)
    ? evalParam(paramValue, localT)
    : (paramValue ?? defaultValue);
  const numericValue = Number(resolvedValue);

  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  const fallback = Number(defaultValue);
  return Number.isFinite(fallback) ? fallback : 0;
}

function updateSelectedClip(store, recipe) {
  store?.mutate((state) => {
    const tracks = Array.isArray(state?.timeline?.tracks) ? state.timeline.tracks : [];

    for (const track of tracks) {
      const clips = Array.isArray(track?.clips) ? track.clips : [];
      const clip = clips.find((candidate) => candidate?.id === state.selectedClipId);
      if (!clip) {
        continue;
      }

      recipe(clip, track);
      return;
    }
  });
}

function updateSelectedClipField(store, field, value) {
  const clipId = store?.state?.selectedClipId;
  if (typeof clipId !== "string" || clipId.length === 0) {
    return;
  }

  if (typeof store?.dispatch === "function") {
    store.dispatch(setClipFieldCommand({
      clipId,
      field,
      value,
    }));
    return;
  }

  updateSelectedClip(store, (draftClip) => {
    if (value === undefined) {
      delete draftClip[field];
      return;
    }

    draftClip[field] = value;
  });
}

function updateSelectedClipParam(store, param, value) {
  const clipId = store?.state?.selectedClipId;
  if (typeof clipId !== "string" || clipId.length === 0) {
    return;
  }

  if (typeof store?.dispatch === "function") {
    store.dispatch(setClipParamCommand({
      clipId,
      param,
      value,
    }));
    return;
  }

  updateSelectedClip(store, (draftClip) => {
    if (!draftClip.params || typeof draftClip.params !== "object") {
      draftClip.params = {};
    }

    if (value === undefined) {
      delete draftClip.params[param];
      return;
    }

    draftClip.params[param] = value;
  });
}

function updateProjectAspectPreset(store, presetId) {
  if (typeof presetId !== "string" || presetId.length === 0) {
    return;
  }

  if (typeof store?.dispatch === "function") {
    store.dispatch(setProjectAspectPresetCommand({ presetId }));
    return;
  }

  store?.mutate((state) => {
    state.project = createProjectFromPreset(presetId);
    state.dirty = true;
  });
}

function clampToRange(value, param) {
  const [min, max] = Array.isArray(param?.range) ? param.range : [param?.min, param?.max];
  let nextValue = value;

  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }
  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }

  return nextValue;
}

function getParamStep(param) {
  if (typeof param?.step === "number") {
    return param.step;
  }

  return param?.type === "integer" ? 1 : 0.01;
}

function createSeededRandom(seed = Date.now()) {
  let state = (Number(seed) >>> 0) || 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

function randomHexColor(nextRandom) {
  const value = Math.floor(nextRandom() * 0x1000000);
  return `#${value.toString(16).padStart(6, "0")}`;
}

function pickRandomOption(options, nextRandom) {
  const choices = Array.isArray(options) ? options : [];
  if (choices.length === 0) {
    return undefined;
  }

  const index = Math.min(choices.length - 1, Math.floor(nextRandom() * choices.length));
  const option = choices[index];
  return option && typeof option === "object" ? option.value : option;
}

function randomizeNumericParam(param, currentValue, nextRandom) {
  const [rawMin, rawMax] = Array.isArray(param?.range) ? param.range : [param?.min, param?.max];
  const fallback = Number(currentValue);
  const min = Number.isFinite(rawMin) ? rawMin : Number.isFinite(fallback) ? fallback : 0;
  const max = Number.isFinite(rawMax) ? rawMax : Number.isFinite(fallback) ? fallback : min + 1;
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const step = getParamStep(param);

  if (param?.type === "integer") {
    const minInt = Math.ceil(lower);
    const maxInt = Math.floor(upper);
    if (maxInt <= minInt) {
      return minInt;
    }

    return minInt + Math.floor(nextRandom() * ((maxInt - minInt) + 1));
  }

  if (lower === upper) {
    return lower;
  }

  const rawValue = lower + ((upper - lower) * nextRandom());
  const snapped = step > 0
    ? lower + (Math.round((rawValue - lower) / step) * step)
    : rawValue;

  return Number(clampToRange(snapped, param).toFixed(4));
}

function buildRandomizedSceneParams(clip, sceneManifest, seed = Date.now()) {
  const nextRandom = createSeededRandom(seed);
  const nextParams = clip?.params && typeof clip.params === "object"
    ? { ...clip.params }
    : {};

  Object.entries(sceneManifest?.params || {}).forEach(([paramName, param]) => {
    const currentValue = clip?.params?.[paramName] ?? param?.default;

    if (Array.isArray(param?.options) && param.options.length > 0) {
      nextParams[paramName] = pickRandomOption(param.options, nextRandom);
      return;
    }

    if (param?.type === "color") {
      nextParams[paramName] = randomHexColor(nextRandom);
      return;
    }

    if (param?.type === "text" || param?.type === "string") {
      nextParams[paramName] = currentValue;
      return;
    }

    if (
      param?.type === "range"
      || param?.type === "number"
      || param?.type === "integer"
      || Array.isArray(param?.range)
    ) {
      nextParams[paramName] = randomizeNumericParam(param, currentValue, nextRandom);
      return;
    }

    nextParams[paramName] = currentValue;
  });

  return nextParams;
}

export function mountInspector(container, { store } = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("mountInspector(container, options) requires a container element");
  }

  if (container[INSPECTOR_STATE]) {
    container[INSPECTOR_STATE].destroy();
  }

  const header = document.createElement("div");
  header.className = "panel-header";
  header.innerHTML = `
    <div class="panel-title">
      <strong>Inspector</strong>
      <span>Clip timing and scene parameters</span>
    </div>
    <div class="chip-row">
      <div class="mini-chip" data-role="status">No Selection</div>
    </div>
  `;

  const body = document.createElement("div");
  body.className = "inspector-body inspector-stack";
  container.replaceChildren(header, body);

  const status = header.querySelector('[data-role="status"]');
  let lastSelectedClipId = store?.state?.selectedClipId ?? null;
  let lastTimelineRef = store?.state?.timeline;
  let lastProjectRef = store?.state?.project;
  let expandedKeyframeParam = null;

  function renderEmptyState() {
    status.textContent = "Project";
    body.replaceChildren();

    const projectSection = createInspectorSection("Project", "Canvas output and aspect ratio");
    const selectedPreset = findAspectPresetForProject(store?.state?.project);

    projectSection.body.append(
      renderField({
        label: "Aspect Preset",
        name: "aspectPreset",
        type: "select",
        value: selectedPreset?.id ?? ASPECT_PRESETS[0].id,
        options: ASPECT_PRESETS.map((preset) => ({
          value: preset.id,
          label: preset.name,
        })),
        onChange: (presetId) => {
          updateProjectAspectPreset(store, presetId);
        },
      }),
      createReadonlyRow("Resolution", formatProjectResolution(store?.state?.project)),
    );

    body.appendChild(projectSection.section);
  }

  function renderSelection() {
    const selection = findSelectedClip(store?.state);
    if (!selection) {
      renderEmptyState();
      return;
    }

    const { clip, track } = selection;
    const scene = SCENE_MANIFEST_BY_ID.get(clip.scene);
    const asset = findAssetById(store?.state, clip.assetId);
    const localPlayhead = getClipLocalPlayhead(store?.state, clip);
    status.textContent = clip.name || scene?.name || asset?.name || clip.scene || clip.assetId || clip.id;
    body.replaceChildren();

    const transform = createInspectorSection("Transform", "Timing and track placement");
    const organize = createClipOrganizeSection({
      clip,
      onLabelChange: (nextLabel) => {
        updateSelectedClipField(store, "label", nextLabel || undefined);
      },
      onNoteChange: (nextNote) => {
        updateSelectedClipField(store, "note", nextNote || undefined);
      },
    });
    const durationValue = Number(clip.dur ?? clip.duration) || 0;

    transform.body.append(
      renderField({
        label: "Start Time",
        name: "start",
        type: "number",
        value: Number(clip.start) || 0,
        min: 0,
        step: 0.1,
        onChange: (nextValue) => {
          updateSelectedClip(store, (draftClip) => {
            draftClip.start = Math.max(0, Number.isFinite(nextValue) ? nextValue : Number(draftClip.start) || 0);
          });
        },
      }),
      renderField({
        label: "Duration",
        name: "duration",
        type: "number",
        value: durationValue,
        min: 0.1,
        step: 0.1,
        onChange: (nextValue) => {
          updateSelectedClip(store, (draftClip) => {
            draftClip.dur = Math.max(0.1, Number.isFinite(nextValue) ? nextValue : Number(draftClip.dur) || 0.1);
          });
        },
      }),
      createReadonlyRow("Track", track?.label || track?.name || String(track?.kind || "track").toUpperCase()),
    );

    if (scene) {
      if (expandedKeyframeParam && !Object.prototype.hasOwnProperty.call(scene.params || {}, expandedKeyframeParam)) {
        expandedKeyframeParam = null;
      }

      const sceneSection = createInspectorSection("Scene", "Schema-driven scene controls");
      sceneSection.body.appendChild(createReadonlyRow("Scene Name", scene.name || clip.scene || "Unknown scene"));

      Object.entries(scene.params || {}).forEach(([paramName, param]) => {
        const paramValue = clip?.params?.[paramName];
        const [min, max] = Array.isArray(param.range) ? param.range : [param.min, param.max];
        const fieldType = getFieldType(param);
        const numericParam = isNumericParam(param, fieldType);
        const currentValue = numericParam
          ? getDisplayedNumericValue(paramValue, param.default, localPlayhead)
          : (paramValue ?? param.default);
        const details = numericParam && expandedKeyframeParam === paramName
          ? renderKeyframeEditor({
              paramName,
              currentValue,
              store,
              dispatch: typeof store?.dispatch === "function" ? store.dispatch.bind(store) : null,
            })
          : null;

        sceneSection.body.appendChild(renderField({
          label: paramName,
          name: paramName,
          type: fieldType,
          value: currentValue,
          min,
          max,
          step: getParamStep(param),
          options: param.options || [],
          description: param.description,
          inlineAction: numericParam ? {
            label: "♦",
            title: isKeyframesParam(paramValue)
              ? `Edit ${paramName} keyframes`
              : `Open ${paramName} keyframe editor`,
            pressed: isKeyframesParam(paramValue) || expandedKeyframeParam === paramName,
            onClick: () => {
              expandedKeyframeParam = expandedKeyframeParam === paramName ? null : paramName;
              renderSelection();
            },
          } : null,
          details,
          onChange: (nextValue, rawValue) => {
            if (numericParam && isKeyframesParam(paramValue)) {
              const coerced = coerceParamValue(nextValue, param, currentValue);
              const nextNumber = clampToRange(Number(coerced), param);
              updateSelectedClipParam(
                store,
                paramName,
                upsertKeyframedNumber(paramValue, localPlayhead, nextNumber, getClipDuration(clip)),
              );
              return;
            }

            const coerced = coerceParamValue(fieldType === "text" ? rawValue : nextValue, param, paramValue);
            updateSelectedClipParam(
              store,
              paramName,
              typeof coerced === "number"
                ? clampToRange(coerced, param)
                : coerced,
            );
          },
        }));
      });

      sceneSection.body.insertBefore(createSceneRandomizeButton({
        disabled: typeof store?.dispatch !== "function",
        onRandomize: () => {
          if (typeof store?.dispatch !== "function") {
            return;
          }

          store.dispatch(randomizeParamsCommand({
            clipId: clip.id,
            newParams: buildRandomizedSceneParams(clip, scene, Date.now()),
          }));
        },
      }), sceneSection.body.children[1] ?? null);

      body.append(transform.section, organize.section, sceneSection.section);
      return;
    }

    const sourceSection = createInspectorSection("Source", "Imported asset reference");
    sourceSection.body.append(
      createReadonlyRow("Asset", asset?.name || asset?.label || clip.assetId || "Unknown asset"),
      createReadonlyRow("Kind", clip.assetKind || asset?.kind || "asset"),
    );
    body.append(transform.section, organize.section, sourceSection.section);
  }

  const unsubscribe = typeof store?.subscribe === "function"
    ? store.subscribe((nextState) => {
      if (
        nextState.selectedClipId !== lastSelectedClipId
        || nextState.timeline !== lastTimelineRef
        || (!nextState.selectedClipId && nextState.project !== lastProjectRef)
      ) {
        renderSelection();
        lastSelectedClipId = nextState.selectedClipId ?? null;
        lastTimelineRef = nextState.timeline;
        lastProjectRef = nextState.project;
      }
    })
    : () => {};

  renderSelection();

  const api = {
    destroy() {
      unsubscribe();
      delete container[INSPECTOR_STATE];
      container.replaceChildren();
    },
  };

  container[INSPECTOR_STATE] = api;
  return api;
}

function formatProjectResolution(project) {
  const width = Number(project?.width) || 0;
  const height = Number(project?.height) || 0;
  return `${width}\u00d7${height}`;
}
