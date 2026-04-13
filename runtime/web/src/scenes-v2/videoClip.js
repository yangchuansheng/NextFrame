import { toNumber, clamp } from "../scenes-v2-shared.js";

/**
 * videoClip — embeds a video, frame-synced to timeline time.
 *
 * Video is ALWAYS muted in this component — audio comes from a separate
 * audioTrack layer pointing to the same file. This avoids play/seek conflicts.
 *
 * In browser preview: seeks each frame via currentTime.
 * In recording mode: same, recorder captures via screenshot.
 */
export default {
  id: "videoClip",
  type: "media",
  name: "Video Clip",
  category: "Media",
  defaultParams: {
    src: "",
    poster: "",
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
    video.muted = true; // always muted — audio via audioTrack
    video.preload = "auto";
    if (params.poster) video.poster = params.poster;
    if (params.src) video.src = params.src;
    container.appendChild(video);
    return video;
  },

  update(video, localT) {
    const t = toNumber(localT, 0);
    if (!video.duration || !Number.isFinite(video.duration)) return;
    const target = clamp(t, 0, video.duration - 0.05);
    // Seek every frame — video is muted so no audio stutter
    if (Math.abs(video.currentTime - target) > 0.04) {
      video.currentTime = target;
    }
  },

  destroy(video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  },
};
