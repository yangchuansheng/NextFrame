import { clearActiveDragPayload, readDragPayload } from "./source.js";

const DND_CONTEXT = {
  store: null,
  scenes: [],
  scenesById: new Map(),
};

let teardownDragDrop = null;

function emitDragEvent(name, detail = {}) {
  document.dispatchEvent(new CustomEvent(`nextframe:${name}`, { detail }));
}

function clearDragState() {
  clearActiveDragPayload();
  document.body.classList.remove("dragging");
  emitDragEvent("dndend");
}

export function getDragDropContext() {
  return DND_CONTEXT;
}

export function initDragDrop({ store, scenes = [] } = {}) {
  teardownDragDrop?.();

  DND_CONTEXT.store = store ?? null;
  DND_CONTEXT.scenes = Array.isArray(scenes) ? [...scenes] : [];
  DND_CONTEXT.scenesById = new Map(DND_CONTEXT.scenes.map((scene) => [scene.id, scene]));

  const handleDragStart = (event) => {
    const payload = readDragPayload(event.dataTransfer);
    if (!payload) {
      return;
    }

    document.body.classList.add("dragging");
    emitDragEvent("dndstart", { payload });
  };

  const handleDragOver = (event) => {
    const payload = readDragPayload(event.dataTransfer);
    if (!payload) {
      return;
    }

    emitDragEvent("dndmove", {
      payload,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  window.addEventListener("dragstart", handleDragStart);
  window.addEventListener("dragover", handleDragOver, true);
  window.addEventListener("drop", clearDragState, true);
  window.addEventListener("dragend", clearDragState, true);

  teardownDragDrop = () => {
    window.removeEventListener("dragstart", handleDragStart);
    window.removeEventListener("dragover", handleDragOver, true);
    window.removeEventListener("drop", clearDragState, true);
    window.removeEventListener("dragend", clearDragState, true);
    clearDragState();
  };

  return teardownDragDrop;
}
