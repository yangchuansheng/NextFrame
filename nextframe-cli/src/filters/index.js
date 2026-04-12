// Filter registry — post-processing on rendered pixels.
// Each filter: apply(imageData, params) → mutates imageData in place

import { warmTone } from "./warmTone.js";
import { coolTone } from "./coolTone.js";
import { grayscale } from "./grayscale.js";
import { sepia } from "./sepia.js";
import { filmGrain } from "./filmGrain.js";

export const FILTER_TABLE = {
  warmTone:  { id: "warmTone",  description: "Warm color grading",  params: [{ name: "intensity", type: "number", default: 0.5, range: [0, 1] }] },
  coolTone:  { id: "coolTone",  description: "Cool/blue shift",     params: [{ name: "intensity", type: "number", default: 0.5, range: [0, 1] }] },
  grayscale: { id: "grayscale", description: "Desaturate to B&W",   params: [{ name: "amount", type: "number", default: 1, range: [0, 1] }] },
  sepia:     { id: "sepia",     description: "Vintage brown tone",  params: [{ name: "intensity", type: "number", default: 0.8, range: [0, 1] }] },
  filmGrain: { id: "filmGrain", description: "Noise grain overlay", params: [{ name: "amount", type: "number", default: 0.04, range: [0, 0.15] }] },
};

export const FILTER_FNS = { warmTone, coolTone, grayscale, sepia, filmGrain };
export const FILTER_IDS = Object.keys(FILTER_FNS);

export function getFilter(id) {
  if (!FILTER_FNS[id]) return null;
  return { id, apply: FILTER_FNS[id], META: FILTER_TABLE[id] };
}

export function listFilters() {
  return FILTER_IDS.map((id) => FILTER_TABLE[id]);
}

/**
 * Apply a list of filters to a canvas.
 * @param {object} ctx — 2d context
 * @param {number} width
 * @param {number} height
 * @param {Array<string|{type:string}>} filters
 */
export function applyFilters(ctx, width, height, filters) {
  if (!filters || !filters.length) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  for (const f of filters) {
    const spec = typeof f === "string" ? { type: f } : f;
    const fn = FILTER_FNS[spec.type];
    if (fn) fn(imageData.data, width, height, spec);
  }
  ctx.putImageData(imageData, 0, 0);
}
