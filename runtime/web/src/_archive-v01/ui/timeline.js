const TOTAL_DURATION = 26;
const PX_PER_SEC = 61.33;

let isPlaying = false;
let currentTime = 2.4;
let playRAF = null;
let lastTS = null;

function formatTC(seconds) {
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  return String(minutes).padStart(2, "0") + ":" + String(wholeSeconds).padStart(2, "0");
}

function playLoop(timestamp) {
  if (!lastTS) {
    lastTS = timestamp;
  }

  const delta = (timestamp - lastTS) / 1000;
  lastTS = timestamp;
  currentTime += delta;

  if (currentTime >= TOTAL_DURATION) {
    currentTime = 0;
  }

  setPlayheadTime(currentTime);
  if (isPlaying) {
    playRAF = requestAnimationFrame(playLoop);
  }
}

function generateAudioBars() {
  const container = document.getElementById("audio-bars");
  const count = 200;
  for (let index = 0; index < count; index += 1) {
    const bar = document.createElement("div");
    bar.className = "tl-audio-bar";
    const height = Math.random() * 24 + 4;
    bar.style.height = height + "px";
    container.appendChild(bar);
  }
}

export function selectClip(element) {
  document
    .querySelectorAll(".tl-clip")
    .forEach((clip) => clip.classList.remove("selected"));
  element.classList.add("selected");

  const { name, type, id } = element.dataset;
  const start = parseFloat(element.dataset.start);

  document.getElementById("insp-scene-name").textContent = name;
  document.getElementById("insp-clip-id").textContent = id;
  document.getElementById("canvas-title").textContent = type;
  document.getElementById("canvas-sub").textContent =
    "scene:" + name.toLowerCase().replace(/\s+/g, "-") + " · " + formatTC(start);
  document.getElementById("badge-type").textContent = type;
  document.getElementById("badge-id").textContent = id;

  setPlayheadTime(start);

  document
    .querySelectorAll(".scene-chip")
    .forEach((chip) => chip.classList.remove("active"));
  const chipText = type.toLowerCase();
  document.querySelectorAll(".scene-chip").forEach((chip) => {
    if (chip.textContent.toLowerCase() === chipText) {
      chip.classList.add("active");
    }
  });
}

export function setPlayheadTime(time) {
  currentTime = time;
  const px = time * PX_PER_SEC;
  document.getElementById("tl-playhead").style.left = px + "px";
  document.getElementById("tc-current").textContent = formatTC(time);
  document.getElementById("tc-fs-current").textContent = formatTC(time);
  document.getElementById("progress-fill").style.width =
    (time / TOTAL_DURATION) * 100 + "%";
}

export function togglePlay() {
  isPlaying = !isPlaying;
  const icon = isPlaying ? "\u23F8" : "\u25B6";
  document.getElementById("btn-play").innerHTML = icon;
  document.getElementById("btn-play-fs").innerHTML = icon;

  if (isPlaying) {
    lastTS = null;
    playRAF = requestAnimationFrame(playLoop);
  } else {
    cancelAnimationFrame(playRAF);
  }
}

export function syncSlider(name) {
  const slider = document.getElementById("slider-" + name);
  const value = document.getElementById("val-" + name);
  const nextValue = parseFloat(slider.value);
  if (name === "opacity") {
    value.textContent = nextValue + "%";
  } else if (name === "scale") {
    value.textContent = (nextValue / 100).toFixed(2);
  } else if (name === "blur") {
    value.textContent = nextValue + "px";
  }
}

export function initTimeline() {
  generateAudioBars();
  setPlayheadTime(2.4);
}
