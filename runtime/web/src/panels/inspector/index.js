import { SCENE_MANIFEST_BY_ID } from "../../scenes/index.js";
import { renderField } from "./field.js";
import { createInspectorSection, createReadonlyRow } from "./sections.js";

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

function getFieldType(param) {
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

  if (param?.type === "string" || param?.type === "color" || param?.type === "select") {
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

  function renderEmptyState() {
    status.textContent = "No Selection";
    body.replaceChildren();

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <div class="empty-glyph" aria-hidden="true"></div>
      <strong>Select a clip to edit its properties</strong>
    `;
    body.appendChild(empty);
  }

  function renderSelection() {
    const selection = findSelectedClip(store?.state);
    if (!selection) {
      renderEmptyState();
      return;
    }

    const { clip, track } = selection;
    const scene = SCENE_MANIFEST_BY_ID.get(clip.scene);
    status.textContent = scene?.name || clip.scene || clip.id;
    body.replaceChildren();

    const transform = createInspectorSection("Transform", "Timing and track placement");
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

    const sceneSection = createInspectorSection("Scene", "Schema-driven scene controls");
    sceneSection.body.appendChild(createReadonlyRow("Scene Name", scene?.name || clip.scene || "Unknown scene"));

    (scene?.params || []).forEach((param) => {
      const currentValue = clip?.params?.[param.name] ?? param.default;
      const [min, max] = Array.isArray(param.range) ? param.range : [param.min, param.max];
      const fieldType = getFieldType(param);

      sceneSection.body.appendChild(renderField({
        label: param.name,
        name: param.name,
        type: fieldType,
        value: currentValue,
        min,
        max,
        step: typeof param.step === "number" ? param.step : param.type === "integer" ? 1 : 0.01,
        options: param.options || [],
        description: param.description,
        onChange: (nextValue, rawValue) => {
          updateSelectedClip(store, (draftClip) => {
            if (!draftClip.params || typeof draftClip.params !== "object") {
              draftClip.params = {};
            }

            const coerced = coerceParamValue(fieldType === "text" ? rawValue : nextValue, param, draftClip.params[param.name]);
            draftClip.params[param.name] = typeof coerced === "number"
              ? clampToRange(coerced, param)
              : coerced;
          });
        },
      }));
    });

    body.append(transform.section, sceneSection.section);
  }

  const unsubscribe = typeof store?.subscribe === "function"
    ? store.subscribe((nextState, previousState) => {
      if (nextState.selectedClipId !== previousState.selectedClipId || nextState.timeline !== previousState.timeline) {
        renderSelection();
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
