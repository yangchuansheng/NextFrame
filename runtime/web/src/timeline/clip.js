import { drawWaveform } from "../audio/waveform.js";
import { SCENE_MANIFEST } from "../scenes/index.js";
import { attachClipInteractions } from "./clip-interact.js";

const CATEGORY_COLORS = {
  Audio: "#14b8a6",
  Backgrounds: "#3b82f6",
  Typography: "#a855f7",
  Shapes: "#06b6d4",
  "Shapes & Layout": "#06b6d4",
  DataViz: "#22c55e",
  "Data Viz": "#22c55e",
  Media: "#2563eb",
  Transitions: "#f59e0b",
  Overlays: "#ec4899",
};

const SCENE_META = new Map(SCENE_MANIFEST.map((scene) => [scene.id, scene]));
const AUDIO_CLIP_ACCENT = "#14b8a6";

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const numeric = Number.parseInt(value, 16);
  const red = (numeric >> 16) & 255;
  const green = (numeric >> 8) & 255;
  const blue = numeric & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatAudioLabel(clip) {
  const params = clip?.params && typeof clip.params === "object" ? clip.params : {};
  const source = params.label || params.src || clip?.name || clip?.assetId || "";
  if (typeof source !== "string" || source.length === 0) {
    return "Audio clip";
  }

  const [lastSegment] = source.split(/[\\/]/).slice(-1);
  return lastSegment || source;
}

function renderWaveform(canvas, audioBuffer, width, height) {
  const dpr = Number(globalThis.devicePixelRatio) > 0 ? Number(globalThis.devicePixelRatio) : 1;
  const displayWidth = Math.max(1, Math.round(width));
  const displayHeight = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");

  canvas.width = Math.max(1, Math.round(displayWidth * dpr));
  canvas.height = Math.max(1, Math.round(displayHeight * dpr));
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  if (!ctx) {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, displayWidth, displayHeight);
  drawWaveform(ctx, audioBuffer, 0, 0, displayWidth, displayHeight, "rgba(229, 255, 252, 0.72)");
}

export function createClip(clip, zoom, options = {}) {
  const { trackKind = "", audioBuffer = null, store = null } = options && typeof options === "object" ? options : {};
  const scene = typeof clip.scene === "string" ? SCENE_META.get(clip.scene) : null;
  const category = clip.category || scene?.category || "";
  const labelText = trackKind === "audio"
    ? formatAudioLabel(clip)
    : clip.name || scene?.name || clip.scene || clip.assetId || "Untitled clip";
  const duration = Number(clip.duration ?? clip.dur) || 0;
  const element = document.createElement("div");
  const accent = trackKind === "audio"
    ? AUDIO_CLIP_ACCENT
    : CATEGORY_COLORS[category] || CATEGORY_COLORS.Backgrounds;
  const width = Math.max(zoom.timeToPx(duration), 44);

  element.className = "timeline-clip";
  element.dataset.clipId = clip.id || "";
  element.dataset.category = category;
  element.dataset.trackKind = trackKind;
  element.style.left = `${zoom.timeToPx(clip.start)}px`;
  element.style.width = `${width}px`;
  element.style.setProperty("--clip-accent", accent);
  element.style.setProperty("--clip-fill-start", hexToRgba(accent, 0.48));
  element.style.setProperty("--clip-fill-end", hexToRgba(accent, 0.2));
  element.title = labelText;

  if (trackKind === "audio") {
    element.classList.add("is-audio");
  }

  const preview = document.createElement("span");
  preview.className = "timeline-clip-preview";
  preview.setAttribute("aria-hidden", "true");

  const leftHandle = document.createElement("span");
  leftHandle.className = "timeline-clip-handle timeline-clip-handle-left";
  leftHandle.setAttribute("aria-hidden", "true");

  if (trackKind === "audio" && audioBuffer) {
    const waveform = document.createElement("canvas");
    waveform.className = "timeline-clip-waveform";
    renderWaveform(waveform, audioBuffer, width, 44);
    element.appendChild(waveform);
  }

  const label = document.createElement("span");
  label.className = "timeline-clip-label";
  label.textContent = labelText;

  const rightHandle = document.createElement("span");
  rightHandle.className = "timeline-clip-handle timeline-clip-handle-right";
  rightHandle.setAttribute("aria-hidden", "true");

  element.append(preview, leftHandle, label, rightHandle);
  attachClipInteractions(element, clip.id || "", store, zoom);
  return element;
}

export { CATEGORY_COLORS };
