// Editor timeline and preview integration for the WKWebView editor.
let edTimelineData = null;
let edActiveClip = null;
let edCurrentTime = 0;
let edPlaying = false;
let edRafId = null;
let edLastFrameTime = 0;
let edVideos = [];
let edCurrentVideoIdx = 0;
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
  edCurrentTime = Number.isFinite(t) ? t : edCurrentTime;
  const dur = Number.isFinite(totalDuration) ? totalDuration : getEditorTimelineDuration();
  const previewTc = document.querySelector('.ed-preview-tc');
  if (previewTc) previewTc.textContent = formatEditorTimecode(edCurrentTime) + ' / ' + formatEditorTimecode(dur);
  const transportTc = document.querySelector('.ed-transport-tc');
  if (transportTc) transportTc.textContent = formatEditorTimecode(edCurrentTime);
  const pct = dur > 0 ? Math.max(0, Math.min(100, edCurrentTime / dur * 100)) : 0;
  const progressFill = document.querySelector('.ed-transport-fill');
  if (progressFill) progressFill.style.width = pct.toFixed(1) + '%';
  const thumb = document.querySelector('.ed-transport-thumb');
  if (thumb) thumb.style.left = pct.toFixed(1) + '%';
  edUpdatePlayhead();
  edUpdateVideoCounter();
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
  const transport = document.querySelector('.ed-transport');
  if (!transport || transport.querySelector('[data-nf-action="compose-preview"]')) return;
  const button = document.createElement('button');
  button.className = 'ed-t-btn';
  button.type = 'button';
  button.dataset.nfAction = 'compose-preview';
  button.textContent = 'PREVIEW';
  button.style.cssText = 'width:auto;padding:0 12px;font-size:10px;font-weight:600;letter-spacing:0.06em';
  button.onclick = function() { window.composePreview(); };
  transport.appendChild(button);
}
function tagEditorControls() {
  document.querySelectorAll('.ed-play-btn, .ed-t-btn:not([data-nf-action="compose-preview"])').forEach(function(el) { el.dataset.nfAction = 'preview'; });
  ensureComposePreviewButton();
}
function buildVideoFromAtom(atom, index) {
  var dur = atom.duration || 10;
  var layers = Array.isArray(atom.layers) ? atom.layers : [];
  if (!layers.length) {
    layers = [{ name: atom.type || 'video', scene: atom.type || 'video', start: 0, duration: dur }];
    if (atom.subtitles && atom.subtitles.length) layers.push({ name: 'subtitles', scene: 'subtitle', start: 0, duration: dur });
  }
  return { name: atom.name || ('Video ' + (index + 1)), duration: dur, layerCount: layers.length, file: atom.file || '', tracks: layers };
}
function edSwitchVideo(idx) {
  if (idx < 0 || idx >= edVideos.length) return;
  edPause(); edCurrentVideoIdx = idx; edCurrentTime = 0; edActiveClip = null;
  var video = edVideos[idx];
  edTimelineData = normalizeEditorTimeline({ layers: video.tracks, duration: video.duration });
  renderEditorVideoList(); renderEditorTracks();
  updateEditorPreviewState(0, video.duration);
  if (edTimelineData.layers && edTimelineData.layers.some(function(l) { return l.scene; })) composePreview();
}
async function loadEditorTimeline() {
  if (typeof bridgeCall !== 'function' || !window.currentEpisodePath) return showEditorEmpty('选择一个剧集查看时间线');
  var pipelinePath = window.currentEpisodePath + '/pipeline.json';
  try {
    var parsed = {};
    try {
      var pipelineData = await bridgeCall('fs.read', { path: pipelinePath });
      var raw = pipelineData.contents || pipelineData.content || '';
      parsed = typeof raw === 'object' ? raw : JSON.parse(raw);
    } catch (error) { parsed = {}; }
    var atoms = parsed.atoms || [];
    if (atoms.length > 0) {
      edVideos = atoms.map(buildVideoFromAtom);
      edCurrentVideoIdx = 0;
      return edSwitchVideo(0);
    }
    var dirData = await bridgeCall('fs.listDir', { path: window.currentEpisodePath });
    var entries = dirData.entries || dirData || [];
    var segmentEntries = entries.filter(function(entry) {
      var name = typeof entry === 'string' ? entry : entry.name;
      return name && name.startsWith('segment-') && name.endsWith('.json');
    });
    if (segmentEntries.length > 0) {
      edVideos = await Promise.all(segmentEntries.map(async function(entry) {
        var name = typeof entry === 'string' ? entry : entry.name;
        var data = await bridgeCall('timeline.load', { path: window.currentEpisodePath + '/' + name });
        var tl = normalizeEditorTimeline(data);
        var dur = tl.duration || 0;
        return { name: name.replace(/\.json$/, '').replace(/^segment-/, 'Video '), duration: dur, layerCount: (tl.layers || []).length, file: '', tracks: tl.layers || [] };
      }));
      edCurrentVideoIdx = 0;
      return edSwitchVideo(0);
    }
    var timelineEntry = entries.find(function(entry) {
      var name = typeof entry === 'string' ? entry : entry.name;
      return name === 'timeline.json';
    });
    if (!timelineEntry) return showEditorEmpty('暂无时间线数据');
    var timelineData = await bridgeCall('timeline.load', { path: window.currentEpisodePath + '/timeline.json' });
    var tl = normalizeEditorTimeline(timelineData);
    edVideos = [{ name: '主时间线', duration: tl.duration || 0, layerCount: (tl.layers || []).length, file: '', tracks: tl.layers || [] }];
    edCurrentVideoIdx = 0;
    edSwitchVideo(0);
  } catch (error) {
    console.error('[editor] load timeline:', error);
    showEditorEmpty('暂无时间线数据');
  }
}
function showEditorEmpty(msg) {
  edActiveClip = null; edVideos = [];
  var cl = document.getElementById('ed-clip-list2'); var tl = document.getElementById('ed-tl-body2'); var insp = document.getElementById('ed-insp-inner2');
  if (cl) cl.innerHTML = '<div style="padding:20px;color:var(--t50);font-size:13px;text-align:center">' + (msg || '暂无数据') + '</div>';
  if (tl) tl.innerHTML = ''; if (insp) insp.innerHTML = '';
  clearEditorPreviewContent(); updateEditorPreviewState(0, 0);
}
function renderEditorVideoList() {
  var clipEl = document.getElementById('ed-clip-list2');
  var countEl = document.getElementById('ed-clip-count2');
  if (countEl) countEl.textContent = edVideos.length;
  if (!clipEl) return;
  clipEl.innerHTML = edVideos.map(function(video, i) {
    var active = i === edCurrentVideoIdx ? ' active' : '';
    return '<div class="ed-clip-item' + active + '" data-nf-action="select-clip" data-index="' + i + '" onclick="edSwitchVideo(' + i + ')">' +
      '<div class="ed-clip-num">' + (i + 1) + '</div>' +
      '<div class="ed-clip-info"><div class="ed-clip-name">' + escapeEditorAttr(video.name) + '</div>' +
      '<div class="ed-clip-meta"><span>' + video.duration.toFixed(1) + 's</span><span>' + video.layerCount + ' layers</span></div></div></div>';
  }).join('');
}
function renderEditorTracks() {
  var video = edVideos[edCurrentVideoIdx]; if (!video) return;
  var layers = video.tracks || [];
  var dur = video.duration || 0;
  var rulerEl = document.getElementById('ed-tl-ruler2');
  if (rulerEl && dur > 0) {
    var step = dur <= 20 ? 2 : dur <= 40 ? 5 : 10; var rulerHTML = '';
    for (var t = 0; t <= dur; t += step) { var pct = (t / dur * 100).toFixed(1); rulerHTML += '<span class="ed-tl-ruler-mark" style="left:' + pct + '%">' + t + 's</span><span class="ed-tl-ruler-tick" style="left:' + pct + '%"></span>'; }
    rulerEl.innerHTML = rulerHTML;
  }
  var tlEl = document.getElementById('ed-tl-body2');
  if (tlEl) {
    tlEl.innerHTML = layers.map(function(layer, i) {
      var name = layer.scene || layer.name || '';
      var left = dur > 0 ? ((layer.start || 0) / dur * 100) : 0;
      var width = dur > 0 ? ((layer.duration || 0) / dur * 100) : 0;
      return '<div class="ed-tl-track"><span class="ed-tl-track-label">' + name + '</span>' +
        '<div class="ed-tl-clip" data-index="' + i + '" data-nf-action="preview" style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%" onclick="handleTimelineTrackClick(event)">' + name + '</div></div>';
    }).join('');
  }
  var insp = document.getElementById('ed-insp-inner2');
  if (insp && edActiveClip === null) insp.innerHTML = '<div style="padding:20px;color:var(--t50);font-size:13px">选择一个轨道查看参数</div>';
  syncEditorSelectionUI(edActiveClip);
}
function renderEditorFromTimeline(tl) {
  var timeline = normalizeEditorTimeline(tl);
  edTimelineData = timeline;
  var video = edVideos[edCurrentVideoIdx];
  if (video) { video.tracks = timeline.layers || []; video.duration = timeline.duration || 0; video.layerCount = (timeline.layers || []).length; }
  renderEditorVideoList(); renderEditorTracks();
  updateEditorPreviewState(0, timeline.duration || 0);
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
  const clip = event.target.closest ? event.target.closest('.ed-tl-clip[data-index]') : event.currentTarget;
  if (!clip || !edTimelineData) return;
  edSelectClip(Number(clip.dataset.index));
  const totalDuration = getEditorTimelineDuration();
  const tracksEl = document.getElementById('ed-tl-body2');
  if (!tracksEl || totalDuration <= 0) return;
  const rect = tracksEl.getBoundingClientRect();
  const trackLeft = rect.left + 100; // label width
  const trackWidth = rect.width - 100;
  if (trackWidth <= 0) return;
  previewFrame(Math.max(0, Math.min(totalDuration, (event.clientX - trackLeft) / trackWidth * totalDuration)));
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

// ══ PLAYBACK ══
var ED_ICON_PAUSE = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor"/></svg>';
var ED_ICON_PLAY = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polygon points="5,3 15,9 5,15" fill="currentColor"/></svg>';
function edUpdatePlayhead() {
  var dur = getEditorTimelineDuration(); var ph = document.getElementById('ed-tl-playhead2');
  var tl = ph ? ph.closest('.ed-timeline') : null;
  if (!ph || !tl || dur <= 0) return;
  ph.style.left = (100 + (edCurrentTime / dur) * (tl.clientWidth - 100)) + 'px';
}
function edUpdateVideoCounter() {
  var c = document.getElementById('ed-video-counter'); if (!c) return;
  c.textContent = (edVideos.length ? edCurrentVideoIdx + 1 : 0) + '/' + edVideos.length;
}
function edDomPreview(method) {
  if (window.edPreviewMode !== 'dom' || !window.previewEngine) return;
  if (typeof window.previewEngine[method] === 'function') window.previewEngine[method](edCurrentTime);
}
function edSeekTo(t) {
  var dur = getEditorTimelineDuration();
  edCurrentTime = Math.max(0, Math.min(t, dur));
  updateEditorPreviewState(edCurrentTime, dur);
  edDomPreview('seek') || edDomPreview('compose');
}
function edPlay() {
  if (edPlaying) return;
  var dur = getEditorTimelineDuration(); if (dur <= 0) return;
  if (edCurrentTime >= dur) edCurrentTime = 0;
  edPlaying = true;
  var btn = document.getElementById('ed-btn-play'); if (btn) btn.innerHTML = ED_ICON_PAUSE;
  edLastFrameTime = performance.now(); edRafId = requestAnimationFrame(edTick);
}
function edPause() {
  if (!edPlaying) return; edPlaying = false;
  var btn = document.getElementById('ed-btn-play'); if (btn) btn.innerHTML = ED_ICON_PLAY;
  if (edRafId) { cancelAnimationFrame(edRafId); edRafId = null; }
}
function edTick(now) {
  var dur = getEditorTimelineDuration();
  edCurrentTime += (now - edLastFrameTime) / 1000; edLastFrameTime = now;
  if (edCurrentTime >= dur) { edCurrentTime = dur; edPause(); }
  updateEditorPreviewState(edCurrentTime, dur); edDomPreview('compose');
  if (edPlaying) edRafId = requestAnimationFrame(edTick);
}
function edStepClip(delta) {
  if (!edVideos.length) return;
  edSwitchVideo(Math.max(0, Math.min(edCurrentVideoIdx + delta, edVideos.length - 1)));
}
function edClickSeek(el, e) {
  var rect = el.getBoundingClientRect();
  edSeekTo(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * getEditorTimelineDuration());
}
(function edBindTransport() {
  var toggle = function() { edPlaying ? edPause() : edPlay(); };
  var ids = { 'ed-btn-play': toggle, 'ed-btn-start': function() { edStepClip(-1); }, 'ed-btn-end': function() { edStepClip(1); }, 'ed-btn-back5': function() { edSeekTo(edCurrentTime - 5); }, 'ed-btn-fwd5': function() { edSeekTo(edCurrentTime + 5); } };
  Object.keys(ids).forEach(function(id) { var el = document.getElementById(id); if (el) el.onclick = ids[id]; });
  var pvBtn = document.querySelector('.ed-play-btn'); if (pvBtn) pvBtn.onclick = toggle;
  var progress = document.querySelector('.ed-transport-progress');
  if (progress) progress.addEventListener('click', function(e) { edClickSeek(progress, e); });
  var ruler = document.getElementById('ed-tl-ruler2');
  if (ruler) ruler.addEventListener('click', function(e) { edClickSeek(ruler, e); });
  var ph = document.getElementById('ed-tl-playhead2');
  var phHit = ph ? ph.querySelector('.ed-tl-playhead-hit') : null;
  var tlEl = ph ? ph.closest('.ed-timeline') : null;
  if (phHit && tlEl) {
    var dragging = false;
    phHit.addEventListener('pointerdown', function(e) { e.preventDefault(); dragging = true; phHit.setPointerCapture(e.pointerId); });
    document.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      var r = tlEl.getBoundingClientRect(); var w = r.width - 100;
      edSeekTo(Math.max(0, Math.min(1, (e.clientX - r.left - 100) / w)) * getEditorTimelineDuration());
    });
    document.addEventListener('pointerup', function() { dragging = false; });
  }
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
  });
  window.addEventListener('resize', function() { edUpdatePlayhead(); });
})();

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
window.edPlay = edPlay;
window.edPause = edPause;
window.edSeekTo = edSeekTo;
window.edStepClip = edStepClip;
window.edSwitchVideo = edSwitchVideo;
