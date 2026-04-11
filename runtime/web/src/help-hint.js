const STYLE_ID = "nextframe-help-hint-style";
const MOUNT_KEY = Symbol("nextframe.helpHint.mount");

const SHORTCUTS = [
  ["?", "Toggle shortcut help"],
  ["⎵", "Play / pause"],
  ["B", "Toggle blade tool"],
  ["S", "Toggle snapping"],
  ["← / →", "Nudge playhead by 1s"],
  ["Shift + ← / →", "Nudge playhead by 5s"],
  ["Delete / Backspace", "Remove selected clips"],
  ["⌘/Ctrl + N", "New project"],
  ["⌘/Ctrl + O", "Open project"],
  ["⌘/Ctrl + S", "Save project"],
  ["⌘/Ctrl + Shift + S", "Save project as"],
  ["⌘/Ctrl + C", "Copy selected clips"],
  ["⌘/Ctrl + X", "Cut selected clips"],
  ["⌘/Ctrl + V", "Paste clips at playhead"],
  ["⌘/Ctrl + D", "Duplicate selected clips"],
  ["⌘ + = / - / 0", "Timeline zoom in / out / fit"],
  ["Esc", "Close menus or shortcut help"],
];

export function mountHelpHint(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("mountHelpHint(container) requires a container element");
  }

  installStyles();
  container[MOUNT_KEY]?.destroy();

  const host = container.querySelector(".menu-group:last-of-type") ?? container;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "help-hint-badge";
  button.textContent = "? for help";
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");

  const backdrop = document.createElement("div");
  backdrop.className = "help-hint-backdrop";
  backdrop.hidden = true;

  const modal = document.createElement("div");
  modal.className = "help-hint-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Keyboard shortcuts");

  const header = document.createElement("div");
  header.className = "help-hint-header";

  const heading = document.createElement("div");
  heading.className = "help-hint-heading";

  const title = document.createElement("strong");
  title.textContent = "Keyboard shortcuts";

  const subtitle = document.createElement("span");
  subtitle.textContent = "Core editing and transport controls";

  heading.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "help-hint-close";
  closeButton.setAttribute("aria-label", "Close shortcut help");
  closeButton.textContent = "Close";

  header.append(heading, closeButton);

  const list = document.createElement("div");
  list.className = "help-hint-list";

  for (const [shortcut, description] of SHORTCUTS) {
    const row = document.createElement("div");
    row.className = "help-hint-row";

    const key = document.createElement("kbd");
    key.textContent = shortcut;

    const detail = document.createElement("span");
    detail.textContent = description;

    row.append(key, detail);
    list.append(row);
  }

  modal.append(header, list);
  backdrop.append(modal);
  document.body.append(backdrop);
  host.append(button);

  let open = false;

  const show = () => {
    open = true;
    button.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
  };

  const hide = () => {
    open = false;
    button.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  };

  const toggle = () => {
    if (open) {
      hide();
    } else {
      show();
    }
  };

  const onButtonClick = (event) => {
    event.preventDefault();
    toggle();
  };

  const onBackdropClick = (event) => {
    if (event.target === backdrop) {
      hide();
    }
  };

  const onKeyDown = (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      hide();
      return;
    }

    if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "?") {
      event.preventDefault();
      toggle();
    }
  };

  button.addEventListener("click", onButtonClick);
  closeButton.addEventListener("click", hide);
  backdrop.addEventListener("click", onBackdropClick);
  window.addEventListener("keydown", onKeyDown);

  const destroy = () => {
    button.removeEventListener("click", onButtonClick);
    closeButton.removeEventListener("click", hide);
    backdrop.removeEventListener("click", onBackdropClick);
    window.removeEventListener("keydown", onKeyDown);
    button.remove();
    backdrop.remove();
    delete container[MOUNT_KEY];
  };

  container[MOUNT_KEY] = { destroy };
  return { destroy };
}

function isEditableTarget(target) {
  return target instanceof HTMLElement
    && (
      target.isContentEditable
      || target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
    );
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .help-hint-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 24px;
      padding: 0 10px;
      border: 1px solid rgba(125, 211, 252, 0.24);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(16, 27, 40, 0.96), rgba(11, 18, 30, 0.96));
      color: #d9f1ff;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      box-shadow: 0 10px 22px rgba(2, 8, 23, 0.24);
    }

    .help-hint-badge:hover {
      border-color: rgba(125, 211, 252, 0.46);
      color: #f8fcff;
    }

    .help-hint-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      display: grid;
      place-items: center;
      padding: 32px;
      background: rgba(3, 6, 14, 0.62);
      backdrop-filter: blur(8px);
    }

    .help-hint-modal {
      width: min(560px, calc(100vw - 48px));
      max-height: min(80vh, 720px);
      overflow: auto;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 22px;
      background:
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 34%),
        linear-gradient(180deg, rgba(18, 18, 28, 0.98), rgba(10, 10, 18, 0.98));
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.48);
    }

    .help-hint-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .help-hint-heading {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .help-hint-heading strong {
      font-size: 18px;
      letter-spacing: 0.03em;
    }

    .help-hint-heading span {
      color: rgba(230, 230, 240, 0.68);
    }

    .help-hint-close {
      min-width: 78px;
      height: 32px;
      padding: 0 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      color: #edf6ff;
      font: inherit;
      cursor: pointer;
    }

    .help-hint-list {
      display: grid;
      gap: 10px;
      padding: 18px 22px 22px;
    }

    .help-hint-row {
      display: grid;
      grid-template-columns: minmax(148px, 184px) 1fr;
      align-items: center;
      gap: 14px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
    }

    .help-hint-row kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 6px 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      background: rgba(11, 18, 30, 0.92);
      color: #dbeafe;
      font: 12px/1.2 "SFMono-Regular", Menlo, Consolas, monospace;
      white-space: nowrap;
    }

    .help-hint-row span {
      color: rgba(230, 230, 240, 0.84);
    }

    @media (max-width: 680px) {
      .help-hint-row {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);
}
