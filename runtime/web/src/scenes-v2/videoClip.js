import { toNumber, clamp } from "../scenes-v2-shared.js";

export default {
  id: "videoClip",
  type: "media",
  name: "Video Clip",
  category: "Media",
  defaultParams: {
    src: "",
    poster: "",
    muted: true,
    loop: false,
    objectFit: "cover",
  },

  create(container, params) {
    const video = document.createElement("video");
    video.style.cssText = [
      "position:absolute;inset:0;width:100%;height:100%",
      `object-fit:${params.objectFit || "cover"}`,
      "display:block;background:#000",
    ].join(";");
    video.playsInline = true;
    video.muted = params.muted !== false;
    video.loop = params.loop === true;
    video.preload = "auto";
    if (params.poster) video.poster = params.poster;
    if (params.src) video.src = params.src;
    // Expose for recorder audio muxing
    if (params.src && !window.__audioSrc) {
      window.__audioSrc = params.src;
    }
    return { video, playing: false, lastT: -1 };
  },

  update(state, localT, params) {
    const { video } = state;
    const t = toNumber(localT, 0);
    if (!video.src) return;

    // Wait for video to be ready
    if (!video.duration || !Number.isFinite(video.duration)) return;

    const target = clamp(t, 0, video.duration);
    const drift = Math.abs(video.currentTime - target);

    // In recording mode (__onFrame driven), just seek each frame
    if (window.__recordingMode) {
      if (drift > 0.05) video.currentTime = target;
      return;
    }

    // Browser preview mode: let video play naturally, only seek on big jumps
    if (drift > 0.5) {
      // Big jump (slider drag, skip) — seek
      video.currentTime = target;
    }

    // Play if not already playing and time is advancing
    if (video.paused && t > 0 && t > state.lastT) {
      video.muted = params.muted !== false;
      video.play().catch(() => {});
      state.playing = true;
    }

    // Pause if time stopped advancing (paused in player)
    if (t === state.lastT && state.playing) {
      video.pause();
      state.playing = false;
    }

    state.lastT = t;
  },

  destroy(state) {
    state.video.pause();
    state.video.removeAttribute("src");
    state.video.load();
    state.video.remove();
  },
};
