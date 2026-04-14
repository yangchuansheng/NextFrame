// Transport controls — prefer previewEngine, keep iframe fallback when DOM scenes are unavailable.
const edPlaybackState = { currentTime: 0, duration: 0, isPlaying: false };
let transportPollId = 0;
function isDomPreviewActive() { return window.edPreviewMode === 'dom' && !!window.previewEngine; }
function getPreviewWindow() {
  const iframe = window.edPreviewIframe;
  if (!iframe || !iframe.contentWindow) return null;
  try { return iframe.contentWindow; } catch (error) { return null; }
}
function updatePlayButton(playing) {
  const html = playing ? '&#x23F8;' : '&#9654;';
  const mainBtn = document.getElementById('ed-btn-play');
  const heroBtn = document.querySelector('.ed-play-btn');
  if (mainBtn) mainBtn.innerHTML = html;
  if (heroBtn) { heroBtn.innerHTML = html; heroBtn.style.fontSize = playing ? '24px' : '20px'; }
}
function updatePlayhead(currentTime, duration) {
  const playhead = document.querySelector('.ed-tl-playhead');
  if (playhead) playhead.style.left = duration > 0 ? Math.max(0, Math.min(100, currentTime / duration * 100)).toFixed(1) + '%' : '0%';
}
function ensureTransportPlayhead() {
  const tlBody = document.getElementById('ed-tl-body2');
  if (!tlBody || tlBody.querySelector('.ed-tl-playhead')) return;
  const playhead = document.createElement('div');
  playhead.className = 'ed-tl-playhead';
  playhead.style.height = '100%';
  tlBody.style.position = 'relative';
  tlBody.appendChild(playhead);
}
function syncPreviewTransportState(state) {
  const nextState = state || {};
  edPlaybackState.currentTime = Number.isFinite(nextState.currentTime) ? nextState.currentTime : 0;
  edPlaybackState.duration = Number.isFinite(nextState.duration) ? nextState.duration : 0;
  edPlaybackState.isPlaying = !!nextState.isPlaying;
  ensureTransportPlayhead();
  updateEditorPreviewState(edPlaybackState.currentTime, edPlaybackState.duration);
  updatePlayButton(edPlaybackState.isPlaying);
  updatePlayhead(edPlaybackState.currentTime, edPlaybackState.duration);
}
function pollPreviewState() {
  const previewWindow = getPreviewWindow();
  if (!previewWindow) return;
  try { if (typeof previewWindow.__nfState === 'function') syncPreviewTransportState(previewWindow.__nfState()); } catch (error) { return; }
}
function startStatePolling() {
  if (transportPollId || isDomPreviewActive()) return;
  transportPollId = setInterval(pollPreviewState, 50);
}
function stopStatePolling() {
  if (!transportPollId) return;
  clearInterval(transportPollId);
  transportPollId = 0;
}
function bindPreviewStateSource() {
  stopStatePolling();
  if (isDomPreviewActive() && window.previewEngine) return void (window.previewEngine.onStateChange = syncPreviewTransportState);
  if (window.edPreviewMode === 'iframe') startStatePolling();
}
function sendPreviewCmd(action, time) {
  if (isDomPreviewActive()) {
    const engine = window.previewEngine;
    if (!engine) return;
    if (action === 'play' && typeof engine.play === 'function') engine.play();
    else if (action === 'pause' && typeof engine.pause === 'function') engine.pause();
    else if (action === 'toggle') {
      if (typeof engine.toggle === 'function') engine.toggle();
      else if (edPlaybackState.isPlaying && typeof engine.pause === 'function') engine.pause();
      else if (typeof engine.play === 'function') engine.play();
    } else if (action === 'seek' && typeof time === 'number') {
      if (typeof engine.seek === 'function') engine.seek(time);
      else if (typeof engine.compose === 'function') engine.compose(time);
      syncPreviewTransportState({ currentTime: time, duration: edPlaybackState.duration || (typeof getEditorTimelineDuration === 'function' ? getEditorTimelineDuration() : 0), isPlaying: false });
    }
    return;
  }
  const previewWindow = getPreviewWindow();
  if (!previewWindow) return;
  try {
    if (action === 'play' && typeof previewWindow.__nfPlay === 'function') previewWindow.__nfPlay();
    else if (action === 'pause' && typeof previewWindow.__nfPause === 'function') previewWindow.__nfPause();
    else if (action === 'toggle' && typeof previewWindow.__nfToggle === 'function') previewWindow.__nfToggle();
    else if (action === 'seek' && typeof time === 'number' && typeof previewWindow.__nfSeek === 'function') previewWindow.__nfSeek(time);
    else previewWindow.postMessage({ type: 'nf-cmd', action: action, time: time }, '*');
  } catch (error) { previewWindow.postMessage({ type: 'nf-cmd', action: action, time: time }, '*'); }
}
function wireTransportButtons() {
  [
    ['ed-btn-play', function() { sendPreviewCmd('toggle'); }],
    ['ed-btn-start', function() { sendPreviewCmd('seek', 0); }],
    ['ed-btn-end', function() { sendPreviewCmd('seek', edPlaybackState.duration); }],
    ['ed-btn-back5', function() { sendPreviewCmd('seek', Math.max(0, edPlaybackState.currentTime - 5)); }],
    ['ed-btn-fwd5', function() { sendPreviewCmd('seek', edPlaybackState.currentTime + 5); }]
  ].forEach(function(entry) {
    const button = document.getElementById(entry[0]);
    if (button) button.onclick = entry[1];
  });
  const heroBtn = document.querySelector('.ed-play-btn');
  if (heroBtn) heroBtn.onclick = function() { sendPreviewCmd('toggle'); };
}
function wireProgressBar() {
  const bar = document.querySelector('.ed-transport-progress');
  if (!bar) return;
  function seekFromPointer(event) {
    const rect = bar.getBoundingClientRect();
    const pct = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0;
    sendPreviewCmd('seek', pct * edPlaybackState.duration);
  }
  bar.addEventListener('pointerdown', function(event) {
    seekFromPointer(event);
    function onMove(moveEvent) { seekFromPointer(moveEvent); }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}
window.addEventListener('message', function(event) {
  const data = event.data;
  if (data && data.type === 'nf-state') syncPreviewTransportState(data);
});
document.addEventListener('keydown', function(event) {
  if (event.code !== 'Space') return;
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  event.preventDefault();
  sendPreviewCmd('toggle');
});
wireTransportButtons();
wireProgressBar();
window.edPreviewIframe = null;
window.edPreviewMode = window.edPreviewMode || 'none';
window.sendPreviewCmd = sendPreviewCmd;
window.startStatePolling = startStatePolling;
window.stopStatePolling = stopStatePolling;
window.bindPreviewStateSource = bindPreviewStateSource;
window.syncPreviewTransportState = syncPreviewTransportState;
window.ensureTransportPlayhead = ensureTransportPlayhead;
