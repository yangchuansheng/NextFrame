const CATEGORY_COLORS = {
  Backgrounds: "#3b82f6",
  Typography: "#a855f7",
  "Shapes & Layout": "#06b6d4",
  "Data Viz": "#22c55e",
  Overlays: "#ec4899",
  Default: "#6366f1",
};

const ASSET_COLORS = {
  video: ["#2563eb", "#0f172a"],
  image: ["#7c3aed", "#1f2937"],
  audio: ["#0f766e", "#0f172a"],
  default: ["#475569", "#0f172a"],
};

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

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function createCardShell(title, hint, meta) {
  const card = document.createElement("article");
  card.className = "asset-card";

  const content = document.createElement("div");
  content.className = "asset-meta";

  const name = document.createElement("div");
  name.className = "asset-name";

  const titleElement = document.createElement("strong");
  titleElement.textContent = title;

  const hintElement = document.createElement("span");
  hintElement.textContent = hint;

  const metaElement = document.createElement("div");
  metaElement.className = "asset-length";
  metaElement.textContent = meta;

  name.append(titleElement, hintElement);
  content.append(name, metaElement);
  card.append(content);
  return card;
}

export function createSceneCard(scene) {
  const accent = CATEGORY_COLORS[scene.category] || CATEGORY_COLORS.Default;
  const card = createCardShell(
    scene.name,
    `${scene.category} • ${scene.duration_hint || "Custom duration"}`,
    scene.id,
  );

  card.classList.add("scene-card");
  card.draggable = true;

  const thumb = document.createElement("div");
  thumb.className = "asset-thumb library-scene-thumb";
  thumb.style.setProperty("--thumb-a", accent);
  thumb.style.setProperty("--thumb-b", hexToRgba(accent, 0.18));
  thumb.style.setProperty("--thumb-glow", hexToRgba(accent, 0.28));

  const badge = document.createElement("div");
  badge.className = "library-scene-badge";
  badge.textContent = scene.category.slice(0, 1).toUpperCase();
  thumb.appendChild(badge);

  card.prepend(thumb);
  card.addEventListener("dragstart", (event) => {
    event.dataTransfer?.setData("application/json", JSON.stringify({ type: "scene", id: scene.id }));
    event.dataTransfer?.setData("text/plain", scene.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
    }
  });

  return card;
}

export function createAssetCard(asset) {
  const [primary, secondary] = ASSET_COLORS[asset.kind] || ASSET_COLORS.default;
  const name = asset.name || asset.label || asset.id || "Untitled asset";
  const hint = asset.path || asset.description || asset.kind || "asset";
  const meta = formatDuration(Number(asset.duration)) || String(asset.kind || "").toUpperCase();
  const card = createCardShell(name, hint, meta);

  const thumb = document.createElement("div");
  thumb.className = "asset-thumb";
  thumb.style.setProperty("--thumb-a", primary);
  thumb.style.setProperty("--thumb-b", secondary);

  card.prepend(thumb);
  return card;
}
