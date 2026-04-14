// Editor timeline and preview integration for the WKWebView editor.
let edTimelineData = null;
let edActiveClip = null;
function buildEditorTimelinePath() { return window.currentEpisodePath + '/timeline.json'; }
function normalizeEditorTimeline(timeline) {
  if (!timeline || typeof timeline !== 'object') return timeline;
  if (!Array.isArray(timeline.layers)) timeline.layers = Array.isArray(timeline.clips) ? timeline.clips : [];
  if (typeof timeline.duration !== 'number') {
    timeline.duration = timeline.layers.reduce(function(maxEnd, layer) {
      return Math.max(maxEnd, (layer.start || 0) + (layer.duration || 0));
    }, 0);
  }
  return timeline;
}
function getEditorTimelineDuration() {
  if (!edTimelineData || !Array.isArray(edTimelineData.layers)) return 0;
  return edTimelineData.duration || edTimelineData.layers.reduce(function(maxEnd, layer) {
    return Math.max(maxEnd, (layer.start || 0) + (layer.duration || 0));
  }, 0);
}
function formatEditorTimecode(seconds) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return String(minutes).padStart(2, '0') + ':' + (safeSeconds - minutes * 60).toFixed(1).padStart(4, '0');
}
function updateEditorPreviewState(t, totalDuration) {
  const previewTc = document.querySelector('.ed-preview-tc');
  if (previewTc) previewTc.textContent = formatEditorTimecode(t) + ' / ' + formatEditorTimecode(totalDuration);
  const transportTc = document.querySelector('.ed-transport-tc');
  if (transportTc) transportTc.textContent = formatEditorTimecode(t);
  const progressFill = document.querySelector('.ed-transport-fill');
  if (progressFill) {
    const pct = totalDuration > 0 ? Math.max(0, Math.min(100, t / totalDuration * 100)) : 0;
    progressFill.style.width = pct.toFixed(1) + '%';
  }
}
function toggleEditorPreviewPlaceholder(isVisible) {
  document.querySelectorAll('.ed-preview-gradient, .ed-play-btn').forEach(function(el) { el.style.display = isVisible ? '' : 'none'; });
}
function ensureEditorPreviewStage() {
  const canvas = document.querySelector('.ed-preview-canvas');
  if (!canvas) return null;
  let stage = canvas.querySelector('#preview-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'preview-stage';
    stage.className = 'ed-preview';
    stage.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;z-index:1;background:#05070b;';
    canvas.appendChild(stage);
  }
  return stage;
}
function renderEditorPreviewContent(tagName, configure) {
  const stage = ensureEditorPreviewStage();
  if (!stage) return null;
  stage.innerHTML = '';
  const el = document.createElement(tagName);
  el.style.cssText = 'width:100%;height:100%;display:block;border:0;object-fit:contain;';
  configure(el);
  stage.appendChild(el);
  toggleEditorPreviewPlaceholder(false);
  window.edPreviewIframe = tagName === 'iframe' ? el : null;
  window.edPreviewMode = tagName === 'iframe' ? 'iframe' : 'frame';
  return el;
}
function clearEditorPreviewContent() {
  const stage = ensureEditorPreviewStage();
  if (stage) stage.innerHTML = '';
  window.edPreviewIframe = null;
  window.edPreviewMode = 'none';
  toggleEditorPreviewPlaceholder(true);
}
function canUseDomPreview() {
  const engine = window.previewEngine;
  return !!(window.__scenes && engine && typeof engine.setStage === 'function' &&
    typeof engine.loadTimeline === 'function' && typeof engine.compose === 'function');
}
function pushPreviewTransportState(t, isPlaying) {
  const state = { currentTime: t, duration: getEditorTimelineDuration(), isPlaying: !!isPlaying };
  if (typeof window.syncPreviewTransportState === 'function') return window.syncPreviewTransportState(state);
  updateEditorPreviewState(state.currentTime, state.duration);
}
function resolveEditorSelectionIndex(selection) {
  if (typeof selection === 'number') return selection;
  if (!selection || !edTimelineData || !Array.isArray(edTimelineData.layers)) return null;
  ['index', 'clipIndex', 'layerIndex', 'itemIndex'].some(function(key) {
    if (typeof selection[key] === 'number') { selection = selection[key]; return true; }
    return false;
  });
  if (typeof selection === 'number') return selection;
  const clipId = typeof selection === 'string' ? selection : (selection.id || selection.clipId || selection.layerId || selection.sceneId || selection.scene || '');
  if (!clipId) return null;
  const index = edTimelineData.layers.findIndex(function(layer) {
    return [layer.id, layer.clipId, layer.sceneId, layer.scene, layer.name].includes(clipId);
  });
  return index >= 0 ? index : null;
}
function syncEditorSelectionUI(index) {
  document.querySelectorAll('.ed-clip-item[data-index]').forEach(function(el) { el.classList.toggle('active', Number(el.dataset.index) === index); });
  document.querySelectorAll('.ed-tl-clip[data-index]').forEach(function(el) {
    const active = Number(el.dataset.index) === index;
    el.classList.toggle('active', active);
    el.style.boxShadow = active ? '0 0 0 1px var(--accent) inset, 0 0 0 1px rgba(167,139,250,0.24)' : '';
    el.style.filter = active ? 'brightness(1.15)' : '';
  });
}
function bindEditorPreviewSelection() {
  if (!window.previewEngine) return;
  window.previewEngine.onSelect = function(selection) {
    const index = resolveEditorSelectionIndex(selection);
    if (index !== null) edSelectClip(index);
  };
}
function parseEditorInputValue(rawValue, currentValue) {
  if (typeof currentValue === 'number') {
    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? rawValue : numericValue;
  }
  if (typeof currentValue === 'boolean') return rawValue === 'true';
  if (currentValue && typeof currentValue === 'object') {
    try { return JSON.parse(rawValue); } catch (error) { return rawValue; }
  }
  return rawValue;
}
function saveTimeline() {
  if (typeof bridgeCall !== 'function' || !window.currentEpisodePath || !edTimelineData) return Promise.resolve(null);
  return bridgeCall('timeline.save', { path: buildEditorTimelinePath(), timeline: edTimelineData });
}
function showEditorSaveBadge() {
  const insp = document.getElementById('ed-insp-inner2');
  if (!insp) return;
  let badge = document.getElementById('ed-save-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'ed-save-badge';
    badge.style.cssText = 'position:absolute;top:8px;right:8px;font-size:11px;color:var(--green);opacity:1;transition:opacity 0.5s';
    insp.style.position = 'relative';
    insp.appendChild(badge);
  }
  badge.textContent = '已保存';
  badge.style.opacity = '1';
  setTimeout(function() { badge.style.opacity = '0'; }, 2000);
}
function ensureComposePreviewButton() {
  const btnRow = document.querySelector('.ed-transport-btns');
  if (!btnRow || btnRow.querySelector('[data-nf-action="compose-preview"]')) return;
  const button = document.createElement('button');
  button.className = 'ed-t-btn';
  button.type = 'button';
  button.dataset.nfAction = 'compose-preview';
  button.textContent = 'PREVIEW';
  button.style.width = 'auto';
  button.style.padding = '0 12px';
  button.onclick = function() { window.composePreview(); };
  btnRow.appendChild(button);
}
function tagEditorControls() {
  document.querySelectorAll('.ed-play-btn, .ed-t-btn:not([data-nf-action="compose-preview"])').forEach(function(el) { el.dataset.nfAction = 'preview'; });
  ensureComposePreviewButton();
}
async function loadEditorTimeline() {
  if (typeof bridgeCall !== 'function' || !window.currentEpisodePath) return showEditorEmpty('选择一个剧集查看时间线');
  const pipelinePath = window.currentEpisodePath + '/pipeline.json';
  try {
    let parsed = {};
    try {
      const pipelineData = await bridgeCall('fs.read', { path: pipelinePath });
      const raw = pipelineData.contents || pipelineData.content || '';
      parsed = typeof raw === 'object' ? raw : JSON.parse(raw);
    } catch (error) { parsed = {}; }
    const atoms = parsed.atoms || [];
    if (atoms.length > 0) {
      let totalDuration = 0;
      const layers = atoms.map(function(atom, index) {
        const start = totalDuration;
        const duration = atom.duration || 10;
        totalDuration += duration;
        return { name: atom.name || ('Atom ' + (index + 1)), scene: atom.type || 'video', start: start, duration: duration, file: atom.file || '', subtitles: atom.subtitles ? atom.subtitles.length + ' subs' : '' };
      });
      edTimelineData = normalizeEditorTimeline({ layers: layers, duration: totalDuration });
      return renderEditorFromTimeline(edTimelineData);
    }
    const dirData = await bridgeCall('fs.listDir', { path: window.currentEpisodePath });
    const entries = dirData.entries || dirData || [];
    const timelineEntry = entries.find(function(entry) {
      const name = typeof entry === 'string' ? entry : entry.name;
      return name && (name === 'timeline.json' || name.startsWith('segment-')) && name.endsWith('.json');
    });
    const timelineName = timelineEntry ? (typeof timelineEntry === 'string' ? timelineEntry : timelineEntry.name) : '';
    if (!timelineName) return showEditorEmpty('暂无时间线数据');
    const timelineData = await bridgeCall('timeline.load', { path: window.currentEpisodePath + '/' + timelineName });
    edTimelineData = normalizeEditorTimeline(timelineData);
    renderEditorFromTimeline(edTimelineData);
    if (edTimelineData.layers && edTimelineData.layers.some(function(layer) { return layer.scene; })) composePreview();
  } catch (error) {
    console.error('[editor] load timeline:', error);
    showEditorEmpty('暂无时间线数据');
  }
}
function showEditorEmpty(msg) {
  edActiveClip = null;
  const clipList = document.getElementById('ed-clip-list2');
  const tl = document.getElementById('ed-tl-body2');
  const insp = document.getElementById('ed-insp-inner2');
  if (clipList) clipList.innerHTML = '<div style="padding:20px;color:var(--t50);font-size:13px;text-align:center">' + (msg || '暂无数据') + '</div>';
  if (tl) tl.innerHTML = '';
  if (insp) insp.innerHTML = '<div style="padding:20px;color:var(--t50);font-size:13px">选择一个片段查看参数</div>';
  clearEditorPreviewContent();
  updateEditorPreviewState(0, 0);
}
function renderEditorFromTimeline(tl) {
  const timeline = normalizeEditorTimeline(tl);
  const layers = timeline.layers || [];
  const totalDuration = timeline.duration || getEditorTimelineDuration();
  const clipEl = document.getElementById('ed-clip-list2');
  const countEl = document.getElementById('ed-clip-count2');
  const tlEl = document.getElementById('ed-tl-body2');
  const insp = document.getElementById('ed-insp-inner2');
  if (countEl) countEl.textContent = layers.length;
  if (clipEl) {
    clipEl.innerHTML = layers.map(function(layer, i) {
      const name = layer.scene || layer.name || ('Layer ' + (i + 1));
      const start = typeof layer.start === 'number' ? layer.start.toFixed(1) + 's' : (layer.start || '');
      const duration = typeof layer.duration === 'number' ? layer.duration.toFixed(1) + 's' : (layer.duration || '');
      return '<div class="ed-clip-item" data-nf-action="select-clip" data-index="' + i + '" onclick="edSelectClip(' + i + ')">' +
        '<div class="ed-clip-top"><span class="ed-clip-name">' + name + '</span><span class="ed-clip-tc">' + start + '</span></div>' +
        '<div class="ed-clip-tags"><span class="ed-clip-tag dur">' + duration + '</span></div></div>';
    }).join('');
  }
  if (tlEl) {
    if (!layers.length) {
      tlEl.innerHTML = '';
    } else {
      let html = '<div class="ed-tl-ruler"><div class="ed-tl-ruler-bg"></div>';
      for (let t = 0; t <= totalDuration; t += 5) {
        const pct = totalDuration > 0 ? (t / totalDuration * 100).toFixed(1) : '0.0';
        html += '<span class="ed-tl-tick" style="left:' + pct + '%">' + t + 's</span>';
      }
      html += '</div>';
      layers.forEach(function(layer, i) {
        const name = layer.scene || layer.name || '';
        const left = totalDuration > 0 ? ((layer.start || 0) / totalDuration * 100) : 0;
        const width = totalDuration > 0 ? ((layer.duration || 0) / totalDuration * 100) : 0;
        html += '<div class="ed-tl-track"><span class="ed-tl-track-label">' + name + '</span><div class="ed-tl-track-lane" data-index="' + i + '" onclick="handleTimelineTrackClick(event)">' +
          '<div class="ed-tl-clip visual" data-index="' + i + '" data-nf-action="preview" style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%"><span class="ed-tl-clip-label">' + name + '</span></div></div></div>';
      });
      tlEl.innerHTML = html;
      if (typeof window.ensureTransportPlayhead === 'function') window.ensureTransportPlayhead();
    }
  }
  if (insp && edActiveClip === null) insp.innerHTML = '<div style="padding:20px;color:var(--t50);font-size:13px">选择一个片段查看参数</div>';
  syncEditorSelectionUI(edActiveClip);
  updateEditorPreviewState(0, totalDuration);
}
function selectTimelineClip(index) {
  if (!edTimelineData || !Array.isArray(edTimelineData.layers)) return;
  const layer = edTimelineData.layers[index];
  if (!layer) return;
  edActiveClip = index;
  syncEditorSelectionUI(index);
  const insp = document.getElementById('ed-insp-inner2');
  if (!insp) return;
  let html = '<div style="padding:16px"><div style="font-size:14px;font-weight:600;color:var(--t100);margin-bottom:12px">' + (layer.scene || layer.name || 'Clip') + '</div>';
  html += '<div style="font-size:12px;color:var(--t50);margin-bottom:16px">Layer ' + (index + 1) + '</div>';
  html += Object.keys(layer).map(function(key) {
    const value = typeof layer[key] === 'object' ? JSON.stringify(layer[key]) : String(layer[key]);
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:4px 0;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:12px;color:var(--t65)">' + key + '</span>' +
      '<input class="ed-insp-input" data-nf-action="save-timeline" data-key="' + escapeEditorAttr(key) + '" value="' + escapeEditorAttr(value) + '" style="width:180px;text-align:right"></div>';
  }).join('') + '</div>';
  insp.innerHTML = html;
  insp.querySelectorAll('.ed-insp-input[data-key]').forEach(function(input) { input.onchange = function(event) { handleTimelineInspectorChange(event); }; });
}
function escapeEditorAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function handleTimelineInspectorChange(event) {
  if (!edTimelineData || !Array.isArray(edTimelineData.layers) || edActiveClip === null) return;
  const input = event.currentTarget;
  const key = input.dataset.key;
  const layer = edTimelineData.layers[edActiveClip];
  if (!key || !layer) return;
  layer[key] = parseEditorInputValue(input.value, layer[key]);
  edTimelineData.duration = edTimelineData.layers.reduce(function(maxEnd, item) {
    return Math.max(maxEnd, (item.start || 0) + (item.duration || 0));
  }, 0);
  saveTimeline().then(function() {
    showEditorSaveBadge();
    renderEditorFromTimeline(edTimelineData);
    selectTimelineClip(edActiveClip);
  }).catch(function(error) { console.error('[editor] save timeline:', error); });
}
function edSaveParam(input) { handleTimelineInspectorChange({ currentTarget: input }); }
function previewFrame(t) {
  const time = Number.isFinite(t) ? t : 0;
  if (window.edPreviewMode === 'dom' && canUseDomPreview()) {
    const engine = window.previewEngine;
    toggleEditorPreviewPlaceholder(false);
    return Promise.resolve(typeof engine.seek === 'function' ? engine.seek(time) : engine.compose(time)).then(function(result) {
      pushPreviewTransportState(time, false);
      return result;
    }).catch(function(error) { console.error('[editor] preview frame:', error); return null; });
  }
  if (typeof bridgeCall !== 'function' || !window.currentEpisodePath) return Promise.resolve(null);
  return bridgeCall('preview.frame', { timelinePath: buildEditorTimelinePath(), t: time }).then(function(result) {
    if (result && result.dataUrl) {
      renderEditorPreviewContent('img', function(img) { img.src = result.dataUrl; img.alt = 'Timeline preview frame'; });
      pushPreviewTransportState(time, false);
    }
    return result;
  }).catch(function(error) { console.error('[editor] preview frame:', error); return null; });
}
function handleTimelineTrackClick(event) {
  const lane = (event.target.closest && event.target.closest('.ed-tl-track-lane')) || event.currentTarget;
  if (!lane || !edTimelineData) return;
  const clip = event.target.closest ? event.target.closest('.ed-tl-clip[data-index]') : null;
  if (clip) edSelectClip(Number(clip.dataset.index));
  const totalDuration = getEditorTimelineDuration();
  if (!lane.clientWidth || totalDuration <= 0) return;
  const rect = lane.getBoundingClientRect();
  previewFrame(Math.max(0, Math.min(totalDuration, (event.clientX - rect.left) / rect.width * totalDuration)));
}
async function composePreview() {
  if (!edTimelineData) return null;
  if (canUseDomPreview()) {
    try {
      const stage = ensureEditorPreviewStage();
      if (!stage) return null;
      await saveTimeline().catch(function() { return null; });
      stage.innerHTML = '';
      window.previewEngine.setStage(stage);
      window.previewEngine.loadTimeline(edTimelineData);
      bindEditorPreviewSelection();
      window.edPreviewMode = 'dom';
      window.edPreviewIframe = null;
      if (typeof window.bindPreviewStateSource === 'function') window.bindPreviewStateSource();
      toggleEditorPreviewPlaceholder(false);
      const result = await window.previewEngine.compose(0);
      pushPreviewTransportState(0, false);
      return result;
    } catch (error) { console.error('[editor] dom compose preview:', error); }
  }
  if (typeof bridgeCall !== 'function' || !window.currentEpisodePath) return null;
  await saveTimeline();
  const result = await bridgeCall('compose.generate', { timelinePath: buildEditorTimelinePath() });
  if (result && result.path) {
    const htmlContent = await bridgeCall('fs.read', { path: result.path });
    const raw = htmlContent.contents || htmlContent.content || '';
    renderEditorPreviewContent('iframe', function(el) { el.srcdoc = typeof raw === 'string' ? raw : ''; el.title = 'Preview'; el.allow = 'autoplay'; });
    if (typeof window.bindPreviewStateSource === 'function') window.bindPreviewStateSource();
    pushPreviewTransportState(0, false);
  }
  return result;
}
function renderEditorClipList() { return document.getElementById('ed-clip-list'); }
function renderEditorTimeline() { return document.getElementById('ed-tl-body'); }
function renderEditorInspector() { return document.getElementById('ed-insp-inner'); }
function edSelectClip(idOrIndex) {
  if (typeof idOrIndex === 'number' && edTimelineData) return selectTimelineClip(idOrIndex);
  edActiveClip = idOrIndex;
  syncEditorSelectionUI(edActiveClip);
}
tagEditorControls();
window.loadEditorTimeline = loadEditorTimeline;
window.showEditorEmpty = showEditorEmpty;
window.renderEditorFromTimeline = renderEditorFromTimeline;
window.renderEditorClipList = renderEditorClipList;
window.renderEditorTimeline = renderEditorTimeline;
window.renderEditorInspector = renderEditorInspector;
window.edSelectClip = edSelectClip;
window.edSaveParam = edSaveParam;
window.saveTimeline = saveTimeline;
window.composePreview = composePreview;
window.previewFrame = previewFrame;
window.handleTimelineTrackClick = handleTimelineTrackClick;
window.handleTimelineInspectorChange = handleTimelineInspectorChange;
