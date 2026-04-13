import { clamp, toNumber } from "../scenes-v2-shared.js";

const DEFAULT_CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789@#$%&*+=<>{}[]";

export default {
  id: "matrixRain",
  type: "canvas",
  name: "Matrix Rain",
  category: "Effects",
  tags: ["matrix", "rain", "hacker", "code", "effect", "digital"],
  description: "黑客帝国风格数字雨，绿色字符从顶部向下流淌，带渐隐尾迹",
  params: {
    color:      { type: "string", default: "#00ff41",       desc: "字符颜色" },
    charset:    { type: "string", default: DEFAULT_CHARSET, desc: "使用的字符集" },
    fontSize:   { type: "number", default: 16,              desc: "字符大小(px)", min: 8, max: 40 },
    speed:      { type: "number", default: 1,               desc: "下落速度倍数", min: 0.1, max: 5 },
    density:    { type: "number", default: 0.6,             desc: "列密度 0-1", min: 0.1, max: 1 },
    fadeLength: { type: "number", default: 20,              desc: "尾迹长度(字符数)", min: 3, max: 60 },
  },
  get defaultParams() {
    const p = {};
    for (const [k, v] of Object.entries(this.params)) p[k] = v.default;
    return p;
  },

  create(container, params) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    canvas.width = container.clientWidth || 1920;
    canvas.height = container.clientHeight || 1080;
    container.appendChild(canvas);

    const fontSize = clamp(toNumber(params.fontSize, 16), 8, 40);
    const density = clamp(toNumber(params.density, 0.6), 0.1, 1);
    const cols = Math.floor(canvas.width / fontSize);
    const activeCols = Math.floor(cols * density);

    // pick random column indices
    let seed = 7;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

    const colIndices = [];
    const allCols = Array.from({ length: cols }, (_, i) => i);
    // shuffle
    for (let i = allCols.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = allCols[i]; allCols[i] = allCols[j]; allCols[j] = tmp;
    }
    for (let i = 0; i < activeCols; i++) colIndices.push(allCols[i]);

    // each column: current y position (in row units), random start offset, random speed mult
    const streams = colIndices.map((col) => ({
      col,
      y: -Math.floor(rng() * 40),
      speedMult: 0.5 + rng() * 1.0,
      chars: [], // cached random chars per row
    }));

    const charset = (params.charset || DEFAULT_CHARSET).split("");

    canvas._data = { streams, fontSize, charset, rng, lastT: 0 };
    return canvas;
  },

  update(canvas, localT, params) {
    const ctx = canvas.getContext("2d");
    const cw = canvas.parentElement?.clientWidth || canvas.width;
    const ch = canvas.parentElement?.clientHeight || canvas.height;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const { streams, fontSize, charset, rng } = canvas._data;
    const speed = toNumber(params.speed, 1);
    const color = params.color || "#00ff41";
    const fadeLength = clamp(toNumber(params.fadeLength, 20), 3, 60);
    const rows = Math.ceil(ch / fontSize);

    // fade background
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(0, 0, cw, ch);

    ctx.font = `${fontSize}px monospace`;

    const dt = localT - canvas._data.lastT;
    canvas._data.lastT = localT;
    const step = dt * speed * 30; // rows per second

    for (const stream of streams) {
      stream.y += step * stream.speedMult;

      const headRow = Math.floor(stream.y);
      const x = stream.col * fontSize;

      // draw chars in the visible tail
      for (let r = Math.max(0, headRow - fadeLength); r <= headRow; r++) {
        if (r < 0 || r >= rows + fadeLength) continue;

        // get or generate char for this row
        while (stream.chars.length <= r) {
          stream.chars.push(charset[Math.floor(rng() * charset.length)]);
        }

        const distFromHead = headRow - r;
        const alpha = 1 - distFromHead / fadeLength;
        if (alpha <= 0) continue;

        const y = r * fontSize;

        if (distFromHead === 0) {
          // head char: bright white-green
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = clamp(alpha, 0, 1);
        } else {
          ctx.fillStyle = color;
          ctx.globalAlpha = clamp(alpha * 0.8, 0, 1);
        }

        ctx.fillText(stream.chars[r], x, y);
      }

      // reset when fully off screen
      if (headRow - fadeLength > rows) {
        stream.y = -Math.floor(rng() * 20);
        stream.chars = [];
      }
    }

    ctx.globalAlpha = 1;
  },

  destroy(canvas) {
    canvas._data = null;
    canvas.remove();
  },
};
