// Clips tab runtime bindings.
let pipelineClipsState = { sources: [], selectedSourceId: '', selectedClipKey: '', modalClipKey: '' };

function loadPipelineClipsData(scope) {
  if (typeof bridgeCall !== 'function' || !scope || !scope.episode) return;
  const episodePath = scope.episode;
  const sourcesPath = episodePath + '/sources';
  const pipelinePath = episodePath + '/pipeline.json';
  Promise.all([
    bridgeCall('source.clips', { episode: episodePath }).catch(function() { return { clips: [] }; }),
    bridgeCall('fs.listDir', { path: sourcesPath }).catch(function() { return { entries: [] }; }),
    bridgeCall('fs.read', { path: pipelinePath }).catch(function() { return { contents: '' }; }),
  ]).then(function(results) {
    const episodeClips = Array.isArray(results[0] && results[0].clips) ? results[0].clips : [];
    const sourceNames = normalizeBridgeEntries(results[1]).map(function(entry) {
      return typeof entry === 'string' ? entry : entry.name;
    }).filter(Boolean);
    Promise.all(sourceNames.map(function(sourceName) {
      const sourceDir = sourcesPath + '/' + sourceName;
      return bridgeCall('fs.read', { path: sourceDir + '/source.json' }).then(function(data) {
        const sourceDoc = parseJsonBridge(data, null);
        return sourceDoc ? buildClipsSource(sourceDir, sourceName, sourceDoc, episodeClips, parsePipelineAtoms(results[2])) : null;
      }).catch(function() {
        return null;
      });
    })).then(function(sources) {
      renderClipsTab({ sources: sources.filter(Boolean), project: scope.project || '', episode: episodePath });
    });
  }).catch(function() {
    renderClipsTab({ sources: [], project: scope.project || '', episode: episodePath });
  });
}

function renderClipsTab(data) {
  const shell = ensureClipsStageShell();
  if (!shell) return;
  const nextSources = Array.isArray(data && data.sources) ? data.sources : [];
  const selectedSourceId = nextSources.some(function(source) { return source.id === pipelineClipsState.selectedSourceId; })
    ? pipelineClipsState.selectedSourceId
    : (nextSources[0] ? nextSources[0].id : '');
  const activeSource = nextSources.find(function(source) { return source.id === selectedSourceId; }) || null;
  const selectedClipKey = activeSource && activeSource.clips.some(function(clip) { return clip.key === pipelineClipsState.selectedClipKey; })
    ? pipelineClipsState.selectedClipKey
    : '';
  pipelineClipsState = {
    sources: nextSources,
    selectedSourceId: selectedSourceId,
    selectedClipKey: selectedClipKey,
    modalClipKey: findClipByKey(pipelineClipsState.modalClipKey) ? pipelineClipsState.modalClipKey : '',
  };
  shell.sidebar.innerHTML = renderClipsSidebar(nextSources, selectedSourceId);
  shell.main.innerHTML = activeSource ? renderClipsMain(activeSource, selectedClipKey) : renderClipsEmptyMain();
  renderClipsModal();
}

function selectClipsSource(sourceId) {
  pipelineClipsState.selectedSourceId = sourceId;
  pipelineClipsState.selectedClipKey = '';
  renderClipsTab({ sources: pipelineClipsState.sources });
}

function toggleClipsCard(clipKey) {
  pipelineClipsState.selectedClipKey = pipelineClipsState.selectedClipKey === clipKey ? '' : clipKey;
  renderClipsTab({ sources: pipelineClipsState.sources });
}

function openClipsModal(clipKey) {
  pipelineClipsState.modalClipKey = clipKey;
  renderClipsModal(true);
}

function closeClipsModal() {
  const modal = document.getElementById('pl-clips-modal');
  const video = document.getElementById('pl-clips-modal-video');
  if (video) video.pause();
  if (modal) modal.classList.remove('show');
  pipelineClipsState.modalClipKey = '';
}

function toggleClipsModalPlayback() {
  const video = document.getElementById('pl-clips-modal-video');
  if (!video) return;
  if (video.paused) video.play().catch(function() {});
  else video.pause();
  syncClipsModalControls();
}

function seekClipsModal(delta) {
  const video = document.getElementById('pl-clips-modal-video');
  if (!video) return;
  video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  syncClipsModalControls();
}

function jumpClipsModal(where) {
  const video = document.getElementById('pl-clips-modal-video');
  if (!video) return;
  video.currentTime = where === 'end' ? (video.duration || 0) : 0;
  syncClipsModalControls();
}

function seekClipsModalProgress(event) {
  const video = document.getElementById('pl-clips-modal-video');
  const bar = document.getElementById('pl-clips-modal-progress');
  if (!video || !bar) return;
  const rect = bar.getBoundingClientRect();
  const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0;
  video.currentTime = (video.duration || 0) * ratio;
  syncClipsModalControls();
}

function renderClipsSidebar(sources, selectedSourceId) {
  if (!sources.length) {
    return '<div class="pl-clips-side-head">SOURCES</div><div class="pl-clips-side-empty">No sources yet</div>';
  }
  let html = '<div class="pl-clips-side-head">SOURCES</div><div class="pl-clips-source-list">';
  sources.forEach(function(source) {
    const meta = [source.durationLabel, source.resolution, source.sizeLabel].filter(Boolean).join(' · ');
    html += '<button class="pl-clips-source' + (source.id === selectedSourceId ? ' is-active' : '') + '" data-nf-action="select-clips-source" data-nf-role="source-item" onclick="selectClipsSource(\'' + escapeJsString(source.id) + '\')">' +
      '<span class="pl-clips-source-thumb"><span class="pl-clips-source-grad"></span><span class="pl-clips-source-dur">' + escapeHtml(source.durationLabel || '--:--') + '</span></span>' +
      '<span class="pl-clips-source-copy"><span class="pl-clips-source-name">' + escapeHtml(source.name) + '</span><span class="pl-clips-source-meta">' + escapeHtml(meta || 'Source video') + '</span><span class="pl-clips-source-count">' + escapeHtml(String(source.clips.length)) + ' clips</span></span>' +
    '</button>';
  });
  return html + '</div>';
}

function renderClipsMain(source, selectedClipKey) {
  const clip = source.clips.find(function(item) { return item.key === selectedClipKey; }) || null;
  return '<div class="pl-clips-main-wrap">' +
    '<div class="pl-clips-head"><div class="pl-clips-head-row"><div class="pl-clips-head-name">' + escapeHtml(source.name) + '</div><div class="pl-clips-head-tags">' + renderSourceSpecTags(source) + '</div></div><div class="pl-clips-head-path">' + escapeHtml(source.path) + '</div></div>' +
    '<div class="pl-clips-timeline"><div class="pl-clips-timeline-bar">' + renderSourceTimeline(source, selectedClipKey) + '</div><div class="pl-clips-ticks">' + renderTimelineTicks(source.durationSec) + '</div></div>' +
    (clip ? renderClipDetail(source, clip) : '') +
    '<div class="pl-clips-list">' + renderClipCards(source, selectedClipKey) + '</div>' +
  '</div>';
}

function renderClipsEmptyMain() {
  return '<div class="pl-clips-empty"><div class="pl-clips-empty-title">No sources yet</div><div class="pl-clips-empty-copy">Add or download source videos into this episode to inspect clips.</div></div>';
}

function renderSourceSpecTags(source) {
  return [
    renderSpecTag('res', source.resolution),
    renderSpecTag('fps', source.fps ? source.fps + 'fps' : ''),
    renderSpecTag('codec', source.codec),
    renderSpecTag('dur', source.durationLabel),
    renderSpecTag('size', source.sizeLabel),
  ].join('');
}

function renderSpecTag(kind, value) {
  return value ? '<span class="pl-clips-spec pl-clips-spec--' + kind + '">' + escapeHtml(value) + '</span>' : '';
}

function renderSourceTimeline(source, selectedClipKey) {
  const duration = source.durationSec > 0 ? source.durationSec : 1;
  return source.clips.map(function(clip) {
    const left = Math.max(0, Math.min(100, clip.startSec / duration * 100));
    const width = Math.max(1.2, Math.min(100 - left, clip.durationSec / duration * 100));
    return '<button class="pl-clips-block' + (clip.key === selectedClipKey ? ' is-active' : '') + '" data-nf-action="select-clips-clip" data-nf-role="clip-block" onclick="toggleClipsCard(\'' + escapeJsString(clip.key) + '\')" style="left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%">' + escapeHtml(clip.badge) + '</button>';
  }).join('');
}

function renderTimelineTicks(durationSec) {
  const step = durationSec <= 60 ? 10 : (durationSec <= 180 ? 20 : 60);
  const ticks = [];
  for (let time = 0; time <= durationSec; time += step) ticks.push('<span>' + escapeHtml(formatClipTime(time, 0)) + '</span>');
  if (!ticks.length || ticks[ticks.length - 1] !== '<span>' + escapeHtml(formatClipTime(durationSec, 0)) + '</span>') {
    ticks.push('<span>' + escapeHtml(formatClipTime(durationSec, 0)) + '</span>');
  }
  return ticks.join('');
}

function renderClipCards(source, selectedClipKey) {
  if (!source.clips.length) {
    return '<div class="pl-clips-list-empty">No clips for this source yet.</div>';
  }
  return source.clips.map(function(clip) {
    const subtitle = clip.subtitleText ? '<div class="pl-clips-card-subtitle">' + escapeHtml(clip.subtitleText) + '</div>' : '';
    const linked = '<span class="pl-clips-chip pl-clips-chip--segment">' + escapeHtml(clip.linkedSegment) + '</span>';
    const tags = clip.tags.map(function(tag) { return '<span class="pl-clips-chip">' + escapeHtml(tag) + '</span>'; }).join('');
    return '<div class="pl-clips-card' + (clip.key === selectedClipKey ? ' is-active' : '') + '" data-nf-role="clip-card">' +
      '<button class="pl-clips-card-hit" data-nf-action="select-clips-clip" onclick="toggleClipsCard(\'' + escapeJsString(clip.key) + '\')">' +
        '<span class="pl-clips-card-head"><span><span class="pl-clips-card-name">' + escapeHtml(clip.name) + '</span><span class="pl-clips-card-range">' + escapeHtml(clip.rangeLabel) + '</span></span><span class="pl-clips-card-duration">' + escapeHtml(clip.durationLabel) + '</span></span>' +
        subtitle +
        '<span class="pl-clips-card-foot"><span class="pl-clips-chip-row">' + tags + linked + '</span><span class="pl-clips-status-row"><span class="pl-clips-status' + (clip.hasSubtitle ? ' is-sub' : '') + '">' + escapeHtml(clip.hasSubtitle ? '字幕 ✓' : '无字幕') + '</span><span class="pl-clips-status' + (clip.hasTl ? ' is-tl' : '') + '">' + escapeHtml(clip.hasTl ? '时间轴 ✓' : '无时间轴') + '</span></span></span>' +
      '</button>' +
      '<button class="pl-clips-card-play" data-nf-action="open-clips-modal" onclick="openClipsModal(\'' + escapeJsString(clip.key) + '\')" ' + (clip.videoUrl ? '' : 'disabled') + '>播放</button>' +
    '</div>';
  }).join('');
}

function renderClipDetail(source, clip) {
  const subs = clip.subtitles.length
    ? '<div class="pl-clips-sub-list">' + clip.subtitles.slice(0, 12).map(function(sub) {
      return '<div class="pl-clips-sub-line"><span class="pl-clips-sub-tc">' + escapeHtml(formatClipTime(sub.start_ms / 1000, 1) + ' → ' + formatClipTime(sub.end_ms / 1000, 1)) + '</span><span class="pl-clips-sub-text">' + escapeHtml(sub.text || '') + '</span><span class="pl-clips-sub-dur">' + escapeHtml(formatShortSeconds((sub.end_ms - sub.start_ms) / 1000)) + '</span></div>';
    }).join('') + '</div>'
    : '<div class="pl-clips-sub-empty">No subtitle data.</div>';
  return '<div class="pl-clips-detail">' +
    '<div class="pl-clips-detail-preview"><button class="pl-clips-detail-play" data-nf-action="open-clips-modal" onclick="openClipsModal(\'' + escapeJsString(clip.key) + '\')" ' + (clip.videoUrl ? '' : 'disabled') + '>▶</button><div class="pl-clips-detail-tc">' + escapeHtml(clip.rangeLabel) + '</div></div>' +
    '<div class="pl-clips-detail-meta"><span class="pl-clips-meta-item"><span>IN</span><strong>' + escapeHtml(formatClipTime(clip.startSec, 1)) + '</strong></span><span class="pl-clips-meta-item"><span>OUT</span><strong>' + escapeHtml(formatClipTime(clip.endSec, 1)) + '</strong></span><span class="pl-clips-meta-item"><span>DURATION</span><strong>' + escapeHtml(clip.durationLabel) + '</strong></span><span class="pl-clips-meta-item"><span>SEGMENT</span><strong>' + escapeHtml(clip.linkedSegment) + '</strong></span></div>' +
    '<div class="pl-clips-detail-subs"><div class="pl-clips-detail-label">SUBTITLES</div>' + subs + '</div>' +
    '<div class="pl-clips-detail-path">' + escapeHtml(clip.path || source.path) + '</div>' +
  '</div>';
}

function renderClipsModal(autoplay) {
  const clip = findClipByKey(pipelineClipsState.modalClipKey);
  let modal = document.getElementById('pl-clips-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pl-clips-modal';
    modal.className = 'pl-clips-modal-overlay';
    modal.innerHTML = '<div class="pl-clips-modal glass" data-nf-role="clip-modal"><div class="pl-clips-modal-video"><video id="pl-clips-modal-video" preload="metadata"></video></div><div class="pl-clips-modal-controls"><div class="pl-clips-modal-buttons"><button data-nf-action="modal-start" onclick="jumpClipsModal(\'start\')">⏮</button><button data-nf-action="modal-back" onclick="seekClipsModal(-5)">◀</button><button id="pl-clips-modal-toggle" data-nf-action="modal-toggle" onclick="toggleClipsModalPlayback()">▶</button><button data-nf-action="modal-forward" onclick="seekClipsModal(5)">▶</button><button data-nf-action="modal-end" onclick="jumpClipsModal(\'end\')">⏭</button></div><button id="pl-clips-modal-progress" class="pl-clips-modal-progress" data-nf-action="modal-seek" onclick="seekClipsModalProgress(event)"><span id="pl-clips-modal-fill"></span></button><div id="pl-clips-modal-tc" class="pl-clips-modal-tc">00:00.0 / 00:00.0</div></div><div class="pl-clips-modal-foot"><div><div id="pl-clips-modal-label" class="pl-clips-modal-label"></div><div id="pl-clips-modal-specs" class="pl-clips-modal-specs"></div></div><button class="pl-clips-modal-close" data-nf-action="close-clips-modal" onclick="closeClipsModal()">×</button></div></div>';
    modal.onclick = function(event) { if (event.target === modal) closeClipsModal(); };
    document.body.appendChild(modal);
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') closeClipsModal();
    });
    bindClipsModalVideo();
  }
  if (!clip) {
    modal.classList.remove('show');
    return;
  }
  document.getElementById('pl-clips-modal-label').textContent = clip.name;
  document.getElementById('pl-clips-modal-specs').textContent = [clip.durationLabel, clip.linkedSegment, clip.path].filter(Boolean).join(' · ');
  const video = document.getElementById('pl-clips-modal-video');
  if (video.dataset.clipKey !== clip.key) {
    video.dataset.clipKey = clip.key;
    video.src = clip.videoUrl || '';
    video.currentTime = 0;
  }
  modal.classList.add('show');
  syncClipsModalControls();
  if (autoplay && clip.videoUrl) video.play().catch(function() {});
}

function bindClipsModalVideo() {
  const video = document.getElementById('pl-clips-modal-video');
  if (!video) return;
  ['play', 'pause', 'loadedmetadata', 'timeupdate', 'ended'].forEach(function(eventName) {
    video.addEventListener(eventName, syncClipsModalControls);
  });
}

function syncClipsModalControls() {
  const video = document.getElementById('pl-clips-modal-video');
  const fill = document.getElementById('pl-clips-modal-fill');
  const tc = document.getElementById('pl-clips-modal-tc');
  const toggle = document.getElementById('pl-clips-modal-toggle');
  if (!video || !fill || !tc || !toggle) return;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  fill.style.width = duration > 0 ? (current / duration * 100).toFixed(2) + '%' : '0%';
  tc.textContent = formatClipTime(current, 1) + ' / ' + formatClipTime(duration, 1);
  toggle.textContent = video.paused ? '▶' : '⏸';
}

function buildClipsSource(sourceDir, sourceName, sourceDoc, episodeClips, atoms) {
  const atomLookup = buildAtomLookup(atoms);
  const clipLookup = buildEpisodeClipLookup(episodeClips);
  const sourceClips = Array.isArray(sourceDoc.clips) ? sourceDoc.clips : [];
  const clips = sourceClips.map(function(rawClip, index) {
    const resolvedClipPath = resolveClipPath(sourceDir, rawClip.file);
    const matchedClip = clipLookup.byPath.get(normalizeClipPath(resolvedClipPath)) || clipLookup.byName[getClipBasename(resolvedClipPath)] || null;
    const atom = pickClipAtom(rawClip, sourceDir, resolvedClipPath, matchedClip, atomLookup);
    const path = matchedClip && matchedClip.path ? matchedClip.path : resolvedClipPath;
    const subtitles = Array.isArray(rawClip.subtitles) ? rawClip.subtitles : (Array.isArray(atom && atom.subtitles) ? atom.subtitles : []);
    const startSec = finiteValue(rawClip.start_sec, rawClip.start, 0);
    const endSec = finiteValue(rawClip.end_sec, rawClip.end, startSec);
    const durationSec = finiteValue(rawClip.duration_sec, rawClip.duration, Math.max(0, endSec - startSec));
    const tags = (Array.isArray(rawClip.tags) ? rawClip.tags : []).filter(Boolean);
    if (rawClip.from_id || rawClip.to_id) tags.push('句' + (rawClip.from_id || rawClip.to_id || '?') + '-' + (rawClip.to_id || rawClip.from_id || '?'));
    return {
      key: sourceName + ':' + String(rawClip.id || index + 1),
      badge: 'C' + String(index + 1),
      id: Number(rawClip.id) || index + 1,
      name: rawClip.title || rawClip.name || ('Clip ' + (index + 1)),
      path: path,
      videoUrl: toNfdataUrl(path || ''),
      startSec: startSec,
      endSec: Math.max(startSec, endSec),
      durationSec: durationSec,
      durationLabel: formatShortSeconds(durationSec),
      rangeLabel: formatClipTime(startSec, 1) + ' → ' + formatClipTime(endSec, 1),
      subtitles: subtitles,
      subtitleText: summarizeClipSubtitle(subtitles),
      hasSubtitle: subtitles.length > 0,
      hasTl: !!(atom && atom.hasTl),
      linkedSegment: atom && atom.segment ? ('段 ' + atom.segment) : '未关联段落',
      tags: dedupeClipTags(tags),
    };
  });
  return {
    id: sourceName,
    name: sourceDoc.title || sourceDoc.id || sourceName,
    path: sourceDir + '/source.mp4',
    durationSec: Number(sourceDoc.duration_sec) || 0,
    durationLabel: formatDurationClock(Number(sourceDoc.duration_sec) || 0),
    resolution: pickSourceResolution(sourceDoc),
    fps: pickSourceFps(sourceDoc),
    codec: pickSourceCodec(sourceDoc),
    sizeLabel: pickSourceSize(sourceDoc),
    clips: clips,
  };
}

function ensureClipsStageShell() {
  const body = document.querySelector('#pl-tab-asset .pl-body');
  if (!body) return null;
  let sidebar = body.querySelector('.pl-sidebar');
  let main = body.querySelector('.pl-main');
  if (!sidebar || !main) {
    body.innerHTML = '<div class="pl-sidebar glass"></div><div class="pl-main glass"></div>';
    sidebar = body.querySelector('.pl-sidebar');
    main = body.querySelector('.pl-main');
  }
  body.classList.add('pl-clips-body');
  main.classList.add('pl-clips-main');
  return { sidebar: sidebar, main: main };
}

function findClipByKey(key) {
  if (!key) return null;
  for (let index = 0; index < pipelineClipsState.sources.length; index += 1) {
    const clip = pipelineClipsState.sources[index].clips.find(function(item) { return item.key === key; });
    if (clip) return clip;
  }
  return null;
}

function parseJsonBridge(data, fallback) {
  const text = data && (data.contents || data.content || '');
  try {
    return JSON.parse(text || '');
  } catch (_error) {
    return fallback;
  }
}

function parsePipelineAtoms(data) {
  const parsed = parseJsonBridge(data, {});
  return Array.isArray(parsed && parsed.atoms) ? parsed.atoms : [];
}

function normalizeBridgeEntries(data) {
  const entries = data && (data.entries || data);
  return Array.isArray(entries) ? entries : [];
}

function buildAtomLookup(atoms) {
  const byPath = new Map();
  const byRef = new Map();
  atoms.forEach(function(atom) {
    if (atom && atom.file) byPath.set(normalizeClipPath(atom.file), atom);
    if (atom && atom.source_ref && atom.source_clip_id) byRef.set(atom.source_ref + '#' + atom.source_clip_id, atom);
  });
  return { byPath: byPath, byRef: byRef };
}

function buildEpisodeClipLookup(clips) {
  const byPath = new Map();
  const byName = {};
  clips.forEach(function(clip) {
    if (!clip || !clip.path) return;
    const normalized = normalizeClipPath(clip.path);
    byPath.set(normalized, clip);
    const name = getClipBasename(clip.path);
    if (name && !byName[name]) byName[name] = clip;
  });
  return { byPath: byPath, byName: byName };
}

function pickClipAtom(rawClip, sourceDir, resolvedClipPath, matchedClip, atomLookup) {
  if (matchedClip && atomLookup.byPath.has(normalizeClipPath(matchedClip.path))) return atomLookup.byPath.get(normalizeClipPath(matchedClip.path));
  if (atomLookup.byPath.has(normalizeClipPath(resolvedClipPath))) return atomLookup.byPath.get(normalizeClipPath(resolvedClipPath));
  return atomLookup.byRef.get(sourceDir + '/source.json#' + (rawClip.id || '')) || null;
}

function resolveClipPath(sourceDir, clipFile) {
  if (!clipFile) return '';
  return String(clipFile).startsWith('/') ? String(clipFile) : (sourceDir + '/' + String(clipFile).replace(/^\.?\//, ''));
}

function normalizeClipPath(path) {
  return String(path || '').replace(/\\/g, '/');
}

function getClipBasename(path) {
  const normalized = normalizeClipPath(path);
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

function pickSourceResolution(sourceDoc) {
  const width = Number(sourceDoc.width || sourceDoc.video_width);
  const height = Number(sourceDoc.height || sourceDoc.video_height);
  if (width > 0 && height > 0) return width + '×' + height;
  return sourceDoc.resolution || sourceDoc.format || '';
}

function pickSourceFps(sourceDoc) {
  const fps = Number(sourceDoc.fps || sourceDoc.video_fps);
  return Number.isFinite(fps) && fps > 0 ? String(fps) : '';
}

function pickSourceCodec(sourceDoc) {
  return sourceDoc.codec || sourceDoc.video_codec || '';
}

function pickSourceSize(sourceDoc) {
  const bytes = Number(sourceDoc.size || sourceDoc.size_bytes || sourceDoc.filesize || sourceDoc.file_size);
  return bytes > 0 ? formatBytes(bytes) : '';
}

function summarizeClipSubtitle(subtitles) {
  if (!Array.isArray(subtitles) || subtitles.length === 0) return '';
  return subtitles.map(function(sub) { return sub && sub.text ? sub.text : ''; }).join(' ').replace(/\s+/g, ' ').trim();
}

function dedupeClipTags(tags) {
  const seen = {};
  return tags.filter(function(tag) {
    const key = String(tag || '').trim();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function finiteValue() {
  for (let index = 0; index < arguments.length; index += 1) {
    const value = Number(arguments[index]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function formatDurationClock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function formatClipTime(seconds, precision) {
  const total = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  const secs = total - mins * 60;
  const fixed = secs.toFixed(precision).padStart(precision ? precision + 3 : 2, '0');
  return String(mins).padStart(2, '0') + ':' + fixed;
}

function formatShortSeconds(seconds) {
  return (Math.max(0, Number(seconds) || 0)).toFixed(1) + 's';
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 1024 * 1024 * 1024) return (value / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}

window.loadPipelineClipsData = loadPipelineClipsData;
window.renderClipsTab = renderClipsTab;
window.selectClipsSource = selectClipsSource;
window.toggleClipsCard = toggleClipsCard;
window.openClipsModal = openClipsModal;
window.closeClipsModal = closeClipsModal;
window.toggleClipsModalPlayback = toggleClipsModalPlayback;
window.seekClipsModal = seekClipsModal;
window.jumpClipsModal = jumpClipsModal;
window.seekClipsModalProgress = seekClipsModalProgress;
