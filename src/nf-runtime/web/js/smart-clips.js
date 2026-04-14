// 智能切片 Tab — matches clips-d-final.html prototype
let scSources = [];
let scActiveSource = 0;
let scClips = [];
let scSentences = {};

function scEscape(v) { return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function scTc(s) { if (typeof s !== 'number') return '00:00.0'; const m = Math.floor(s / 60); return String(m).padStart(2,'0') + ':' + (s % 60).toFixed(1).padStart(4,'0'); }
function scNfUrl(path) { if (!path) return ''; const i = path.indexOf('/projects/'); return i >= 0 ? 'nfdata://localhost/' + encodeURI(path.substring(i + '/projects/'.length)) : path; }

function loadSmartClips() {
  if (typeof bridgeCall !== 'function' || !window.currentEpisodePath) return;
  const ep = window.currentEpisodePath;
  const srcDir = ep + '/sources';

  Promise.all([
    bridgeCall('fs.listDir', { path: srcDir }).catch(function() { return { entries: [] }; }),
    bridgeCall('source.clips', { episode: ep }).catch(function() { return { clips: [] }; })
  ]).then(function(r) {
    const entries = r[0].entries || [];
    scClips = r[1].clips || [];

    const vExts = ['.mp4','.mov','.webm','.mkv'];
    const videos = entries.filter(function(e) { return e.name && vExts.some(function(x) { return e.name.endsWith(x); }); });
    const sents = entries.filter(function(e) { return e.name && e.name.endsWith('-sentences.json'); });

    scSources = videos.map(function(v) {
      const base = v.name.replace(/\.[^.]+$/, '');
      const sf = sents.find(function(s) { return s.name.startsWith(base); });
      return { name: v.name, path: srcDir + '/' + v.name, sentencesPath: sf ? srcDir + '/' + sf.name : null };
    });

    scRenderSidebar();
    if (scSources.length > 0) scSelectSource(0);
    else scRenderMain();
  });
}

function scSelectSource(i) {
  scActiveSource = i;
  scRenderSidebar();
  const src = scSources[i];
  if (src && src.sentencesPath) {
    bridgeCall('fs.read', { path: src.sentencesPath }).then(function(d) {
      const raw = d.contents || d.content || '';
      try { scSentences = typeof raw === 'object' ? raw : JSON.parse(raw); } catch(e) { scSentences = {}; }
      scRenderMain();
    }).catch(function() { scSentences = {}; scRenderMain(); });
  } else {
    scSentences = {};
    scRenderMain();
  }
}

function scRenderSidebar() {
  const el = document.querySelector('#pl-tab-asset .pl-sidebar');
  if (!el) return;
  let h = '<div style="padding:16px 16px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--t50)">源视频</div>';
  if (!scSources.length) { h += '<div style="padding:16px;font-size:13px;color:var(--t50)">暂无源视频</div>'; }
  scSources.forEach(function(s, idx) {
    h += '<div class="sc-src-item' + (idx === scActiveSource ? ' active' : '') + '" data-nf-action="select-source" onclick="scSelectSource(' + idx + ')">' +
      '<div class="sc-src-name">' + scEscape(s.name) + '</div>' +
      '<div class="sc-src-meta"><span>' + scEscape(s.duration || '—') + '</span><span>' + scEscape(s.resolution || '—') + '</span></div>' +
      '<div class="sc-src-clips-count">' + (scSentences.total_sentences || 0) + ' 句 · ' + scClips.length + ' clips</div>' +
    '</div>';
  });
  el.innerHTML = h;
}

function scRenderMain() {
  const el = document.querySelector('#pl-tab-asset .pl-main');
  if (!el) return;
  const src = scSources[scActiveSource];
  if (!src) { el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--t50)">暂无源视频</div>'; return; }

  const allSents = (scSentences && scSentences.sentences) || [];
  let h = '';

  // Detail header (glass)
  h += '<div class="glass sc-detail-header"><div class="sc-detail-top">' +
    '<div class="sc-detail-name">' + scEscape(src.name) + '</div>' +
    '<button class="sc-preview-btn" data-nf-action="preview-source" onclick="scOpenPlayer(-1)">&#9654; 预览原视频</button>' +
  '</div>' +
  '<div class="sc-detail-path">' + scEscape(decodeURI(scNfUrl(src.path)).replace('nfdata://localhost/', '~/NextFrame/projects/')) + '</div>' +
  '<div class="sc-detail-tags">' +
    (allSents.length ? '<span class="sc-tag sc-tag-accent">' + allSents.length + ' sentences</span>' : '') +
    '<span class="sc-tag sc-tag-accent">' + scClips.length + ' clips</span>' +
  '</div></div>';

  // Timeline (glass)
  if (scClips.length > 0) {
    const colors = ['var(--accent)','#60a5fa','var(--green)','#f472b6','var(--warm)'];
    h += '<div class="glass sc-timeline"><div class="sc-tl-label">时间轴 · 切片分布</div><div class="sc-tl-bar">';
    scClips.forEach(function(c, i) {
      const left = (i / scClips.length * 80 + 5);
      const width = Math.max(3, 70 / scClips.length);
      h += '<div class="sc-tl-region" style="left:' + left + '%;width:' + width + '%;background:' + colors[i % colors.length] + '" title="' + scEscape(c.name) + '"><span class="sc-tl-region-label">' + (i+1) + '</span></div>';
    });
    h += '</div><div class="sc-tl-ticks"><span class="sc-tl-tick">0:00</span><span class="sc-tl-tick">end</span></div></div>';
  }

  // Clip cards
  h += '<div class="sc-clip-scroll">';
  if (!scClips.length) {
    h += '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--t50)">暂无切片</div>';
  }
  scClips.forEach(function(clip, i) {
    const url = scNfUrl(clip.path || '');
    const sizeMB = clip.size ? (clip.size / 1024 / 1024).toFixed(1) + 'MB' : '';
    // Get sentences for this clip (distribute evenly for now)
    const perClip = Math.max(1, Math.floor(allSents.length / Math.max(1, scClips.length)));
    const clipSents = allSents.slice(i * perClip, (i + 1) * perClip).slice(0, 4);

    h += '<div class="sc-clip-card glass" id="sc-clip-' + i + '">';
    // Top row
    h += '<div class="sc-clip-top"><div class="sc-clip-num">' + (i+1) + '</div>' +
      '<div class="sc-clip-name">' + scEscape(clip.name) + '</div>' +
      (sizeMB ? '<div class="sc-clip-dur">' + scEscape(sizeMB) + '</div>' : '') +
    '</div>';

    // Body: video + sentences
    h += '<div class="sc-clip-body">';

    // Video thumbnail
    h += '<div class="sc-clip-video" data-nf-action="preview-clip" onclick="scOpenPlayer(' + i + ')">' +
      (url ? '<video src="' + scEscape(url) + '" preload="metadata"></video>' : '') +
      '<div class="sc-play-overlay"><div class="sc-play-circle">&#9654;</div></div>' +
    '</div>';

    // Sentences with multi-lang
    h += '<div class="sc-sentences">';
    if (clipSents.length > 0) {
      clipSents.forEach(function(s) {
        const dur = ((s.end || 0) - (s.start || 0)).toFixed(1);
        h += '<div class="sc-sent-row">' +
          '<span class="sc-sent-tc">' + scTc(s.start) + '</span>' +
          '<div class="sc-sent-content">' +
            '<div class="sc-sent-lang-row"><span class="sc-sent-lang-label">EN</span><span class="sc-sent-text">' + scEscape(s.text) + '</span></div>' +
            (s.zh ? '<div class="sc-sent-lang-row"><span class="sc-sent-lang-label">中</span><span class="sc-sent-trans">' + scEscape(s.zh) + '</span></div>' : '') +
            (s.ja ? '<div class="sc-sent-lang-row"><span class="sc-sent-lang-label">日</span><span class="sc-sent-trans">' + scEscape(s.ja) + '</span></div>' : '') +
          '</div>' +
          '<span class="sc-sent-dur">' + dur + 's</span>' +
        '</div>';
      });
    } else {
      h += '<div style="padding:8px;font-size:12px;color:var(--t50)">无字幕数据</div>';
    }
    h += '</div></div>';

    // Meta bar
    h += '<div class="sc-meta-bar"><span class="sc-meta-tag">clip ' + (i+1) + '</span>' +
      '<button class="sc-more-btn" data-nf-action="clip-meta" onclick="scOpenMeta(' + i + ')">更多 ↗</button></div>';
    h += '</div>';
  });
  h += '</div>';

  el.innerHTML = h;
}

// Player modal
function scOpenPlayer(clipIdx) {
  let modal = document.getElementById('sc-player-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sc-player-modal';
    modal.className = 'sc-modal-overlay';
    modal.onclick = function(e) { if (e.target === modal) scClosePlayer(); };
    document.body.appendChild(modal);
  }

  let videoUrl, title;
  if (clipIdx < 0) {
    const src = scSources[scActiveSource];
    if (!src) return;
    videoUrl = scNfUrl(src.path);
    title = src.name;
  } else {
    const clip = scClips[clipIdx];
    if (!clip) return;
    videoUrl = scNfUrl(clip.path);
    title = clip.name;
  }

  const allSents = (scSentences && scSentences.sentences) || [];
  const perClip = Math.max(1, Math.floor(allSents.length / Math.max(1, scClips.length)));
  const clipSents = clipIdx >= 0 ? allSents.slice(clipIdx * perClip, (clipIdx + 1) * perClip) : [];

  modal.innerHTML = '<div class="sc-modal-player glass">' +
    '<div style="width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#0a0a0f">' +
      '<video id="sc-modal-video" src="' + scEscape(videoUrl) + '" controls autoplay style="width:100%;height:100%;object-fit:contain"></video>' +
    '</div>' +
    '<div class="sc-modal-subtitle" id="sc-modal-subs"></div>' +
    '<div class="sc-modal-transport"><div style="display:flex;align-items:center;justify-content:center;padding:8px 0"><span class="sc-modal-clip-name">' + scEscape(title) + '</span></div></div>' +
    '<button class="sc-modal-close" onclick="scClosePlayer()">&times;</button>' +
  '</div>';
  modal.classList.add('open');

  // Setup subtitle sync
  const video = document.getElementById('sc-modal-video');
  if (video && clipSents.length > 0) {
    let raf = null;
    function tick() {
      const t = video.currentTime;
      const subsEl = document.getElementById('sc-modal-subs');
      if (!subsEl) return;
      let active = null;
      clipSents.forEach(function(s) { if (t >= (s.start || 0) && t < (s.end || 0)) active = s; });
      if (active) {
        let sh = '<div class="sc-modal-sub-lang-row"><span class="sc-modal-sub-lang-label">EN</span><span class="sc-modal-sub-original">' + scEscape(active.text) + '</span></div>';
        if (active.zh) sh += '<div class="sc-modal-sub-lang-row"><span class="sc-modal-sub-lang-label">中</span><span class="sc-modal-sub-trans">' + scEscape(active.zh) + '</span></div>';
        if (active.ja) sh += '<div class="sc-modal-sub-lang-row"><span class="sc-modal-sub-lang-label">日</span><span class="sc-modal-sub-trans">' + scEscape(active.ja) + '</span></div>';
        subsEl.innerHTML = sh;
      } else {
        subsEl.innerHTML = '<div class="sc-modal-sub-lang-row"><span class="sc-modal-sub-original" style="color:var(--t50)">···</span></div>';
      }
      if (!video.paused && !video.ended) raf = requestAnimationFrame(tick);
    }
    video.onplay = function() { raf = requestAnimationFrame(tick); };
    video.onpause = function() { if (raf) cancelAnimationFrame(raf); };
    video.onended = function() { if (raf) cancelAnimationFrame(raf); };
  }
}

function scClosePlayer() {
  const modal = document.getElementById('sc-player-modal');
  if (!modal) return;
  const v = document.getElementById('sc-modal-video');
  if (v) v.pause();
  modal.classList.remove('open');
}

// Meta modal
function scOpenMeta(i) {
  const clip = scClips[i];
  if (!clip) return;
  let modal = document.getElementById('sc-meta-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sc-meta-modal';
    modal.className = 'sc-meta-overlay';
    modal.onclick = function(e) { if (e.target === modal) scCloseMeta(); };
    document.body.appendChild(modal);
  }
  let h = '<div class="sc-meta-modal glass"><div class="sc-meta-title">' + scEscape(clip.name) + ' · 元信息</div>' +
    '<button class="sc-modal-close" onclick="scCloseMeta()">&times;</button>';
  Object.keys(clip).forEach(function(k) {
    const v = clip[k];
    const d = Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v));
    h += '<div class="sc-meta-row"><span class="sc-meta-key">' + scEscape(k) + '</span><span class="sc-meta-val">' + scEscape(d) + '</span></div>';
  });
  h += '</div>';
  modal.innerHTML = h;
  modal.classList.add('open');
}

function scCloseMeta() {
  const modal = document.getElementById('sc-meta-modal');
  if (modal) modal.classList.remove('open');
}

window.loadSmartClips = loadSmartClips;
window.scSelectSource = scSelectSource;
window.scOpenPlayer = scOpenPlayer;
window.scClosePlayer = scClosePlayer;
window.scOpenMeta = scOpenMeta;
window.scCloseMeta = scCloseMeta;
