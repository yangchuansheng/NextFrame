import { getAudioContext } from "./context.js";

const audioBufferCache = new Map();

function isWindowsAbsolutePath(value) {
  return /^[A-Za-z]:[\\/]/.test(value);
}

function createFileUrl(pathname) {
  const normalized = pathname.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "/$1:");
  return encodeURI(`file://${normalized}`);
}

export function normalizeAudioUrl(url) {
  if (typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (isWindowsAbsolutePath(trimmed)) {
    return createFileUrl(trimmed);
  }

  try {
    const base = globalThis.location?.href || "file:///";
    return new URL(trimmed, base).href;
  } catch {
    return trimmed;
  }
}

export async function loadAudioBuffer(url) {
  const normalizedUrl = normalizeAudioUrl(url);
  if (!normalizedUrl) {
    return null;
  }

  if (audioBufferCache.has(normalizedUrl)) {
    return audioBufferCache.get(normalizedUrl);
  }

  const pending = (async () => {
    const audioContext = getAudioContext();
    if (!audioContext) {
      return null;
    }

    const response = await fetch(normalizedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio "${normalizedUrl}" (${response.status})`);
    }

    const encoded = await response.arrayBuffer();
    return audioContext.decodeAudioData(encoded.slice(0));
  })();

  audioBufferCache.set(normalizedUrl, pending);

  try {
    return await pending;
  } catch (error) {
    audioBufferCache.delete(normalizedUrl);
    throw error;
  }
}
