import { lowerThirdVelvet, describe } from "./lowerThirdVelvet.js";

void lowerThirdVelvet;

const params = {
  holdEnd: 7.5,
  fadeOut: 0.6,
};

for (const t of [0, 0.3, 1.5, 5.0, 7.6, 8.0]) {
  const result = describe(t, params);
  console.log(`${result.phase} ${result.elements.length}`);
}
