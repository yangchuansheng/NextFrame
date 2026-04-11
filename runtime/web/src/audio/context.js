let audioContext = null;
let resumeListenerBound = false;
let resumeListener = null;

function getAudioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function detachResumeListener() {
  if (!resumeListenerBound || typeof document === "undefined" || typeof resumeListener !== "function") {
    return;
  }

  document.removeEventListener("click", resumeListener, true);
  resumeListenerBound = false;
}

function bindResumeListener(context) {
  if (!context || resumeListenerBound || typeof document === "undefined") {
    return;
  }

  resumeListener = () => {
    const result = typeof context.resume === "function" ? context.resume() : null;
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }

    if (context.state === "running") {
      detachResumeListener();
    }
  };

  document.addEventListener("click", resumeListener, true);
  resumeListenerBound = true;
}

export function getAudioContext() {
  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  bindResumeListener(audioContext);
  if (audioContext.state === "running") {
    detachResumeListener();
  }

  return audioContext;
}
