# POC U Scene Gallery Report

- Generated on: 2026-04-12T00:31:17.144Z
- Scene source: `/Users/Zhuanz/bigbang/NextFrame/runtime/web/src/scenes`
- Scenes rendered: 21
- Render timestamp: t=2.5s
- Output size per scene: 480x270 PNG preview rendered from 1920x1080
- Gallery: `gallery.html`
- Contact sheet: `contact-sheet.png`
- Total time: 1.40s
- Render failures: none

## Great

- `auroraGradient`: strong color separation and readable composition even at thumbnail size.
- `neonGrid`: immediately legible and one of the best showcase frames in the set.
- `barChartReveal`: clear editorial framing and data labels survive the downscale well.
- `starfield`: attractive depth and color without turning muddy.
- `circleRipple`: clean geometry and a good mid-action frame.
- `countdown`: high-contrast focal point; reads instantly.
- `lineChart`: crisp line and dots, good information density.
- `fluidBackground`: soft but still visually rich at 480x270.
- `meshGrid`: strong silhouette and depth.
- `dataPulse`: distinctive waveform/reflection look, though slightly sparse on the far right.
- `orbitRings`: balanced and polished.
- `spotlightSweep`: bold lighting shapes, good thumbnail impact.

## Solid But Less Distinctive

- `kineticHeadline`: technically correct and readable, but the chosen frame is fairly minimal.
- `pixelRain`: works, though the effect is subtler than the strongest backgrounds.
- `glitchText`: readable and clean, but the glitch distortion itself is subdued in this frame.
- `particleFlow`: technically renders correctly, but the particles are faint at gallery scale.

## Weak Or Broken For This Gallery

- `imageHero`: weak by default because `src` is `null`, so the gallery only shows the placeholder treatment rather than a real hero image.
- `lowerThirdVelvet`: works as an overlay, but most of the frame is black in isolation, so it underperforms in a contact sheet.
- `cornerBadge`: same issue as `lowerThirdVelvet`; usable overlay, weak standalone frame.
- `textOverlay`: correct but too bare as a default gallery sample.
- `shapeBurst`: the t=2.5 frame catches the burst after most elements have dispersed, so the center feels empty and the composition reads weakly.

## Summary

The render pipeline is working for all 21 scenes. The strongest results are the full-frame backgrounds, geometry scenes, and data-viz scenes. The weakest results are mostly expected from defaults: overlay scenes without a base plate and `imageHero` without an image source.
