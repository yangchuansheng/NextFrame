function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, cloneValue(entryValue)]),
    );
  }

  return value;
}

let clipboardClips = [];

// Copy, paste, and duplicate all use the same in-memory clip buffer.
export function copy(clips) {
  clipboardClips = Array.isArray(clips)
    ? clips.filter((clip) => clip && typeof clip === "object").map((clip) => cloneValue(clip))
    : [];
}

export function read() {
  return clipboardClips.map((clip) => cloneValue(clip));
}
