import headline from "./headline.js";
import bodyText from "./bodyText.js";
import bulletList from "./bulletList.js";
import codeBlock from "./codeBlock.js";
import quoteBlock from "./quoteBlock.js";
import calloutCard from "./calloutCard.js";
import numberCounter from "./numberCounter.js";
import subtitleBar from "./subtitleBar.js";
import vignette from "./vignette.js";
import videoClip from "./videoClip.js";
import audioTrack from "./audioTrack.js";
import barChart from "./barChart.js";
import lineChart from "./lineChart.js";
import progressRing from "./progressRing.js";
import auroraGradient from "./auroraGradient.js";
import particleFlow from "./particleFlow.js";
import statsRow from "./statsRow.js";
import featureGrid from "./featureGrid.js";

const SCENES_V2 = [
  headline,
  bodyText,
  bulletList,
  codeBlock,
  quoteBlock,
  calloutCard,
  numberCounter,
  subtitleBar,
  vignette,
  videoClip,
  audioTrack,
  barChart,
  lineChart,
  progressRing,
  auroraGradient,
  particleFlow,
  statsRow,
  featureGrid,
];

export { headline, bodyText, bulletList, codeBlock, quoteBlock, calloutCard, numberCounter, subtitleBar, vignette, videoClip, audioTrack, barChart, lineChart, progressRing, auroraGradient, particleFlow, statsRow, featureGrid };

export const SCENE_V2_MANIFEST = SCENES_V2.map((scene) => ({
  id: scene.id,
  type: scene.type,
  name: scene.name,
  category: scene.category,
  tags: scene.tags,
  description: scene.description,
  params: scene.params,
  default_params: scene.defaultParams,
}));

export const SCENE_V2_BY_ID = new Map(SCENES_V2.map((scene) => [scene.id, scene]));

/**
 * Register all v2 scenes on the provided engine.
 * @param {{registerScene: (id: string, scene: object) => unknown}} engine
 */
export function registerAllScenesV2(engine) {
  if (!engine || typeof engine.registerScene !== "function") {
    throw new TypeError("registerAllScenesV2(engine) requires engine.registerScene");
  }

  for (const scene of SCENES_V2) {
    engine.registerScene(scene.id, scene);
  }
}
