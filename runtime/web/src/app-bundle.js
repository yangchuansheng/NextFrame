(function() {
var state = {
  scriptUrl: "",
  legacyPromise: null,
  modulesPromise: null,
  engineModule: null,
  sceneRegistry: null,
  previewHost: null,
  previewStage: null,
  previewCanvas: null,
  overlayEl: null,
  engine: null,
  timeline: null,
  currentTime: 0,
  scale: 1,
  selectedEl: null,
  selection: null,
  elementOffsets: Object.create(null),
  dragging: null,
  ignoreClick: false,
};

function finiteNumber(value, fallback) {
  var next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function setText(id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.textContent = value == null ? "" : String(value);
  }
}

function setSceneChip(type) {
  var target = String(type || "").toLowerCase();
  Array.prototype.forEach.call(document.querySelectorAll(".scene-chip"), function(chip) {
    chip.classList.toggle("active", chip.textContent.toLowerCase() === target);
  });
}

function getScriptUrl() {
  if (state.scriptUrl) {
    return state.scriptUrl;
  }
  var current = document.currentScript;
  state.scriptUrl = current && current.src
    ? current.src
    : new URL("./src/app-bundle.js", window.location.href).href;
  return state.scriptUrl;
}

function loadLegacyBundle() {
  if (state.legacyPromise) {
    return state.legacyPromise;
  }
  state.legacyPromise = new Promise(function(resolve, reject) {
    var script = document.createElement("script");
    script.src = new URL("./_archive-v01/app-bundle.js", getScriptUrl()).href;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  }).then(function() {
    notifyLegacyEngineReady();
  }).catch(function(error) {
    console.error("[preview] failed to load legacy app bundle", error);
  });
  return state.legacyPromise;
}

function ensurePreviewDom() {
  if (!state.previewHost) {
    state.previewHost = document.getElementById("render-stage");
  }
  if (!state.previewHost) {
    return null;
  }

  state.previewHost.style.position = "absolute";
  state.previewHost.style.inset = "0";
  state.previewHost.style.overflow = "hidden";

  if (!state.previewCanvas) {
    state.previewCanvas = document.getElementById("render-canvas");
    if (!state.previewCanvas) {
      state.previewCanvas = document.createElement("canvas");
      state.previewCanvas.id = "render-canvas";
      state.previewCanvas.width = 1920;
      state.previewCanvas.height = 1080;
      state.previewCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;z-index:0";
      state.previewHost.appendChild(state.previewCanvas);
    }
  }

  if (!state.previewStage) {
    state.previewStage = document.createElement("div");
    state.previewStage.id = "preview-stage";
    state.previewStage.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0;z-index:1";
    state.previewHost.appendChild(state.previewStage);
  }

  if (!state.overlayEl) {
    state.overlayEl = document.createElement("div");
    state.overlayEl.className = "nf-selection-overlay";
    state.overlayEl.hidden = true;
    state.overlayEl.innerHTML =
      '<div class="nf-handle nf-handle-tl"></div>' +
      '<div class="nf-handle nf-handle-tr"></div>' +
      '<div class="nf-handle nf-handle-bl"></div>' +
      '<div class="nf-handle nf-handle-br"></div>';
    state.previewHost.appendChild(state.overlayEl);
  }

  initInteraction(state.previewHost);
  return state.previewHost;
}

function ensureModules() {
  if (state.modulesPromise) {
    return state.modulesPromise;
  }
  state.modulesPromise = Promise.all([
    import(new URL("./engine-v2.js", getScriptUrl()).href),
    import(new URL("./scenes-v2/index.js", getScriptUrl()).href),
  ]).then(function(results) {
    state.engineModule = results[0];
    state.sceneRegistry = results[1].default || results[1].SCENE_REGISTRY || results[1];
    window.__renderEngine.scenes = { size: Object.keys(state.sceneRegistry || {}).length };
    notifyLegacyEngineReady();
    if (state.timeline) {
      renderPreview(state.timeline, state.currentTime);
    }
  }).catch(function(error) {
    console.error("[preview] failed to load engine-v2 modules", error);
  });
  return state.modulesPromise;
}

function notifyLegacyEngineReady() {
  if (typeof window.__onEngineReady === "function") {
    try {
      window.__onEngineReady();
    } catch (error) {
      console.error("[preview] __onEngineReady failed", error);
    }
  }
}

function installRenderEngine() {
  window.__renderEngine = {
    ready: true,
    scenes: { size: 0 },
    renderAt: function(_ctx, timeline, t) {
      state.timeline = timeline || state.timeline;
      state.currentTime = Math.max(0, finiteNumber(t, 0));
      ensurePreviewDom();
      ensureModules();
      if (!state.timeline || !state.engineModule || !state.sceneRegistry) {
        return;
      }
      renderPreview(state.timeline, state.currentTime);
    },
  };
}

function destroyEngine() {
  if (state.engine) {
    try {
      state.engine.destroy();
    } catch (_) {}
  }
  state.engine = null;
}

function ensureEngine(timeline) {
  if (!state.previewStage || !state.engineModule || !state.sceneRegistry || !timeline) {
    return null;
  }
  if (!state.engine || state.engine.__timeline !== timeline) {
    destroyEngine();
    state.previewStage.innerHTML = "";
    state.engine = state.engineModule.createEngine(state.previewStage, timeline, state.sceneRegistry);
    state.engine.__timeline = timeline;
  }
  syncStageScale();
  syncLayerMetadata();
  return state.engine;
}

function syncStageScale() {
  if (!state.previewHost || !state.previewStage || !state.timeline) {
    return;
  }
  var width = finiteNumber(state.timeline.width, 1920);
  var height = finiteNumber(state.timeline.height, 1080);
  var hostWidth = Math.max(1, state.previewHost.clientWidth);
  var hostHeight = Math.max(1, state.previewHost.clientHeight);
  state.scale = Math.min(hostWidth / width, hostHeight / height);
  var left = Math.max(0, (hostWidth - width * state.scale) / 2);
  var top = Math.max(0, (hostHeight - height * state.scale) / 2);
  state.previewStage.style.left = left + "px";
  state.previewStage.style.top = top + "px";
  state.previewStage.style.transform = "scale(" + state.scale + ")";
}

function syncLayerMetadata() {
  if (!state.previewStage || !state.timeline || !Array.isArray(state.timeline.layers)) {
    return;
  }
  Array.prototype.forEach.call(state.previewStage.querySelectorAll(".nf-layer"), function(layerEl, index) {
    var layer = state.timeline.layers[index];
    if (!layer) {
      return;
    }
    layerEl.dataset.layerId = layer.id || "";
    layerEl.dataset.scene = layer.scene || "";
    layerEl.style.pointerEvents = layerEl.style.display === "none" ? "none" : "auto";
  });
}

function renderPreview(timeline, time) {
  state.timeline = timeline;
  state.currentTime = Math.max(0, finiteNumber(time, 0));
  ensurePreviewDom();
  var engine = ensureEngine(timeline);
  if (!engine) {
    return;
  }
  engine.renderFrame(state.currentTime);
  markSelectableElements();
  reapplyOffsets();
  reconcileSelection();
}

function markSelectableElements() {
  if (!state.previewStage) {
    return;
  }
  Array.prototype.forEach.call(state.previewStage.querySelectorAll(".nf-layer"), function(layerEl) {
    var sceneRoot = layerEl.firstElementChild;
    var candidates = [];
    if (sceneRoot && sceneRoot.children.length) {
      sceneRoot.style.pointerEvents = "none";
      candidates = sceneRoot.querySelectorAll("*");
    } else if (sceneRoot) {
      sceneRoot.style.pointerEvents = "auto";
      candidates = [sceneRoot];
    }
    Array.prototype.forEach.call(candidates, function(el) {
      el.setAttribute("data-nf-selectable", "true");
      if (!el.style.pointerEvents || el.style.pointerEvents === "none") {
        el.style.pointerEvents = "auto";
      }
      if (el !== state.selectedEl) {
        el.style.cursor = "pointer";
      }
    });
  });
}

function getLayerById(layerId) {
  if (!state.timeline || !Array.isArray(state.timeline.layers)) {
    return null;
  }
  for (var i = 0; i < state.timeline.layers.length; i += 1) {
    if (state.timeline.layers[i] && state.timeline.layers[i].id === layerId) {
      return state.timeline.layers[i];
    }
  }
  return null;
}

function describeElement(el) {
  var text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (text.length > 60) {
    text = text.slice(0, 57) + "...";
  }
  return {
    tagName: el.tagName,
    className: el.className || "",
    text: text,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(char) {
    return ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char];
  });
}

function renderParamsEditor(layer, el, sceneType) {
  var paramsEl = document.getElementById("insp-params");
  if (!paramsEl) {
    return;
  }
  var existingEditor = document.getElementById("nf-param-editor");
  if (existingEditor && document.activeElement === existingEditor && paramsEl.dataset.layerId === (layer.id || "")) {
    return;
  }

  var info = describeElement(el);
  paramsEl.dataset.layerId = layer.id || "";
  paramsEl.innerHTML =
    '<div class="nf-param-meta">' +
      "<strong>Element</strong>: " + escapeHtml(info.tagName + (info.className ? " ." + info.className.split(/\s+/).join(".") : "")) + "<br>" +
      "<strong>Size</strong>: " + escapeHtml(info.width + "x" + info.height) + "<br>" +
      "<strong>Text</strong>: " + escapeHtml(info.text || "--") + "<br>" +
      "<strong>Scene Type</strong>: " + escapeHtml(sceneType || "--") +
    "</div>" +
    '<label class="nf-param-label" for="nf-param-editor">Params JSON</label>' +
    '<textarea id="nf-param-editor" class="nf-param-editor" spellcheck="false"></textarea>' +
    '<div class="nf-param-status" id="nf-param-status">Editing valid JSON updates the DOM instantly.</div>';

  var editor = document.getElementById("nf-param-editor");
  if (!editor) {
    return;
  }
  editor.value = JSON.stringify(layer.params || {}, null, 2);
  editor.oninput = function() {
    var status = document.getElementById("nf-param-status");
    try {
      layer.params = JSON.parse(editor.value || "{}");
      if (status) {
        status.textContent = "Preview updated.";
        status.classList.remove("invalid");
      }
      rerenderCurrentFrame();
    } catch (error) {
      if (status) {
        status.textContent = error.message;
        status.classList.add("invalid");
      }
    }
  };
}

function updateInspectorFromElement(el) {
  var layerEl = el && el.closest(".nf-layer");
  var layerId = layerEl ? layerEl.dataset.layerId : "--";
  var layer = layerId && layerId !== "--" ? getLayerById(layerId) : null;
  var sceneId = layer ? layer.scene : (layerEl ? layerEl.dataset.scene : "--");
  var sceneDef = sceneId && state.sceneRegistry ? state.sceneRegistry[sceneId] : null;
  var sceneType = sceneDef && sceneDef.type ? sceneDef.type : "--";

  setText("insp-scene-name", sceneId || "--");
  setText("insp-clip-id", layerId || "--");
  setText("insp-scene-readout", sceneId || "--");
  setText("insp-clip-readout", layerId || "--");
  setText("insp-start", layer ? formatTime(layer.start) : "00:00.000");
  setText("insp-duration", layer ? formatDuration(layer.dur) : "0.000s");
  setSceneChip(sceneType);

  if (layer) {
    renderParamsEditor(layer, el, sceneType);
  }
}

function formatTime(seconds) {
  var safe = Math.max(0, finiteNumber(seconds, 0));
  var minutes = Math.floor(safe / 60);
  var remainder = safe - minutes * 60;
  var wholeSeconds = Math.floor(remainder);
  var millis = Math.round((remainder - wholeSeconds) * 1000);
  if (millis === 1000) {
    wholeSeconds += 1;
    millis = 0;
  }
  if (wholeSeconds === 60) {
    minutes += 1;
    wholeSeconds = 0;
  }
  return String(minutes).padStart(2, "0") + ":" + String(wholeSeconds).padStart(2, "0") + "." + String(millis).padStart(3, "0");
}

function formatDuration(seconds) {
  return Math.max(0, finiteNumber(seconds, 0)).toFixed(3) + "s";
}

function elementPath(el, layerEl) {
  var path = [];
  var node = el;
  while (node && layerEl && node !== layerEl) {
    var parent = node.parentElement;
    if (!parent) {
      break;
    }
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
    node = parent;
  }
  return path.join(".");
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }
  return String(value).replace(/"/g, '\\"');
}

function resolveElement(selection) {
  if (!selection || !state.previewStage) {
    return null;
  }
  var layerEl = state.previewStage.querySelector('.nf-layer[data-layer-id="' + cssEscape(selection.layerId) + '"]');
  if (!layerEl) {
    return null;
  }
  if (!selection.path) {
    return layerEl;
  }
  var node = layerEl;
  var parts = selection.path.split(".");
  for (var i = 0; i < parts.length; i += 1) {
    var index = finiteNumber(parts[i], -1);
    if (index < 0 || !node.children[index]) {
      return null;
    }
    node = node.children[index];
  }
  return node;
}

function selectionKey(selection) {
  return selection.layerId + ":" + selection.path;
}

function clearSelectedClass() {
  if (state.selectedEl) {
    state.selectedEl.classList.remove("nf-selected");
    state.selectedEl.style.cursor = "pointer";
  }
  state.selectedEl = null;
}

function selectElement(el) {
  var layerEl = el && el.closest(".nf-layer");
  if (!layerEl) {
    return;
  }
  clearSelectedClass();
  state.selection = {
    layerId: layerEl.dataset.layerId || "",
    path: elementPath(el, layerEl),
  };
  state.selectedEl = el;
  el.classList.add("nf-selected");
  el.style.cursor = "move";
  updateSelectionOverlay();
  updateInspectorFromElement(el);
}

function reconcileSelection() {
  clearSelectedClass();
  if (!state.selection) {
    hideSelectionOverlay();
    return;
  }
  var nextEl = resolveElement(state.selection);
  if (!nextEl || !nextEl.isConnected || nextEl.offsetParent == null) {
    hideSelectionOverlay();
    return;
  }
  state.selectedEl = nextEl;
  nextEl.classList.add("nf-selected");
  nextEl.style.cursor = "move";
  updateSelectionOverlay();
  updateInspectorFromElement(nextEl);
}

function hideSelectionOverlay() {
  if (state.overlayEl) {
    state.overlayEl.hidden = true;
  }
}

function updateSelectionOverlay() {
  if (!state.selectedEl || !state.overlayEl || !state.previewHost) {
    hideSelectionOverlay();
    return;
  }
  var rect = state.selectedEl.getBoundingClientRect();
  var hostRect = state.previewHost.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    hideSelectionOverlay();
    return;
  }
  state.overlayEl.hidden = false;
  state.overlayEl.style.left = rect.left - hostRect.left + "px";
  state.overlayEl.style.top = rect.top - hostRect.top + "px";
  state.overlayEl.style.width = rect.width + "px";
  state.overlayEl.style.height = rect.height + "px";
}

function getOffset(key) {
  if (!state.elementOffsets[key]) {
    state.elementOffsets[key] = { x: 0, y: 0 };
  }
  return state.elementOffsets[key];
}

function applyOffset(el, key) {
  var offset = state.elementOffsets[key];
  if (!offset) {
    return;
  }
  if (!el.dataset.nfBaseTransformSet) {
    el.dataset.nfBaseTransformSet = "true";
    el.dataset.nfBaseTransform = el.style.transform || "";
  }
  var parts = [];
  if (el.dataset.nfBaseTransform) {
    parts.push(el.dataset.nfBaseTransform);
  }
  parts.push("translate(" + offset.x + "px, " + offset.y + "px)");
  el.style.transform = parts.join(" ").trim();
}

function reapplyOffsets() {
  if (!state.previewStage) {
    return;
  }
  Object.keys(state.elementOffsets).forEach(function(key) {
    var split = key.indexOf(":");
    var selection = {
      layerId: key.slice(0, split),
      path: key.slice(split + 1),
    };
    var el = resolveElement(selection);
    if (el) {
      applyOffset(el, key);
    }
  });
}

function rerenderCurrentFrame() {
  if (state.timeline) {
    renderPreview(state.timeline, state.currentTime);
  }
}

function initInteraction(stageEl) {
  if (!stageEl || stageEl.__nfInteractionReady) {
    return;
  }
  stageEl.__nfInteractionReady = true;

  stageEl.addEventListener("click", function(event) {
    if (state.ignoreClick) {
      state.ignoreClick = false;
      return;
    }
    var target = event.target.closest("[data-nf-selectable]");
    if (!target || !state.previewStage || !state.previewStage.contains(target)) {
      return;
    }
    selectElement(target);
  });

  stageEl.addEventListener("mousedown", function(event) {
    if (event.button !== 0 || event.target.classList.contains("nf-handle")) {
      return;
    }
    var target = event.target.closest(".nf-selected");
    if (!target || !state.previewStage || !state.previewStage.contains(target)) {
      return;
    }
    var key = selectionKey(state.selection);
    var offset = getOffset(key);
    state.dragging = {
      key: key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: offset.x,
      startY: offset.y,
    };
    event.preventDefault();
  });

  document.addEventListener("mousemove", function(event) {
    if (!state.dragging || !state.selectedEl) {
      return;
    }
    var dx = (event.clientX - state.dragging.startClientX) / Math.max(state.scale, 0.001);
    var dy = (event.clientY - state.dragging.startClientY) / Math.max(state.scale, 0.001);
    var offset = getOffset(state.dragging.key);
    offset.x = Math.round((state.dragging.startX + dx) * 100) / 100;
    offset.y = Math.round((state.dragging.startY + dy) * 100) / 100;
    applyOffset(state.selectedEl, state.dragging.key);
    updateSelectionOverlay();
    state.ignoreClick = true;
  });

  document.addEventListener("mouseup", function() {
    state.dragging = null;
  });
}

window.addEventListener("resize", function() {
  syncStageScale();
  updateSelectionOverlay();
});

Object.assign(window, {
  initInteraction: initInteraction,
  selectElement: selectElement,
  updateInspectorFromElement: updateInspectorFromElement,
});

installRenderEngine();
ensurePreviewDom();
ensureModules();
loadLegacyBundle();
})();
