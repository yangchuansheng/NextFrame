let overlay = null;

function getOverlay() {
  overlay ??= document.getElementById("overlay");
  return overlay;
}

export function showOverlay() {
  getOverlay()?.classList.add("show");
}

export function closeAllDropdowns() {
  document
    .querySelectorAll(".cmd-dropdown, .bc-dropdown")
    .forEach((dropdown) => dropdown.classList.remove("show"));
  getOverlay()?.classList.remove("show");
}

export function toggleBcDrop(id, event) {
  event.stopPropagation();
  closeAllDropdowns();
  const dropdown = document.getElementById(id);
  dropdown.classList.toggle("show");
  if (dropdown.classList.contains("show")) {
    showOverlay();
  }
}

export function initBreadcrumbs() {
  getOverlay()?.addEventListener("click", closeAllDropdowns);
}
