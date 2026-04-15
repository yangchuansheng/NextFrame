// Transport controls — drives previewEngine exclusively. No iframe.
const edPlaybackState = { currentTime: 0, duration: 0, isPlaying: false };
function updatePlayButton(playing) {
  const playSvg = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><polygon points="5,3 15,9 5,15" fill="currentColor"/></svg>';
  const pauseSvg = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor"/></svg>';
  const heroPlaySvg = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><polygon points="7,4 17,11 7,18" fill="currentColor"/></svg>';
  const heroPauseSvg = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="5" y="4" width="4" height="14" rx="1" fill="currentColor"/><rect x="13" y="4" width="4" height="14" rx="1" fill="currentColor"/></svg>';
  const mainBtn = document.getElementById('ed-btn-play');
  const heroBtn = document.querySelector('.ed-play-btn');
  if (mainBtn) mainBtn.innerHTML = playing ? pauseSvg : playSvg;
  if (heroBtn) heroBtn.innerHTML = playing ? heroPauseSvg : heroPlaySvg;
}
function updatePlayhead(currentTime, duration) {
  const playhead = document.getElementById('ed-tl-playhead2');
  if (!playhead) return;
  const timeline = playhead.parentElement;
  if (!timeline) return;
  const trackWidth = timeline.clientWidth - 100;
  const pct = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  playhead.style.left = (100 + pct * trackWidth) + 'px';
}
function updateTransportThumb(currentTime, duration) {
  const thumb = document.querySelector('.ed-transport-thumb');
  if (thumb) {
    const pct = duration > 0 ? Math.max(0, Math.min(100, currentTime / duration * 100)) : 0;
    thumb.style.left = pct.toFixed(1) + '%';
  }
}
function syncPreviewTransportState(state) {
  const nextState = state || {};
  edPlaybackState.currentTime = Number.isFinite(nextState.currentTime) ? nextState.currentTime : 0;
  edPlaybackState.duration = Number.isFinite(nextState.duration) ? nextState.duration : 0;
  edPlaybackState.isPlaying = !!nextState.isPlaying;
  updateEditorPreviewState(edPlaybackState.currentTime, edPlaybackState.duration);
  updatePlayButton(edPlaybackState.isPlaying);
  updatePlayhead(edPlaybackState.currentTime, edPlaybackState.duration);
  updateTransportThumb(edPlaybackState.currentTime, edPlaybackState.duration);
}
function bindPreviewStateSource() {
  if (window.previewEngine) {
    window.previewEngine.onStateChange = syncPreviewTransportState;
  }
}
function sendPreviewCmd(action, time) {
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
document.addEventListener('keydown', function(event) {
  if (event.code !== 'Space') return;
  const tag = event.target && event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  event.preventDefault();
  sendPreviewCmd('toggle');
});
wireTransportButtons();
wireProgressBar();
window.edPreviewMode = window.edPreviewMode || 'none';
window.sendPreviewCmd = sendPreviewCmd;
window.bindPreviewStateSource = bindPreviewStateSource;
window.syncPreviewTransportState = syncPreviewTransportState;
