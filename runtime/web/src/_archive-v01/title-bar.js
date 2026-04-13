const MOUNT_KEY = Symbol("nextframe.titleBar.mount");
const UNTITLED_LABEL = "Untitled";
const APP_NAME = "NextFrame";

export function mountTitleBar(container, store) {
  if (!isElementLike(container)) {
    throw new TypeError("mountTitleBar(container, store) requires a container element");
  }

  if (!store || typeof store.subscribe !== "function" || typeof store.state !== "object") {
    throw new TypeError("mountTitleBar(container, store) requires a compatible store");
  }

  const doc = resolveDocument(container);
  container[MOUNT_KEY]?.destroy();

  const titleEl = doc.createElement("div");
  titleEl.className = "project-title-label";
  titleEl.setAttribute("aria-label", "Project title");
  titleEl.title = "Rename project (coming soon)";

  replaceContainerChildren(container, titleEl);

  const render = (state) => {
    const dirty = Boolean(state?.dirty);
    const label = projectLabel(state?.filePath);

    titleEl.dataset.dirty = dirty ? "true" : "false";
    titleEl.textContent = `${dirty ? "\u25cf " : ""}${label}`;
    doc.title = `${label}${dirty ? " \u2022" : ""} \u2014 ${APP_NAME}`;
  };

  const unsubscribe = store.subscribe((state, previousState) => {
    if (
      state?.filePath === previousState?.filePath
      && Boolean(state?.dirty) === Boolean(previousState?.dirty)
    ) {
      return;
    }

    render(state);
  });

  render(store.state);

  const destroy = () => {
    unsubscribe();
    if (container[MOUNT_KEY]?.destroy === destroy) {
      delete container[MOUNT_KEY];
    }
    replaceContainerChildren(container);
  };

  container[MOUNT_KEY] = { destroy };
  return { destroy };
}

function projectLabel(filePath) {
  return basename(filePath) ?? UNTITLED_LABEL;
}

function basename(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    return null;
  }

  return filePath.split(/[\\/]/).pop() ?? filePath;
}

function resolveDocument(container) {
  const doc = container?.ownerDocument ?? globalThis.document;
  if (!doc || typeof doc.createElement !== "function") {
    throw new TypeError("mountTitleBar(container, store) requires a document");
  }

  return doc;
}

function isElementLike(value) {
  return Boolean(value) && typeof value.append === "function";
}

function replaceContainerChildren(container, ...children) {
  if (typeof container.replaceChildren === "function") {
    container.replaceChildren(...children);
    return;
  }

  if (Array.isArray(container.children)) {
    container.children.length = 0;
  }

  container.textContent = "";
  if (children.length > 0) {
    container.append(...children);
  }
}
