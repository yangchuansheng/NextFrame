import { clamp, easeOutCubic, toNumber, normalizeArray } from "../scenes-v2-shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const FONT = '-apple-system, "SF Pro Display", sans-serif';
const PALETTE = ["#6ee7ff", "#a78bfa", "#f472b6", "#fb923c", "#4ade80", "#fbbf24"];

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export default {
  id: "sankeyDiagram",
  type: "svg",
  name: "Sankey Diagram",
  category: "Diagrams",
  tags: ["sankey", "flow", "diagram", "data", "distribution", "connections"],
  description: "桑基图，左侧节点通过带宽度的曲线流向右侧节点，展示流量分布",
  params: {
    nodes:  { type: "array", default: [{id:"a",label:"Source A"},{id:"b",label:"Source B"},{id:"c",label:"Source C"},{id:"x",label:"Target X"},{id:"y",label:"Target Y"},{id:"z",label:"Target Z"}], desc: "节点数组 [{id,label}]" },
    links:  { type: "array", default: [{from:"a",to:"x",value:30},{from:"a",to:"y",value:20},{from:"b",to:"x",value:15},{from:"b",to:"z",value:35},{from:"c",to:"y",value:25},{from:"c",to:"z",value:10}], desc: "连接数组 [{from,to,value}]" },
    colors: { type: "array", default: PALETTE, desc: "颜色数组" },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const svg = svgEl("svg", {
      viewBox: "0 0 1920 1080",
      style: "position:absolute;inset:0;width:100%;height:100%",
    });
    container.appendChild(svg);

    const nodes = normalizeArray(params.nodes, this.params.nodes.default);
    const links = normalizeArray(params.links, this.params.links.default);
    const colors = normalizeArray(params.colors, PALETTE);

    // separate left/right nodes
    const rightIds = new Set(links.map((l) => l.to));
    const leftIds = new Set(links.map((l) => l.from));
    const leftNodes = nodes.filter((n) => leftIds.has(n.id) && !rightIds.has(n.id));
    const rightNodes = nodes.filter((n) => rightIds.has(n.id));

    // fallback if separation fails
    if (leftNodes.length === 0 || rightNodes.length === 0) {
      const half = Math.ceil(nodes.length / 2);
      leftNodes.length = 0;
      rightNodes.length = 0;
      nodes.forEach((n, i) => (i < half ? leftNodes : rightNodes).push(n));
    }

    const padL = 200, padR = 200, padT = 120, padB = 120;
    const chartH = 1080 - padT - padB;
    const nodeW = 30;
    const leftX = padL;
    const rightX = 1920 - padR - nodeW;

    // compute node totals
    const nodeTotal = {};
    for (const n of nodes) nodeTotal[n.id] = 0;
    for (const l of links) {
      const v = toNumber(l.value, 1);
      nodeTotal[l.from] = (nodeTotal[l.from] || 0) + v;
      nodeTotal[l.to] = (nodeTotal[l.to] || 0) + v;
    }

    // layout nodes vertically
    function layoutColumn(col, x) {
      const total = col.reduce((s, n) => s + (nodeTotal[n.id] || 1), 0);
      const gap = 20;
      const available = chartH - gap * (col.length - 1);
      let y = padT;
      return col.map((n, i) => {
        const h = Math.max(10, ((nodeTotal[n.id] || 1) / total) * available);
        const pos = { id: n.id, label: n.label, x, y, h };
        y += h + gap;
        return pos;
      });
    }

    const leftLayout = layoutColumn(leftNodes, leftX);
    const rightLayout = layoutColumn(rightNodes, rightX);
    const posMap = {};
    for (const n of leftLayout) posMap[n.id] = n;
    for (const n of rightLayout) posMap[n.id] = n;

    // track offsets for stacking links within nodes
    const leftOffset = {};
    const rightOffset = {};
    for (const n of leftLayout) leftOffset[n.id] = 0;
    for (const n of rightLayout) rightOffset[n.id] = 0;

    // draw nodes
    const nodeRects = [];
    [...leftLayout, ...rightLayout].forEach((n, i) => {
      const rect = svgEl("rect", {
        x: String(n.x), y: String(n.y),
        width: String(nodeW), height: String(n.h),
        rx: "4", fill: colors[i % colors.length], opacity: "0",
      });
      svg.appendChild(rect);

      const isLeft = leftLayout.includes(n);
      const txt = svgEl("text", {
        x: String(isLeft ? n.x - 12 : n.x + nodeW + 12),
        y: String(n.y + n.h / 2 + 5),
        fill: "rgba(255,255,255,0.7)", "font-size": "20",
        "font-family": FONT, "text-anchor": isLeft ? "end" : "start",
        opacity: "0",
      });
      txt.textContent = n.label || n.id;
      svg.appendChild(txt);
      nodeRects.push({ rect, txt });
    });

    // draw links
    const linkPaths = links.map((l, i) => {
      const src = posMap[l.from];
      const tgt = posMap[l.to];
      if (!src || !tgt) return null;

      const total = nodeTotal[l.from] || 1;
      const tgtTotal = nodeTotal[l.to] || 1;
      const val = toNumber(l.value, 1);
      const srcH = (val / total) * src.h;
      const tgtH = (val / tgtTotal) * tgt.h;
      const bandwidth = Math.max(srcH, tgtH, 2);

      const sy = src.y + (leftOffset[l.from] || 0) + srcH / 2;
      const ty = tgt.y + (rightOffset[l.to] || 0) + tgtH / 2;
      leftOffset[l.from] = (leftOffset[l.from] || 0) + srcH;
      rightOffset[l.to] = (rightOffset[l.to] || 0) + tgtH;

      const sx = src.x + nodeW;
      const tx = tgt.x;
      const cpx = (sx + tx) / 2;

      const path = svgEl("path", {
        d: `M ${sx} ${sy} C ${cpx} ${sy}, ${cpx} ${ty}, ${tx} ${ty}`,
        fill: "none",
        stroke: colors[i % colors.length],
        "stroke-width": String(bandwidth),
        "stroke-opacity": "0",
        "stroke-linecap": "butt",
      });
      svg.appendChild(path);
      return { path };
    }).filter(Boolean);

    return { svg, nodeRects, linkPaths };
  },

  update(els, localT) {
    // nodes fade in
    els.nodeRects.forEach((n, i) => {
      const t = clamp((localT - i * 0.03) / 0.4, 0, 1);
      n.rect.setAttribute("opacity", String(t * 0.85));
      n.txt.setAttribute("opacity", String(t * 0.7));
    });

    // links flow in
    els.linkPaths.forEach((l, i) => {
      const t = easeOutCubic(clamp((localT - 0.2 - i * 0.05) / 0.5, 0, 1));
      l.path.setAttribute("stroke-opacity", String(t * 0.4));
    });
  },

  destroy(els) { els.svg.remove(); },
};
