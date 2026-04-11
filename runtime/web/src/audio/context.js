let audioContext = null;
let resumeListenerBound = false;
let resumeListener = null;
const pendingResolvers = new Set();

function getAudioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function hasUserActivation() {
  return Boolean(globalThis.navigator?.userActivation?.isActive);
}

function resolvePending(context) {
  for (const resolve of pendingResolvers) {
    resolve(context);
  }
  pendingResolvers.clear();
}

function createAudioContext() {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    resolvePending(null);
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
    resolvePending(audioContext);
  }

  return audioContext;
}

function detachResumeListener() {
  if (!resumeListenerBound || typeof document === "undefined" || typeof resumeListener !== "function") {
    return;
  }

  document.removeEventListener("click", resumeListener, true);
  resumeListenerBound = false;
}

function bindResumeListener(context) {
  if (resumeListenerBound || typeof document === "undefined") {
    return;
  }

  resumeListener = () => {
    const activeContext = context || createAudioContext();
    if (!activeContext) {
      return;
    }

    const result = typeof activeContext.resume === "function" ? activeContext.resume() : null;
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }

    if (activeContext.state === "running") {
      detachResumeListener();
    }
  };

  document.addEventListener("click", resumeListener, true);
  resumeListenerBound = true;
}

export function getAudioContext() {
  if (!getAudioContextConstructor()) {
    return null;
  }

  if (audioContext) {
    bindResumeListener(audioContext);
    if (hasUserActivation()) {
      const result = typeof audioContext.resume === "function" ? audioContext.resume() : null;
      if (result && typeof result.catch === "function") {
        result.catch(() => {});
      }
    }

    if (audioContext.state === "running") {
      detachResumeListener();
    }

    return audioContext;
  }

  if (hasUserActivation()) {
    const context = createAudioContext();
    bindResumeListener(context);
    return context;
  }

  bindResumeListener(null);
  return null;
}

export function waitForAudioContext() {
  const context = getAudioContext();
  if (context) {
    return Promise.resolve(context);
  }

  if (!getAudioContextConstructor()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    pendingResolvers.add(resolve);
  });
}

export function disposeAudioContextForTests() {
  if (audioContext && typeof audioContext.close === "function") {
    void audioContext.close();
  }
  audioContext = null;
  resolvePending(null);
  if (resumeListenerBound) {
    detachResumeListener();
  }
}
