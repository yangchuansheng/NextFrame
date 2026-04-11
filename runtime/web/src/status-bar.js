const MOUNT_KEY = Symbol("nextframe.statusBar.mount");
const GITHUB_URL = "https://github.com/";
const TOOL_LABELS = {
  blade: "Blade tool",
  select: "Move tool",
};

export function mountStatusBar(container, store) {
  if (!isElementLike(container)) {
    throw new TypeError("mountStatusBar(container, store) requires a container element");
  }

  if (!store || typeof store.subscribe !== "function" || typeof store.state !== "object") {
    throw new TypeError("mountStatusBar(container, store) requires a compatible store");
  }

  const doc = resolveDocument(container);
  container[MOUNT_KEY]?.destroy();

  const bar = doc.createElement("div");
  bar.className = "status-bar";

  const timeEl = createSegment(doc, "status-bar-segment status-bar-time");
  const selectionEl = createSegment(doc, "status-bar-segment status-bar-selection");
  const toolEl = createSegment(doc, "status-bar-segment status-bar-tool");
  const autosaveEl = createSegment(doc, "status-bar-segment status-bar-autosave");
  const githubEl = doc.createElement("a");
  githubEl.className = "status-bar-link";
  githubEl.href = GITHUB_URL;
  githubEl.target = "_blank";
  githubEl.rel = "noreferrer";
  githubEl.title = "Project repository placeholder";
  githubEl.textContent = "GitHub";

  const versionEl = createSegment(doc, "status-bar-segment status-bar-version");
  versionEl.textContent = "NextFrame v0.1";

  bar.append(timeEl, selectionEl, toolEl, autosaveEl, githubEl, versionEl);
  container.append(bar);

  const render = (state) => {
    timeEl.textContent = formatCursorTime(state?.playhead);
    selectionEl.textContent = formatSelectionCount(state);
    toolEl.textContent = formatToolLabel(state?.ui?.timelineTool);

    const autosave = formatAutosaveStatus(state);
    autosaveEl.textContent = autosave.label;
    autosaveEl.dataset.state = autosave.state;
  };

  const unsubscribe = store.subscribe((state) => {
    render(state);
  });

  let intervalId = null;
  if (typeof globalThis.window?.setInterval === "function") {
    intervalId = globalThis.window.setInterval(() => {
      render(store.state);
    }, 1000);
  }

  render(store.state);

  const destroy = () => {
    unsubscribe();
    if (intervalId !== null && typeof globalThis.window?.clearInterval === "function") {
      globalThis.window.clearInterval(intervalId);
    }
    if (container[MOUNT_KEY]?.destroy === destroy) {
      delete container[MOUNT_KEY];
    }
    removeElement(bar);
  };

  container[MOUNT_KEY] = { destroy };
  return { destroy };
}

function createSegment(doc, className) {
  const element = doc.createElement("div");
  element.className = className;
  return element;
}

function formatCursorTime(value) {
  const totalCentiseconds = Math.max(0, Math.floor((Number(value) || 0) * 100));
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;

  if (hours <= 0) {
    return mmss;
  }

  return `${String(hours).padStart(2, "0")}:${mmss}`;
}

function formatSelectionCount(state) {
  const clipIds = new Set();

  (Array.isArray(state?.selection?.clipIds) ? state.selection.clipIds : []).forEach((clipId) => {
    if (clipId != null) {
      clipIds.add(String(clipId));
    }
  });

  if (state?.selectedClipId != null) {
    clipIds.add(String(state.selectedClipId));
  }

  if (clipIds.size === 0) {
    return "";
  }

  return `${clipIds.size} ${clipIds.size === 1 ? "clip" : "clips"} selected`;
}

function formatToolLabel(tool) {
  return TOOL_LABELS[tool] || TOOL_LABELS.select;
}

function formatAutosaveStatus(state) {
  const lastSavedAt = readTimestamp(state?.lastSavedAt);
  const lastChangeAt = readTimestamp(state?.lastChangeAt);
  const hasUnsavedChanges = lastChangeAt != null && (lastSavedAt == null || lastChangeAt > lastSavedAt);

  if (hasUnsavedChanges || (lastSavedAt == null && Boolean(state?.dirty))) {
    return {
      label: "Unsaved changes",
      state: "dirty",
    };
  }

  if (lastSavedAt == null) {
    return {
      label: "Saved",
      state: "saved",
    };
  }

  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastSavedAt) / 1000));
  return {
    label: `Saved ${secondsAgo}s ago`,
    state: "saved",
  };
}

function readTimestamp(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function removeElement(element) {
  if (typeof element?.remove === "function") {
    element.remove();
    return;
  }

  const parent = element?.parentElement;
  if (!parent || !Array.isArray(parent.children)) {
    return;
  }

  const index = parent.children.indexOf(element);
  if (index >= 0) {
    parent.children.splice(index, 1);
  }
}

function resolveDocument(container) {
  const doc = container?.ownerDocument ?? globalThis.document;
  if (!doc || typeof doc.createElement !== "function") {
    throw new TypeError("mountStatusBar(container, store) requires a document");
  }

  return doc;
}

function isElementLike(value) {
  return Boolean(value) && typeof value.append === "function";
}
