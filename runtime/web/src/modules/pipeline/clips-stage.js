/* === pipeline/clips-stage.js — sidebar + detail layout === */
function renderPipelineClips(data) {
  var videos = (data.atoms || []).filter(function(a) { return a.type === "video"; });
  if (videos.length === 0) return '<div class="pipeline-empty">暂无素材 — nextframe atom-add --type=video</div>';

  var sideItems = videos.map(function(v, i) {
    var dur = typeof v.duration === "number" ? v.duration.toFixed(1) + "s" : "";
    var vPath = v.file ? ("~/NextFrame/projects/" + currentProject + "/" + currentEpisode + "/" + v.file) : null;
    return '<div data-clips-idx="' + i + '" style="cursor:pointer;border:1px solid ' + (i === 0 ? "rgba(124,106,239,0.25)" : "transparent") + ';margin-bottom:4px;border-radius:6px;overflow:hidden;background:' + (i === 0 ? "rgba(124,106,239,0.03)" : "transparent") + '">' +
      '<div style="aspect-ratio:16/9;background:#0a0a0c;display:flex;align-items:center;justify-content:center">' +
        (vPath ? '<button class="pl-play-btn" style="width:28px;height:28px;font-size:11px" data-video-path="' + escHtml(vPath) + '">&#9654;</button>' : '') +
      '</div>' +
      '<div style="padding:8px 10px">' +
        '<div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(v.name) + '</div>' +
        '<div style="font-family:monospace;font-size:11px;color:rgba(228,228,232,0.5)">' + dur + '</div>' +
      '</div>' +
    '</div>';
  }).join("");

  var detailHtml = renderClipDetail(videos[0]);

  return '<div style="display:flex;height:100%">' +
    '<div style="width:240px;flex-shrink:0;border-right:1px solid rgba(255,255,255,0.06);overflow-y:auto;background:#111114">' +
      '<div style="padding:12px 14px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(228,228,232,0.25);border-bottom:1px solid rgba(255,255,255,0.06)">SOURCES &middot; ' + videos.length + '</div>' +
      '<div style="padding:6px">' + sideItems + '</div>' +
    '</div>' +
    '<div id="clips-detail" style="flex:1;overflow-y:auto">' + detailHtml + '</div>' +
  '</div>';
}

function renderClipDetail(v) {
  if (!v) return '<div style="padding:40px;text-align:center;color:rgba(228,228,232,0.25)">选择素材查看详情</div>';
  var dur = typeof v.duration === "number" ? v.duration.toFixed(1) + "s" : "";
  var vPath = v.file ? ("~/NextFrame/projects/" + currentProject + "/" + currentEpisode + "/" + v.file) : "";

  var specs = '<span class="pl-spec-dur">' + dur + '</span> ';
  if (v.segment) specs += '<span style="font-size:11px;padding:3px 10px;border-radius:4px;background:rgba(124,106,239,0.15);color:#7c6aef;font-family:monospace">段 ' + v.segment + '</span> ';

  var status = '';
  status += (v.subtitles && v.subtitles.length) ? '<span class="pl-tag-generated" style="background:rgba(224,160,64,0.12);color:#e0a040">字幕 ✓</span> ' : '<span class="pl-tag-pending">无字幕</span> ';
  status += v.hasTl ? '<span class="pl-tag-generated" style="background:rgba(124,106,239,0.1);color:#7c6aef">时间轴 ✓</span> ' : '<span class="pl-tag-pending">无时间轴</span> ';

  return '<div style="padding:20px">' +
    '<div style="font-size:16px;font-weight:500;margin-bottom:4px">' + escHtml(v.name) + '</div>' +
    '<div style="font-family:monospace;font-size:12px;color:rgba(228,228,232,0.5);margin-bottom:12px;user-select:all">' + escHtml(vPath) + '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">' + specs + status + '</div>' +
    '<div style="aspect-ratio:16/9;max-width:640px;background:#050508;border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:16px">' +
      (vPath ? '<button class="pl-play-btn" style="width:48px;height:48px;font-size:18px" data-video-path="' + escHtml(vPath) + '">&#9654;</button>' : '') +
    '</div>' +
    '<div style="display:flex;gap:20px;flex-wrap:wrap">' +
      '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(228,228,232,0.25);margin-bottom:2px">FILE</div><div style="font-family:monospace;font-size:12px;color:rgba(228,228,232,0.75)">' + escHtml(v.file || '') + '</div></div>' +
      '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(228,228,232,0.25);margin-bottom:2px">DURATION</div><div style="font-family:monospace;font-size:12px;color:rgba(228,228,232,0.75)">' + dur + '</div></div>' +
      (v.segment ? '<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(228,228,232,0.25);margin-bottom:2px">SEGMENT</div><div style="font-size:12px;color:#7c6aef">段 ' + v.segment + '</div></div>' : '') +
    '</div>' +
  '</div>';
}
