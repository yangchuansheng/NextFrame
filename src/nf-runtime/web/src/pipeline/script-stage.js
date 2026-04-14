// Pipeline script stage renderer for principles, segment filters, and narration detail rows.
function renderPipelineScript(data) {
  const script = data && data.script;
  if (!script || !script.segments || script.segments.length === 0) {
    return '<div class="pipeline-empty">No script data</div>';
  }

  const principles = script.principles || {};
  const segments = script.segments;
  let html = "";

  html += '<div class="pl-toolbar pl-toolbar-wide">';
  const pKeys = Object.keys(principles);
  for (let p = 0; p < pKeys.length; p++) {
    const key = pKeys[p];
    html += '<div class="pl-chip">';
    html += '<span class="pl-chip-label">' + escHtml(key) + '</span>';
    html += '<span class="pl-chip-val">' + escHtml(principles[key]) + "</span>";
    html += "</div>";
  }
  html += "</div>";

  html += '<div class="pl-divider-h"></div>';

  html += '<div class="pl-toolbar">';
  html += '<span class="pl-seg-label">Segments</span>';
  html += '<span class="pl-seg-pill active" data-seg="-1" data-filter-seg="-1">All</span>';
  for (let s = 0; s < segments.length; s++) {
    html += '<span class="pl-seg-pill" data-seg="' + s + '" data-filter-seg="' + s + '">' + escHtml(String(segments[s].segment)) + "</span>";
  }
  html += "</div>";

  html += '<div class="pl-table-wrap">';
  html += '<table class="pl-table">';
  html += "<thead><tr>";
  html += '<th style="width:55%">Narration</th>';
  html += '<th style="width:45%">Details</th>';
  html += "</tr></thead>";
  html += "<tbody>";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    html += '<tr data-seg="' + i + '">';
    html += '<td class="text" style="width:55%">';
    html += escHtml(seg.narration || "");
    html += "</td>";

    html += '<td class="meta" style="width:45%">';

    if (seg.visual) {
      html += '<div class="pl-meta-item">';
      html += '<div class="pl-meta-label">Visual</div>';
      html += '<div class="pl-meta-value">' + escHtml(seg.visual) + "</div>";
      html += "</div>";
    }

    if (seg.role) {
      html += '<div class="pl-meta-item">';
      html += '<div class="pl-meta-label">Intent</div>';
      html += '<div class="pl-meta-value">' + escHtml(seg.role) + "</div>";
      html += "</div>";
    }

    if (seg.logic) {
      html += '<div class="pl-meta-item">';
      html += '<div class="pl-meta-label">Logic</div>';
      html += '<div class="pl-meta-value italic">' + escHtml(seg.logic) + "</div>";
      html += "</div>";
    }

    html += "</td>";
    html += "</tr>";
  }

  html += "</tbody></table></div>";
  return html;
}

function plFilterSeg(idx) {
  const pills = document.querySelectorAll(".pl-seg-pill");
  for (let i = 0; i < pills.length; i++) {
    const isActive = (idx === -1) ? (i === 0) : (parseInt(pills[i].getAttribute("data-seg"), 10) === idx);
    if (isActive) {
      pills[i].classList.add("active");
    } else {
      pills[i].classList.remove("active");
    }
  }

  const rows = document.querySelectorAll(".pl-table tbody tr[data-seg]");
  for (let r = 0; r < rows.length; r++) {
    rows[r].style.display = (idx === -1 || parseInt(rows[r].getAttribute("data-seg"), 10) === idx) ? "" : "none";
  }
}
