export const NEXTFRAME_DND_MIME = "application/nextframe+json";

let activePayload = null;

function clonePayload(payload) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(payload);
  }

  return JSON.parse(JSON.stringify(payload));
}

export function clearActiveDragPayload() {
  activePayload = null;
}

export function readDragPayload(dataTransfer) {
  if (dataTransfer && typeof dataTransfer.getData === "function") {
    const raw = dataTransfer.getData(NEXTFRAME_DND_MIME);
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        activePayload = clonePayload(payload);
        return payload;
      } catch {
        return null;
      }
    }
  }

  return activePayload ? clonePayload(activePayload) : null;
}

export function makeDraggable(el, payload) {
  if (!(el instanceof HTMLElement)) {
    throw new TypeError("makeDraggable(el, payload) requires an element");
  }

  if (!payload || typeof payload !== "object") {
    throw new TypeError("makeDraggable(el, payload) requires a payload object");
  }

  el.setAttribute("draggable", "true");

  const handleDragStart = (event) => {
    activePayload = clonePayload(payload);
    const serialized = JSON.stringify(payload);
    event.dataTransfer?.setData(NEXTFRAME_DND_MIME, serialized);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
    }
  };

  const handleDragEnd = () => {
    clearActiveDragPayload();
  };

  el.addEventListener("dragstart", handleDragStart);
  el.addEventListener("dragend", handleDragEnd);

  return () => {
    el.removeEventListener("dragstart", handleDragStart);
    el.removeEventListener("dragend", handleDragEnd);
  };
}
