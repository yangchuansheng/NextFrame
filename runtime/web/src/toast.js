const ROOT_ID = "toast-root";
const STYLE_ID = "nextframe-toast-style";
const MAX_VISIBLE_TOASTS = 5;
const ENTER_DURATION_MS = 200;
const EXIT_DURATION_MS = 300;
const TOAST_STATE = Symbol("nextframe.toast.state");

export function toast(message, { type = "info", duration = 3000 } = {}) {
  installStyles();
  const root = ensureRoot();
  const positions = capturePositions(root);
  const item = createToast(String(message ?? ""), normalizeType(type));

  root.prepend(item);
  animateStack(root, positions);

  window.requestAnimationFrame(() => {
    if (item.isConnected) {
      item.dataset.state = "visible";
    }
  });

  const state = ensureToastState(item);
  state.dismissTimer = window.setTimeout(() => {
    dismissToast(item);
  }, normalizeDuration(duration));

  trimOverflow(root);
}

export function clearToasts() {
  const root = document.getElementById(ROOT_ID);
  if (!root) {
    return;
  }

  for (const item of Array.from(root.children)) {
    dismissToast(item);
  }
}

function ensureRoot() {
  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-atomic", "false");
  document.body.append(root);
  return root;
}

function createToast(message, type) {
  const item = document.createElement("div");
  item.className = "nextframe-toast";
  item.dataset.state = "pending";
  item.dataset.type = type;
  item.setAttribute("role", type === "error" ? "alert" : "status");
  item.textContent = message;
  return item;
}

function ensureToastState(item) {
  if (!item[TOAST_STATE]) {
    item[TOAST_STATE] = {
      dismissTimer: 0,
      removeTimer: 0,
      exiting: false,
    };
  }

  return item[TOAST_STATE];
}

function dismissToast(item) {
  const state = ensureToastState(item);
  if (state.exiting) {
    return;
  }

  state.exiting = true;
  window.clearTimeout(state.dismissTimer);
  item.dataset.state = "exiting";
  state.removeTimer = window.setTimeout(() => {
    removeToast(item);
  }, EXIT_DURATION_MS);
}

function removeToast(item) {
  const state = ensureToastState(item);
  window.clearTimeout(state.dismissTimer);
  window.clearTimeout(state.removeTimer);
  delete item[TOAST_STATE];

  const root = item.parentElement;
  item.remove();

  if (root && root.children.length === 0) {
    root.remove();
  }
}

function trimOverflow(root) {
  const items = Array.from(root.children);
  if (items.length <= MAX_VISIBLE_TOASTS) {
    return;
  }

  for (const item of items.slice(MAX_VISIBLE_TOASTS)) {
    removeToast(item);
  }
}

function capturePositions(root) {
  const positions = new Map();
  for (const item of Array.from(root.children)) {
    positions.set(item, item.getBoundingClientRect().top);
  }
  return positions;
}

function animateStack(root, positions) {
  for (const item of Array.from(root.children)) {
    const previousTop = positions.get(item);
    if (previousTop == null || typeof item.animate !== "function") {
      continue;
    }

    const nextTop = item.getBoundingClientRect().top;
    const delta = previousTop - nextTop;
    if (Math.abs(delta) < 1) {
      continue;
    }

    item.animate(
      [
        { transform: `translateY(${delta}px)` },
        { transform: "translateY(0)" },
      ],
      {
        duration: ENTER_DURATION_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  }
}

function normalizeDuration(duration) {
  const value = Number(duration);
  if (!Number.isFinite(value) || value < 0) {
    return 3000;
  }

  return value;
}

function normalizeType(type) {
  switch (type) {
    case "success":
    case "warn":
    case "error":
      return type;
    default:
      return "info";
  }
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1400;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-end;
      pointer-events: none;
    }

    .nextframe-toast {
      box-sizing: border-box;
      position: relative;
      max-width: min(280px, calc(100vw - 48px));
      padding: 12px 14px 12px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: #14141e;
      box-shadow: 0 16px 36px rgba(5, 8, 18, 0.32);
      color: #f3f5ff;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      opacity: 0;
      transform: translateY(12px);
      transition:
        opacity ${ENTER_DURATION_MS}ms ease,
        transform ${ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
      overflow: hidden;
      pointer-events: auto;
    }

    .nextframe-toast::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: #4d7cff;
    }

    .nextframe-toast[data-type="success"]::before {
      background: #20b15a;
    }

    .nextframe-toast[data-type="warn"]::before {
      background: #d89b27;
    }

    .nextframe-toast[data-type="error"]::before {
      background: #d44d4d;
    }

    .nextframe-toast[data-state="visible"] {
      opacity: 1;
      transform: translateY(0);
    }

    .nextframe-toast[data-state="exiting"] {
      opacity: 0;
      transform: translateY(10px);
      transition-duration: ${EXIT_DURATION_MS}ms;
    }
  `;
  document.head.append(style);
}
