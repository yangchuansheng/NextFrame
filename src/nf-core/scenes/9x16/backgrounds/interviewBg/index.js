import { TOKENS, scaleW, scaleH } from "../../../shared/design.js";

export const meta = {
  id: "interviewBg", version: 3, ratio: "9:16", category: "backgrounds",
  label: "Interview Background",
  description: "Reference-matched interview background: dark base + dual gold radial glow + dot grid + vignette.",
  tech: "dom", duration_hint: 20, loopable: true, z_hint: "bottom",
  tags: ["backgrounds", "interview", "dark", "9x16"],
  default_theme: "dark-interview",
  themes: { "dark-interview": {} },
  params: {
    bg: { type: "color", default: TOKENS.interview.bg, label: "Background", group: "color" },
  },
  ai: { when: "Always the first layer for 9:16 interview videos.", pairs_with: ["interviewHeader", "interviewVideoArea"] },
};

export function render(t, params, vp) {
  const bg = params.bg || TOKENS.interview.bg;
  const dotSize = scaleW(vp, 40); // 20px×2
  return `<div style="position:absolute;inset:0;background:${bg}">` +
    // Dual gold radial glows
    `<div style="position:absolute;inset:0;background-image:radial-gradient(ellipse at 50% 20%,${TOKENS.interview.glowTop} 0%,transparent 60%),radial-gradient(ellipse at 50% 85%,${TOKENS.interview.glowBottom} 0%,transparent 50%)"></div>` +
    // Dot grid
    `<div style="position:absolute;inset:0;opacity:0.15;background-image:radial-gradient(${TOKENS.interview.gridDot} 1px,transparent 1px);background-size:${dotSize}px ${dotSize}px"></div>` +
    // Vignette
    `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 40%,${TOKENS.interview.vignette} 100%)"></div>` +
    `</div>`;
}

export function screenshots() {
  return [{ t: 0, label: "Background" }];
}

export function lint() {
  return { ok: true, errors: [] };
}
