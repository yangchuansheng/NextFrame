const STYLE_ID = "nextframe-tutorial-styles";
const ACTIVE_TUTORIAL_KEY = Symbol.for("nextframe.tutorial.active");
const STEP_STORAGE_KEY = "nextframe.tutorial.step";

const STEP_DEFINITIONS = [
  {
    name: "welcome",
    title: "Welcome",
    body: "Here's your playback preview. Scenes render frame-pure.",
    placement: "bottom",
    selector: "#center-preview",
  },
  {
    name: "library",
    title: "Library",
    body: "Drag any scene onto a track to create a clip.",
    placement: "right",
    selector: "#left-library",
  },
  {
    name: "timeline",
    title: "Timeline",
    body: "Your project timeline. Drag clips, resize edges, use Blade (B) to split.",
    placement: "top",
    selector: "#bottom-timeline",
  },
  {
    name: "inspector",
    title: "Inspector",
    body: "Select a clip to edit its parameters live.",
    placement: "left",
    selector: "#right-inspector",
  },
  {
    name: "export",
    title: "Export",
    body: "When ready, File \u2192 Export to render MP4.",
    placement: "bottom",
    selector: '[data-menu-trigger="file"]',
  },
];

export function startTutorial({ store, anchors = {} } = {}) {
  if (!store || typeof store.mutate !== "function" || !store.state) {
    throw new TypeError("startTutorial({ store, anchors }) requires a compatible store");
  }

  if (store.state.tutorialComplete) {
    return createIdleController();
  }

  installStyles();

  const existing = document.body?.[ACTIVE_TUTORIAL_KEY];
  if (existing && typeof existing.destroy === "function") {
    existing.destroy();
  }

  const steps = STEP_DEFINITIONS.map((definition) => ({
    ...definition,
    anchor: resolveAnchor(definition, anchors),
  })).filter((step) => isVisibleAnchor(step.anchor));

  if (steps.length === 0) {
    return createIdleController();
  }

  let active = false;
  let destroyed = false;
  let currentIndex = resolveInitialStepIndex(steps);

  const root = document.createElement("div");
  root.className = "nextframe-tutorial-root";
  root.setAttribute("aria-hidden", "true");

  const shades = ["top", "right", "bottom", "left"].map((position) => {
    const element = document.createElement("div");
    element.className = `nextframe-tutorial-shade nextframe-tutorial-shade--${position}`;
    return element;
  });

  const highlight = document.createElement("div");
  highlight.className = "nextframe-tutorial-highlight";

  const bubble = document.createElement("section");
  bubble.className = "nextframe-tutorial-bubble";
  bubble.setAttribute("role", "dialog");
  bubble.setAttribute("aria-label", "Editor tutorial");
  bubble.setAttribute("aria-modal", "true");

  const arrow = document.createElement("div");
  arrow.className = "nextframe-tutorial-arrow";
  arrow.setAttribute("aria-hidden", "true");

  const title = document.createElement("h2");
  title.className = "nextframe-tutorial-title";

  const body = document.createElement("p");
  body.className = "nextframe-tutorial-body";

  const footer = document.createElement("div");
  footer.className = "nextframe-tutorial-footer";

  const meta = document.createElement("div");
  meta.className = "nextframe-tutorial-meta";

  const nextButton = document.createElement("button");
  nextButton.className = "nextframe-tutorial-button";
  nextButton.type = "button";
  nextButton.addEventListener("click", () => {
    if (currentIndex >= steps.length - 1) {
      complete();
      return;
    }

    setIndex(currentIndex + 1);
  });

  footer.append(meta, nextButton);
  bubble.append(arrow, title, body, footer);
  root.append(...shades, highlight, bubble);

  const onKeyDown = (event) => {
    if (!active || event.defaultPrevented || isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      setIndex(currentIndex - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      event.stopPropagation();
      if (currentIndex >= steps.length - 1) {
        complete();
      } else {
        setIndex(currentIndex + 1);
      }
    }
  };

  const onViewportChange = () => {
    if (active) {
      render();
    }
  };

  const controller = {
    destroy,
    dismiss,
    next() {
      if (currentIndex >= steps.length - 1) {
        complete();
        return;
      }

      setIndex(currentIndex + 1);
    },
    prev() {
      setIndex(currentIndex - 1);
    },
    resume() {
      if (destroyed || active || store.state.tutorialComplete) {
        return;
      }

      show();
    },
  };

  document.body[ACTIVE_TUTORIAL_KEY] = controller;
  show();
  return controller;

  function show() {
    if (destroyed || active) {
      return;
    }

    document.body.append(root);
    root.setAttribute("aria-hidden", "false");
    active = true;
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    render();
  }

  function hide() {
    if (!active) {
      return;
    }

    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", onViewportChange);
    window.removeEventListener("scroll", onViewportChange, true);
    root.remove();
    root.setAttribute("aria-hidden", "true");
    active = false;
  }

  function destroy() {
    if (destroyed) {
      return;
    }

    hide();
    if (document.body?.[ACTIVE_TUTORIAL_KEY] === controller) {
      delete document.body[ACTIVE_TUTORIAL_KEY];
    }
    destroyed = true;
  }

  function dismiss() {
    if (destroyed) {
      return;
    }

    writeStoredStepName(steps[currentIndex]?.name);
    hide();
  }

  function complete() {
    if (destroyed) {
      return;
    }

    clearStoredStepName();
    if (!store.state.tutorialComplete) {
      store.mutate((state) => {
        state.tutorialComplete = true;
      });
    }
    destroy();
  }

  function setIndex(nextIndex) {
    const clampedIndex = clamp(nextIndex, 0, steps.length - 1);
    if (clampedIndex === currentIndex) {
      return;
    }

    currentIndex = clampedIndex;
    writeStoredStepName(steps[currentIndex]?.name);
    render();
  }

  function render() {
    if (!active) {
      return;
    }

    const step = steps[currentIndex];
    step.anchor = resolveAnchor(step, anchors);

    if (!isVisibleAnchor(step.anchor)) {
      const fallbackIndex = steps.findIndex((candidate) => isVisibleAnchor(resolveAnchor(candidate, anchors)));
      if (fallbackIndex < 0) {
        dismiss();
        return;
      }

      currentIndex = fallbackIndex;
      writeStoredStepName(steps[currentIndex]?.name);
      steps[currentIndex].anchor = resolveAnchor(steps[currentIndex], anchors);
    }

    const anchorRect = steps[currentIndex].anchor.getBoundingClientRect();
    const highlightRect = inflateRect(anchorRect, 8, window.innerWidth, window.innerHeight);

    positionShades(highlightRect, shades, window.innerWidth, window.innerHeight);
    positionHighlight(highlightRect, highlight, steps[currentIndex].anchor);

    writeStoredStepName(steps[currentIndex]?.name);
    title.textContent = steps[currentIndex].title;
    body.textContent = steps[currentIndex].body;
    meta.textContent = `${currentIndex + 1}/${steps.length} | Left/Right | Esc`;
    nextButton.textContent = currentIndex >= steps.length - 1 ? "Got it" : "Next";

    bubble.dataset.placement = steps[currentIndex].placement;
    bubble.style.top = "0px";
    bubble.style.left = "0px";

    const bubbleRect = bubble.getBoundingClientRect();
    const placement = choosePlacement(steps[currentIndex].placement, highlightRect, bubbleRect, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

    bubble.dataset.placement = placement.placement;
    bubble.style.left = `${placement.left}px`;
    bubble.style.top = `${placement.top}px`;
    bubble.style.setProperty("--nextframe-tutorial-arrow-x", `${placement.arrowX}px`);
    bubble.style.setProperty("--nextframe-tutorial-arrow-y", `${placement.arrowY}px`);
  }
}

function createIdleController() {
  return {
    destroy() {},
    dismiss() {},
    next() {},
    prev() {},
    resume() {},
  };
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .nextframe-tutorial-root {
      position: fixed;
      inset: 0;
      z-index: 200;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #ffffff;
    }

    .nextframe-tutorial-shade {
      position: fixed;
      background: rgba(0, 0, 0, 0.35);
      pointer-events: auto;
    }

    .nextframe-tutorial-highlight {
      position: fixed;
      border-radius: 12px;
      pointer-events: none;
      box-shadow:
        0 0 0 2px rgba(148, 163, 255, 0.98),
        0 0 0 10px rgba(99, 102, 241, 0.18),
        0 18px 36px rgba(0, 0, 0, 0.28);
      animation: nextframe-tutorial-pulse 1.8s ease-in-out infinite;
    }

    .nextframe-tutorial-bubble {
      position: fixed;
      width: min(320px, calc(100vw - 24px));
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      background: #14141e;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.36);
      pointer-events: auto;
    }

    .nextframe-tutorial-title {
      margin: 0 0 6px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
    }

    .nextframe-tutorial-body {
      margin: 0;
      color: rgba(255, 255, 255, 0.92);
    }

    .nextframe-tutorial-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
    }

    .nextframe-tutorial-meta {
      color: rgba(255, 255, 255, 0.62);
      font-size: 11px;
      white-space: nowrap;
    }

    .nextframe-tutorial-button {
      min-width: 72px;
      height: 30px;
      padding: 0 12px;
      border: 1px solid rgba(148, 163, 255, 0.4);
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(79, 70, 229, 0.9));
      color: #ffffff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .nextframe-tutorial-button:focus-visible {
      outline: 2px solid rgba(191, 219, 254, 0.95);
      outline-offset: 2px;
    }

    .nextframe-tutorial-arrow {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #14141e;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      transform: rotate(45deg);
    }

    .nextframe-tutorial-bubble[data-placement="top"] .nextframe-tutorial-arrow {
      left: calc(var(--nextframe-tutorial-arrow-x, 24px) - 6px);
      bottom: -7px;
      transform: rotate(225deg);
    }

    .nextframe-tutorial-bubble[data-placement="bottom"] .nextframe-tutorial-arrow {
      left: calc(var(--nextframe-tutorial-arrow-x, 24px) - 6px);
      top: -7px;
      transform: rotate(45deg);
    }

    .nextframe-tutorial-bubble[data-placement="left"] .nextframe-tutorial-arrow {
      top: calc(var(--nextframe-tutorial-arrow-y, 24px) - 6px);
      right: -7px;
      transform: rotate(135deg);
    }

    .nextframe-tutorial-bubble[data-placement="right"] .nextframe-tutorial-arrow {
      top: calc(var(--nextframe-tutorial-arrow-y, 24px) - 6px);
      left: -7px;
      transform: rotate(-45deg);
    }

    @keyframes nextframe-tutorial-pulse {
      0%,
      100% {
        box-shadow:
          0 0 0 2px rgba(148, 163, 255, 0.98),
          0 0 0 10px rgba(99, 102, 241, 0.14),
          0 18px 36px rgba(0, 0, 0, 0.24);
      }

      50% {
        box-shadow:
          0 0 0 2px rgba(191, 219, 254, 1),
          0 0 0 14px rgba(99, 102, 241, 0.24),
          0 22px 44px rgba(0, 0, 0, 0.32);
      }
    }
  `;

  document.head.append(style);
}

function resolveInitialStepIndex(steps) {
  const storedStepName = readStoredStepName();
  if (!storedStepName) {
    return 0;
  }

  const index = steps.findIndex((step) => step.name === storedStepName);
  return index >= 0 ? index : 0;
}

function resolveAnchor(step, anchors) {
  const providedAnchor = anchors?.[step.name];
  if (providedAnchor instanceof Element) {
    return providedAnchor;
  }

  if (typeof step.selector === "string") {
    return document.querySelector(step.selector);
  }

  return null;
}

function isVisibleAnchor(anchor) {
  if (!(anchor instanceof Element)) {
    return false;
  }

  const rect = anchor.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function inflateRect(rect, padding, viewportWidth, viewportHeight) {
  const left = clamp(rect.left - padding, 0, viewportWidth);
  const top = clamp(rect.top - padding, 0, viewportHeight);
  const right = clamp(rect.right + padding, 0, viewportWidth);
  const bottom = clamp(rect.bottom + padding, 0, viewportHeight);

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    centerX: left + (Math.max(0, right - left) / 2),
    centerY: top + (Math.max(0, bottom - top) / 2),
  };
}

function positionShades(rect, shades, viewportWidth, viewportHeight) {
  const [topShade, rightShade, bottomShade, leftShade] = shades;

  topShade.style.left = "0px";
  topShade.style.top = "0px";
  topShade.style.width = `${viewportWidth}px`;
  topShade.style.height = `${Math.max(0, rect.top)}px`;

  rightShade.style.left = `${rect.right}px`;
  rightShade.style.top = `${rect.top}px`;
  rightShade.style.width = `${Math.max(0, viewportWidth - rect.right)}px`;
  rightShade.style.height = `${rect.height}px`;

  bottomShade.style.left = "0px";
  bottomShade.style.top = `${rect.bottom}px`;
  bottomShade.style.width = `${viewportWidth}px`;
  bottomShade.style.height = `${Math.max(0, viewportHeight - rect.bottom)}px`;

  leftShade.style.left = "0px";
  leftShade.style.top = `${rect.top}px`;
  leftShade.style.width = `${Math.max(0, rect.left)}px`;
  leftShade.style.height = `${rect.height}px`;
}

function positionHighlight(rect, highlight, anchor) {
  highlight.style.left = `${rect.left}px`;
  highlight.style.top = `${rect.top}px`;
  highlight.style.width = `${rect.width}px`;
  highlight.style.height = `${rect.height}px`;
  highlight.style.borderRadius = getHighlightRadius(anchor);
}

function choosePlacement(preferredPlacement, anchorRect, bubbleRect, viewport) {
  const placements = [preferredPlacement, oppositePlacement(preferredPlacement), "bottom", "top", "right", "left"]
    .filter((placement, index, values) => values.indexOf(placement) === index)
    .map((placement, order) => createPlacementCandidate(placement, order, anchorRect, bubbleRect, viewport));

  placements.sort((left, right) => left.overflow - right.overflow || left.order - right.order);
  return placements[0];
}

function createPlacementCandidate(placement, order, anchorRect, bubbleRect, viewport) {
  const gap = 16;
  const margin = 12;
  const maxLeft = Math.max(margin, viewport.width - margin - bubbleRect.width);
  const maxTop = Math.max(margin, viewport.height - margin - bubbleRect.height);

  let left = margin;
  let top = margin;
  let overflow = 0;

  if (placement === "top" || placement === "bottom") {
    left = clamp(anchorRect.centerX - (bubbleRect.width / 2), margin, maxLeft);
    top = placement === "top"
      ? anchorRect.top - bubbleRect.height - gap
      : anchorRect.bottom + gap;

    if (top < margin) {
      overflow += margin - top;
    }

    if (top + bubbleRect.height > viewport.height - margin) {
      overflow += top + bubbleRect.height - (viewport.height - margin);
    }
  } else {
    top = clamp(anchorRect.centerY - (bubbleRect.height / 2), margin, maxTop);
    left = placement === "left"
      ? anchorRect.left - bubbleRect.width - gap
      : anchorRect.right + gap;

    if (left < margin) {
      overflow += margin - left;
    }

    if (left + bubbleRect.width > viewport.width - margin) {
      overflow += left + bubbleRect.width - (viewport.width - margin);
    }
  }

  const clampedLeft = clamp(left, margin, maxLeft);
  const clampedTop = clamp(top, margin, maxTop);

  return {
    placement,
    order,
    overflow,
    left: clampedLeft,
    top: clampedTop,
    arrowX: clamp(anchorRect.centerX - clampedLeft, 18, Math.max(18, bubbleRect.width - 18)),
    arrowY: clamp(anchorRect.centerY - clampedTop, 18, Math.max(18, bubbleRect.height - 18)),
  };
}

function getHighlightRadius(anchor) {
  const styles = window.getComputedStyle(anchor);
  const numericRadius = parseFloat(styles.borderRadius);
  const radius = Number.isFinite(numericRadius) ? numericRadius + 6 : 12;
  return `${Math.max(8, radius)}px`;
}

function oppositePlacement(placement) {
  switch (placement) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    default:
      return "left";
  }
}

function isEditableTarget(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
  );
}

function readStoredStepName() {
  const storage = getLocalStorage();
  if (!storage) {
    return "";
  }

  try {
    return storage.getItem(STEP_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredStepName(stepName) {
  const storage = getLocalStorage();
  if (!storage || typeof stepName !== "string" || stepName.length === 0) {
    return;
  }

  try {
    storage.setItem(STEP_STORAGE_KEY, stepName);
  } catch {}
}

function clearStoredStepName() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(STEP_STORAGE_KEY);
  } catch {}
}

function getLocalStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {}

  return null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
