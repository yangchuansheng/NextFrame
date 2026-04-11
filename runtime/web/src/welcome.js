const STYLE_ID = "nextframe-welcome-style";
const OVERLAY_KEY = Symbol("nextframe.welcome.overlay");

export function showWelcome(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("showWelcome(container) requires a container element");
  }

  installStyles();
  container[OVERLAY_KEY]?.destroy();

  const previousPosition = container.style.position;
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  const overlay = document.createElement("div");
  overlay.className = "nextframe-welcome";
  overlay.setAttribute("aria-hidden", "true");

  const title = document.createElement("strong");
  title.className = "nextframe-welcome__title";
  title.textContent = "NextFrame v0.1";

  const subtitle = document.createElement("p");
  subtitle.className = "nextframe-welcome__subtitle";
  subtitle.textContent = "AI-native video editor";

  const hints = document.createElement("div");
  hints.className = "nextframe-welcome__hints";

  for (const label of ["⎵ Play/Pause", "B Blade tool", "⌘S Save"]) {
    const chip = document.createElement("span");
    chip.className = "nextframe-welcome__hint";
    chip.textContent = label;
    hints.append(chip);
  }

  overlay.append(title, subtitle, hints);
  container.append(overlay);

  const fadeTimer = window.setTimeout(() => {
    overlay.classList.add("is-fading");
  }, 2000);

  const removeTimer = window.setTimeout(() => {
    destroy();
  }, 2600);

  function destroy() {
    window.clearTimeout(fadeTimer);
    window.clearTimeout(removeTimer);

    if (container[OVERLAY_KEY]?.overlay === overlay) {
      delete container[OVERLAY_KEY];
    }

    if (overlay.isConnected) {
      overlay.remove();
    }

    if (getComputedStyle(container).position === "relative" && previousPosition === "") {
      container.style.removeProperty("position");
    } else if (container.style.position !== previousPosition) {
      container.style.position = previousPosition;
    }
  }

  container[OVERLAY_KEY] = { overlay, destroy };
  return { destroy };
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .nextframe-welcome {
      position: absolute;
      inset: 0;
      z-index: 40;
      display: grid;
      place-items: center;
      padding: 32px;
      background: rgba(11, 11, 20, 0.94);
      color: #f4f6ff;
      text-align: center;
      pointer-events: none;
      opacity: 1;
      transition: opacity 600ms ease;
    }

    .nextframe-welcome.is-fading {
      opacity: 0;
    }

    .nextframe-welcome__title {
      display: block;
      font-size: clamp(24px, 2.8vw, 40px);
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .nextframe-welcome__subtitle {
      margin: 10px 0 0;
      color: rgba(230, 230, 240, 0.78);
      font-size: clamp(14px, 1.4vw, 18px);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .nextframe-welcome__hints {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      margin-top: 22px;
    }

    .nextframe-welcome__hint {
      padding: 10px 14px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
      color: rgba(244, 246, 255, 0.94);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }
  `;
  document.head.append(style);
}
