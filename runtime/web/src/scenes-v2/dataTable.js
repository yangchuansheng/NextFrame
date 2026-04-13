import { toNumber, clamp, normalizeArray, createRoot, SANS_FONT_STACK } from "../scenes-v2-shared.js";

const DEFAULT_HEADERS = ["Name", "Score", "Status"];
const DEFAULT_ROWS = [["Alice", 95, "Pass"], ["Bob", 82, "Pass"], ["Carol", 67, "Fail"]];

function statusColor(val) {
  const s = String(val).toLowerCase();
  if (s === "pass" || s === "ok" || s === "yes" || s === "true") return "#4ade80";
  if (s === "fail" || s === "error" || s === "no" || s === "false") return "#f87171";
  return null;
}

export default {
  id: "dataTable",
  type: "dom",
  name: "Data Table",
  category: "Data Viz",
  tags: ["table", "data", "stagger", "animation", "grid", "list"],
  description: "动画数据表格，行逐个从下方滑入并淡入，Status 列自动着色 Pass=绿 Fail=红",
  params: {
    headers:     { type: "array",  default: DEFAULT_HEADERS, desc: "表头" },
    rows:        { type: "array",  default: DEFAULT_ROWS,    desc: "数据行" },
    stagger:     { type: "number", default: 0.08,            desc: "行间延迟", min: 0, max: 0.5 },
    accentColor: { type: "string", default: "#6ee7ff",       desc: "强调色" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const root = createRoot(container, "display:flex;align-items:center;justify-content:center;padding:40px");

    const headers = normalizeArray(params.headers, DEFAULT_HEADERS);
    const rows = normalizeArray(params.rows, DEFAULT_ROWS);
    const accent = params.accentColor || "#6ee7ff";

    const table = document.createElement("table");
    table.style.cssText = [
      "border-collapse:collapse",
      `font-family:${SANS_FONT_STACK}`,
      "font-size:18px",
      "color:#e2e8f0",
      "min-width:50%",
      "max-width:90%",
    ].join(";");

    // thead
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = String(h);
      th.style.cssText = [
        "padding:12px 24px",
        "text-align:left",
        "font-weight:700",
        "letter-spacing:0.04em",
        "text-transform:uppercase",
        "font-size:13px",
        `color:${accent}`,
        `border-bottom:2px solid ${accent}`,
      ].join(";");
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // tbody
    const tbody = document.createElement("tbody");
    const rowEls = [];
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.style.cssText = "opacity:0;transform:translateY(20px);will-change:transform,opacity";
      const cells = normalizeArray(row, []);
      cells.forEach((val) => {
        const td = document.createElement("td");
        td.textContent = String(val);
        const sc = statusColor(val);
        td.style.cssText = [
          "padding:10px 24px",
          "border-bottom:1px solid rgba(255,255,255,0.08)",
          sc ? `color:${sc};font-weight:700` : "",
        ].filter(Boolean).join(";");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
      rowEls.push(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);

    return { root, rowEls };
  },

  update(els, localT, params) {
    const stagger = toNumber(params.stagger, 0.08);
    els.rowEls.forEach((tr, i) => {
      const delay = 0.1 + i * stagger;
      const progress = clamp((localT - delay) / 0.15, 0, 1);
      // ease out cubic
      const eased = 1 - ((1 - progress) ** 3);
      const y = (1 - eased) * 20;
      tr.style.opacity = String(eased);
      tr.style.transform = `translateY(${y}px)`;
    });
  },

  destroy(els) { els.root.remove(); },
};
