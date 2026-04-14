// Settings panel toggle helper for showing and hiding the settings overlay.
function toggleSettings() {
  document.getElementById("exports-overlay").classList.remove("show");
  document.getElementById("exports-panel").classList.remove("show");
  document.getElementById("settings-overlay").classList.toggle("show");
  document.getElementById("settings-panel").classList.toggle("show");
}
