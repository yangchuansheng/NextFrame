/* === pipeline/output-stage.js === */
function renderPipelineOutput(data) {
  var outputs = (data.outputs || []).slice().sort(function(left, right) {
    return right.id - left.id;
  });
  var html = '<div class="pl-outputs">';

  html += '<div class="count-bar"><span>' + escHtml(String(outputs.length)) + " 个版本</span></div>";

  for (var i = 0; i < outputs.length; i++) {
    var output = outputs[i];
    var specs = output.specs || {};
    var published = output.published || [];
    var dateStr = "";
    if (output.date) {
      var date = new Date(output.date);
      var mm = String(date.getMonth() + 1).padStart(2, "0");
      var dd = String(date.getDate()).padStart(2, "0");
      var hh = String(date.getHours()).padStart(2, "0");
      var mi = String(date.getMinutes()).padStart(2, "0");
      dateStr = date.getFullYear() + "-" + mm + "-" + dd + " " + hh + ":" + mi;
    }

    html += '<div class="pl-output-card">';
    html += '<div class="pl-output-thumb"><span class="v-thumb-play">&#x25B6;</span></div>';
    html += '<div class="pl-output-info">';
    html += '<div class="pl-output-name">' + escHtml(output.name || "") + "</div>";
    html += '<div class="pl-output-date">' + escHtml(dateStr) + "</div>";

    html += '<div class="pl-output-specs">';
    if (specs.width && specs.height) {
      html += '<span class="spec-tag pl-spec-res">' + escHtml(specs.width + "×" + specs.height) + "</span>";
    }
    if (specs.fps) {
      html += '<span class="spec-tag pl-spec-fps">' + escHtml(specs.fps + "fps") + "</span>";
    }
    if (specs.codec) {
      html += '<span class="spec-tag pl-spec-codec">' + escHtml(specs.codec) + "</span>";
    }
    if (output.duration != null) {
      html += '<span class="spec-tag pl-spec-dur">' + escHtml(output.duration + "s") + "</span>";
    }
    if (output.size) {
      html += '<span class="spec-tag pl-spec-size">' + escHtml(output.size) + "</span>";
    }
    html += "</div>";

    if (output.changes) {
      html += '<div class="pl-output-changes">' + escHtml(output.changes) + "</div>";
    }
    if (output.file) {
      html += '<div class="pl-meta-path">' + escHtml(output.file) + "</div>";
    }
    html += "</div>";

    html += '<div class="pl-output-status">';
    if (published.length > 0) {
      for (var j = 0; j < published.length; j++) {
        html += '<span class="pl-tag-published">' + escHtml(published[j].platform) + " ✓</span>";
      }
    } else {
      html += '<span class="pl-tag-unpublished">未发布</span>';
    }
    html += "</div>";
    html += "</div>";
  }

  html += "</div>";
  return html;
}
