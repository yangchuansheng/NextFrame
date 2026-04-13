/* === pipeline/audio-stage.js === */
function renderPipelineAudio(data) {
  var voice = escHtml(data.audio.voice);
  var speed = data.audio.speed;
  var segments = data.audio.segments;
  var scriptSegments = data.script.segments;

  var generated = segments.filter(function(seg) {
    return seg.status === "generated";
  });
  var totalDuration = generated.reduce(function(sum, seg) {
    return sum + (seg.duration || 0);
  }, 0);

  var html = '<div class="pl-toolbar">';
  html += '<div class="pl-chip pl-chip-accent"><span class="pl-chip-label">声线</span><span class="pl-chip-val">' + voice + "</span></div>";
  html += '<div class="pl-chip"><span class="pl-chip-label">语速</span><span class="pl-chip-val">' + speed.toFixed(1) + "x</span></div>";
  html += '<div class="pl-chip pl-chip-green"><span class="pl-chip-label">已生成</span><span class="pl-chip-val">' + generated.length + "/" + segments.length + "</span></div>";
  html += '<div class="pl-chip"><span class="pl-chip-label">总时长</span><span class="pl-chip-val">' + totalDuration.toFixed(1) + "s</span></div>";
  html += '<div class="pl-divider"></div>';
  html += '<span class="pl-seg-pill active" data-seg="-1" data-filter-seg="-1">全部</span>';
  for (var i = 0; i < segments.length; i++) {
    html += '<span class="pl-seg-pill" data-seg="' + i + '" data-filter-seg="' + i + '">段 ' + (i + 1) + "</span>";
  }
  html += "</div>";

  html += "<div class=\"pl-table\"><table><thead><tr>";
  html += '<th style="width:45%">文案</th>';
  html += '<th style="width:55%">音频</th>';
  html += "</tr></thead><tbody>";

  for (var segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    var seg = segments[segmentIndex];
    var script = scriptSegments[segmentIndex];
    var isGenerated = seg.status === "generated";
    var trClass = isGenerated ? "" : ' class="seg-pending"';

    html += '<tr data-seg="' + segmentIndex + '"' + trClass + ">";
    html += '<td class="col-text">' + escHtml(script.narration) + "</td>";
    html += '<td class="col-audio">';
    html += '<div class="audio-head">';

    if (isGenerated) {
      var audioPath = seg.file ? ("~/NextFrame/projects/" + currentProject + "/" + currentEpisode + "/" + seg.file) : null;
      if (audioPath) {
        html += '<button class="pl-play-btn" data-audio-path="' + escHtml(audioPath) + '">&#9654;</button>';
      }
      html += '<span class="pl-tag-generated">已生成</span>';
      html += '<span class="audio-duration">' + seg.duration.toFixed(1) + "s</span>";
    } else {
      html += '<span class="pl-tag-pending">待生成</span>';
    }

    html += "</div>";

    if (isGenerated && seg.sentences && seg.sentences.length > 0) {
      html += '<div class="sentence-list">';
      for (var sentenceIndex = 0; sentenceIndex < seg.sentences.length; sentenceIndex++) {
        var sentence = seg.sentences[sentenceIndex];
        var startFmt = fmtTime(sentence.start);
        var endFmt = fmtTime(sentence.end);
        var duration = (sentence.end - sentence.start).toFixed(1);

        html += '<div class="sentence-row">';
        html += '<span class="s-timecode">' + startFmt + ' <span class="s-arrow">&rarr;</span> ' + endFmt + "</span>";
        html += '<span class="s-text">' + renderPipelineKaraokeSentence(sentence) + "</span>";
        html += '<span class="s-dur">' + duration + "s</span>";
        html += "</div>";
      }
      html += "</div>";
    }

    html += "</td></tr>";
  }

  html += "</tbody></table></div>";
  return html;
}

function fmtTime(sec) {
  var minutes = Math.floor(sec / 60);
  var seconds = sec % 60;
  var mm = (minutes < 10 ? "0" : "") + minutes;
  var whole = Math.floor(seconds);
  var frac = Math.round((seconds - whole) * 10);
  var ss = (whole < 10 ? "0" : "") + whole;
  return mm + ":" + ss + "." + frac;
}

function renderPipelineKaraokeSentence(sentence) {
  if (!sentence || !sentence.words || sentence.words.length === 0) {
    return escHtml((sentence && sentence.text) || "");
  }

  var html = "";
  for (var i = 0; i < sentence.words.length; i++) {
    var word = sentence.words[i] || {};
    var charText = word.char == null ? "" : String(word.char);
    if (!charText) {
      continue;
    }
    html += '<span class="karaoke-char unspoken" data-start="' + escHtml(String(word.start == null ? 0 : word.start)) + '" data-end="' + escHtml(String(word.end == null ? 0 : word.end)) + '">' + escHtml(charText) + "</span>";
  }

  return html || escHtml(sentence.text || "");
}
