/**
 * audioTrack — plays audio in browser preview, synced to timeline time
 * In recording mode, audio is muxed by ffmpeg separately.
 *
 * params:
 *   src: audio file path (relative to HTML or absolute URL)
 *   volume: 0-1 (default 1)
 *   offset: start offset within audio file in seconds (default 0)
 */
export default {
  id: "audioTrack",
  type: "media",
  name: "Audio Track",
  category: "Media",
  defaultParams: {
    src: "",
    volume: 1,
    offset: 0,
  },

  create(container, params) {
    const audio = document.createElement("audio");
    audio.preload = "auto";
    audio.style.display = "none";
    if (params.src) audio.src = params.src;
    audio.volume = Math.max(0, Math.min(1, params.volume ?? 1));
    container.appendChild(audio);
    // Store for __audioSrc protocol (recorder picks this up)
    if (params.src && !window.__audioSrc) {
      window.__audioSrc = params.src;
    }
    return { audio, lastT: -1 };
  },

  update(state, localT, params) {
    const { audio } = state;
    if (!audio.src) return;
    const offset = params.offset || 0;
    const target = offset + localT;
    // Only seek if drifted > 0.3s (avoid constant seeking during playback)
    if (Math.abs(audio.currentTime - target) > 0.3) {
      audio.currentTime = target;
    }
    // In recording mode (__onFrame is set externally), don't auto-play
    if (!window.__recordingMode) {
      if (audio.paused && localT > 0) {
        audio.play().catch(() => {});
      }
    }
    audio.volume = Math.max(0, Math.min(1, params.volume ?? 1));
    state.lastT = localT;
  },

  destroy(state) {
    state.audio.pause();
    state.audio.removeAttribute("src");
    state.audio.remove();
  },
};
