// Fullscreen toggle for the editor view with preview stage refitting after layout changes.
function toggleFullscreen() {
  document.getElementById("view-editor").classList.toggle("fullscreen");
  requestAnimationFrame(fitStageToContainer);
}
