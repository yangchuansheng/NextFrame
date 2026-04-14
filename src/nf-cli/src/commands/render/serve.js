// nextframe serve <html-file> [--port 3210]
//
// Starts a local HTTP server to serve built HTML files with proper CORS
// headers, allowing video/audio assets to load from absolute file paths.
// Solves the file:// protocol restriction that blocks media playback.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, basename } from "node:path";
import { parseFlags, emit } from "../_helpers/_io.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

function getMime(filePath) {
  return MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
}

export async function run(argv) {
  const { positional, flags } = parseFlags(argv);
  const htmlPath = positional[0] ? resolve(positional[0]) : null;

  if (!htmlPath) {
    emit({ error: "Usage: nextframe serve <html-file> [--port 3210]" });
    process.exit(1);
  }

  // parseFlags treats --port 3210 as port=true + positional "3210"
  // so also check positional[1] as fallback
  const portRaw = flags.port === true ? (positional[1] || "3210") : (flags.port || "3210");
  const port = parseInt(String(portRaw), 10) || 3210;

  // Check file exists
  try {
    await stat(htmlPath);
  } catch {
    emit({ error: `File not found: ${htmlPath}` });
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let filePath;

    // Root or /index.html → serve the built HTML
    if (url.pathname === "/" || url.pathname === `/${basename(htmlPath)}`) {
      filePath = htmlPath;
    }
    // /__asset/ prefix → serve from absolute path (for video/audio assets)
    else if (url.pathname.startsWith("/__asset/")) {
      filePath = decodeURIComponent(url.pathname.slice("/__asset".length));
    }
    // Relative path → resolve from HTML directory
    else {
      filePath = resolve(htmlPath, "..", decodeURIComponent(url.pathname));
    }

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const fileStat = await stat(filePath);

      // Range request support for video seeking
      const range = req.headers.range;
      if (range && fileStat.size > 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1;
        const chunkSize = end - start + 1;

        const { createReadStream } = await import("node:fs");
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": getMime(filePath),
        });
        createReadStream(filePath, { start, end }).pipe(res);
        return;
      }

      const data = await readFile(filePath);
      res.writeHead(200, {
        "Content-Type": getMime(filePath),
        "Content-Length": data.length,
        "Accept-Ranges": "bytes",
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Not found: ${filePath}`);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/`;
    emit({
      status: "serving",
      url,
      file: htmlPath,
      port,
      message: `Serving at ${url} — Ctrl+C to stop`,
    });
  });
}
