let playerPlaying = false;
let playerAnim = null;
let playerStart = 0;
let playerDur = 26;

function formatTC(seconds) {
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return String(minutes).padStart(2, "0") + ":" + String(wholeSeconds).padStart(2, "0");
}

function animatePlayer() {
  if (!playerPlaying) {
    return;
  }

  const elapsed = (performance.now() - playerStart) / 1000;
  const pct = Math.min(100, (elapsed / playerDur) * 100);
  document.getElementById("player-progress-fill").style.width = pct + "%";
  document.getElementById("player-tc").textContent =
    formatTC(elapsed) + " / " + formatTC(playerDur);

  if (pct >= 100) {
    playerPlaying = false;
    document.getElementById("player-big-play").classList.remove("playing");
    document.getElementById("player-play-btn").innerHTML = "&#9654;";
    return;
  }

  playerAnim = requestAnimationFrame(animatePlayer);
}

export function toggleExports() {
  document.getElementById("settings-overlay").classList.remove("show");
  document.getElementById("settings-panel").classList.remove("show");
  document.getElementById("exports-overlay").classList.toggle("show");
  document.getElementById("exports-panel").classList.toggle("show");
}

export function openPlayer(name, dur, size, detail) {
  document.getElementById("exports-overlay").classList.remove("show");
  document.getElementById("exports-panel").classList.remove("show");
  document.getElementById("player-title").textContent = name;
  document.getElementById("player-detail").textContent = detail;
  playerDur = parseFloat(dur) || 26;
  document.getElementById("player-tc").textContent = "00:00 / " + formatTC(playerDur);
  document.getElementById("player-progress-fill").style.width = "0%";
  document.getElementById("player-big-play").classList.remove("playing");
  playerPlaying = false;
  document.getElementById("player-overlay").classList.add("show");
  document.getElementById("player-modal").classList.add("show");
}

export function closePlayer() {
  playerPlaying = false;
  if (playerAnim) {
    cancelAnimationFrame(playerAnim);
  }
  document.getElementById("player-overlay").classList.remove("show");
  document.getElementById("player-modal").classList.remove("show");
}

export function togglePlayerPlay() {
  playerPlaying = !playerPlaying;
  const bigPlay = document.getElementById("player-big-play");
  const button = document.getElementById("player-play-btn");
  if (playerPlaying) {
    bigPlay.classList.add("playing");
    button.innerHTML = "&#10074;&#10074;";
    playerStart = performance.now();
    animatePlayer();
  } else {
    bigPlay.classList.remove("playing");
    button.innerHTML = "&#9654;";
    if (playerAnim) {
      cancelAnimationFrame(playerAnim);
    }
  }
}

export function seekPlayer(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const pct = (event.clientX - rect.left) / rect.width;
  document.getElementById("player-progress-fill").style.width = pct * 100 + "%";
  playerStart = performance.now() - pct * playerDur * 1000;
}
