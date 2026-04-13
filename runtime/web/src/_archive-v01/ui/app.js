import {
  closeAllDropdowns,
  initBreadcrumbs,
  showOverlay,
  toggleBcDrop,
} from "./breadcrumbs.js";
import { initCustomSelect, pickOpt, toggleCustomSelect } from "./custom-select.js";
import {
  closePlayer,
  openPlayer,
  seekPlayer,
  toggleExports,
  togglePlayerPlay,
} from "./exports-panel.js";
import { toggleSettings } from "./settings-panel.js";
import { initTimeline, selectClip, syncSlider, togglePlay } from "./timeline.js";
import { initCanvasDrag, startDrag } from "../editor/canvas-drag.js";
import { toggleFullscreen } from "../editor/fullscreen.js";

export { closeAllDropdowns, showOverlay };

export function switchView(id) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  const target = document.getElementById(id);
  target.classList.add("active");
  target.classList.add("view-transition-enter");
  target.querySelectorAll(".stagger-in").forEach((element) => {
    element.style.animation = "none";
    element.offsetHeight;
    element.style.animation = "";
  });
  setTimeout(() => target.classList.remove("view-transition-enter"), 500);
  closeAllDropdowns();
}

export function goHome() {
  switchView("view-home");
}

export function goProject() {
  switchView("view-project");
}

export function goEditor() {
  switchView("view-editor");
}

function handleKeydown(event) {
  if (event.code === "Space" && !event.target.matches("input,textarea")) {
    event.preventDefault();
    togglePlay();
  }

  if (event.key === "Escape") {
    closeAllDropdowns();
    const editorView = document.getElementById("view-editor");
    if (editorView.classList.contains("fullscreen")) {
      toggleFullscreen();
    }
  }
}

export function initApp() {
  initBreadcrumbs();
  initCustomSelect();
  initCanvasDrag();
  initTimeline();
  document.addEventListener("keydown", handleKeydown);
}

Object.assign(window, {
  closePlayer,
  goEditor,
  goHome,
  goProject,
  openPlayer,
  pickOpt,
  seekPlayer,
  selectClip,
  showOverlay,
  startDrag,
  switchView,
  syncSlider,
  toggleBcDrop,
  toggleCustomSelect,
  toggleExports,
  toggleFullscreen,
  togglePlay,
  togglePlayerPlay,
  toggleSettings,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, { once: true });
} else {
  initApp();
}
