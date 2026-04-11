import { auroraGradient } from "./auroraGradient.js";
import { kineticHeadline } from "./kineticHeadline.js";
import { neonGrid } from "./neonGrid.js";
import { barChartReveal } from "./barChartReveal.js";
import { lowerThirdVelvet } from "./lowerThirdVelvet.js";

function cloneDefaultValue(value) {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function createDefaultParams(params) {
  if (!params || typeof params !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(params).map(([name, config]) => [name, cloneDefaultValue(config?.default)]),
  );
}

const SCENE_REGISTRY = [
  {
    id: "auroraGradient",
    fn: auroraGradient,
    name: "Aurora Gradient",
    category: "Backgrounds",
    duration_hint: "10-30s",
    params: {
      hueA: { type: "number", default: 270, min: 0, max: 360, ui: "hue" },
      hueB: { type: "number", default: 200, min: 0, max: 360, ui: "hue" },
      hueC: { type: "number", default: 320, min: 0, max: 360, ui: "hue" },
      intensity: { type: "number", default: 1, min: 0, max: 1.5 },
      grain: { type: "number", default: 0.04, min: 0, max: 0.15 },
    },
  },
  {
    id: "kineticHeadline",
    fn: kineticHeadline,
    name: "Kinetic Headline",
    category: "Typography",
    duration_hint: "3-6s",
    params: {
      text: { type: "string", default: "NEXTFRAME" },
      subtitle: { type: "string", default: "Frame-pure scene library" },
      hueStart: { type: "number", default: 30, min: 0, max: 360, ui: "hue" },
      hueEnd: { type: "number", default: 320, min: 0, max: 360, ui: "hue" },
      stagger: { type: "number", default: 0.18, min: 0.05, max: 0.5, unit: "s" },
      size: { type: "number", default: 0.12, min: 0.05, max: 0.25 },
    },
  },
  {
    id: "neonGrid",
    fn: neonGrid,
    name: "Neon Grid",
    category: "Shapes & Layout",
    duration_hint: "5-30s",
    params: {
      hueHorizon: { type: "number", default: 320, min: 0, max: 360, ui: "hue" },
      hueGrid: { type: "number", default: 280, min: 0, max: 360, ui: "hue" },
      scrollSpeed: { type: "number", default: 0.4, min: 0, max: 2 },
      lineCount: { type: "integer", default: 16, min: 8, max: 32 },
      colCount: { type: "integer", default: 22, min: 8, max: 48 },
    },
  },
  {
    id: "barChartReveal",
    fn: barChartReveal,
    name: "Bar Chart Reveal",
    category: "Data Viz",
    duration_hint: "3-6s",
    params: {
      data: {
        type: "array",
        default: [
          { label: "JAN", value: 42 },
          { label: "FEB", value: 68 },
          { label: "MAR", value: 55 },
          { label: "APR", value: 81 },
          { label: "MAY", value: 73 },
          { label: "JUN", value: 96 },
          { label: "JUL", value: 88 },
        ],
      },
      title: { type: "string", default: "MONTHLY GROWTH" },
      unit: { type: "string", default: "%" },
      hueStart: { type: "number", default: 200, min: 0, max: 360, ui: "hue" },
      hueEnd: { type: "number", default: 320, min: 0, max: 360, ui: "hue" },
      stagger: { type: "number", default: 0.12, min: 0.05, max: 0.5, unit: "s" },
      barDur: { type: "number", default: 0.85, min: 0.2, max: 2, unit: "s" },
    },
  },
  {
    id: "lowerThirdVelvet",
    fn: lowerThirdVelvet,
    name: "Lower Third Velvet",
    category: "Overlays",
    duration_hint: "4-8s",
    params: {
      title: { type: "string", default: "NEXTFRAME" },
      subtitle: { type: "string", default: "Scene Registry Demo" },
      hueA: { type: "number", default: 20, min: 0, max: 360, ui: "hue" },
      hueB: { type: "number", default: 320, min: 0, max: 360, ui: "hue" },
      holdEnd: { type: "number", default: 4, min: 0.5, max: 20, unit: "s" },
      fadeOut: { type: "number", default: 0.6, min: 0.1, max: 4, unit: "s" },
    },
  },
];

export const SCENE_MANIFEST = SCENE_REGISTRY.map(({ id, name, category, params, duration_hint }) => ({
  id,
  name,
  category,
  params,
  default_params: createDefaultParams(params),
  duration_hint,
}));

export const SCENE_MANIFEST_BY_ID = new Map(SCENE_MANIFEST.map((scene) => [scene.id, scene]));

/**
 * Register every built-in scene on the provided engine.
 * @param {{registerScene: (id: string, fn: Function) => unknown}} engine - Engine module or adapter exposing registerScene.
 * @returns {void}
 */
export function registerAllScenes(engine) {
  if (!engine || typeof engine.registerScene !== "function") {
    throw new TypeError("registerAllScenes(engine) requires engine.registerScene");
  }

  for (const scene of SCENE_REGISTRY) {
    engine.registerScene(scene.id, scene.fn);
  }
}
