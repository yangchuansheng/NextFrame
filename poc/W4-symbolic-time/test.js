"use strict";

const assert = require("assert");
const { resolveTimeline } = require("./resolver");

const fixtures = [
  {
    name: "mixed-symbols",
    timeline: {
      project: { end: 12 },
      chapters: [
        { id: "intro", start: { at: "project-start" }, end: 2.4 },
        { id: "body", start: { after: "chapter-intro" }, end: 8.4 },
        { id: "outro", start: 9.2, end: { until: "project-end" } },
      ],
      markers: [
        { id: "drum-1", at: 3.26 },
        { id: "subtitle-cue-3", at: 6.04 },
      ],
      clips: [
        { id: "headline", start: { at: "project-start" }, end: 1.04 },
        { id: "bumper", start: { after: "clip-headline" }, end: 2.24 },
        { id: "stinger", start: { after: "clip-headline", gap: 0.5 }, end: 2.64 },
        { id: "main", start: { at: "chapter-body" }, end: 5.19 },
        { id: "accent", start: { at: "marker-drum-1" }, end: 3.86 },
        { id: "sync-bar", start: { sync: "subtitle-cue-3" }, end: { until: "chapter-outro.start" } },
        { id: "pre-outro", start: 7.3, end: { before: "chapter-outro", gap: 1 } },
        { id: "credits", start: 10.7, end: { until: "project-end" } },
      ],
    },
    expectedLookup: {
      "project-start": 0,
      "project-end": 12,
      "chapter-intro.end": 2.4,
      "chapter-body": 2.4,
      "chapter-outro.start": 9.2,
      "marker-drum-1": 3.3,
      "subtitle-cue-3": 6,
      "clip-headline.end": 1,
      "clip-bumper.start": 1,
      "clip-stinger.start": 1.5,
      "clip-main.start": 2.4,
      "clip-accent.start": 3.3,
      "clip-sync-bar.start": 6,
      "clip-sync-bar.end": 9.2,
      "clip-pre-outro.end": 8.2,
      "clip-credits.end": 12,
    },
  },
  {
    name: "project-derived",
    timeline: {
      project: { end: { after: "clip-finale", gap: 0.25 } },
      chapters: [
        { id: "section", start: { at: "project-start" }, end: { until: "clip-finale.start" } },
      ],
      markers: [
        { id: "open-tail", at: { at: "clip-open.end" } },
      ],
      clips: [
        { id: "open", start: 0, end: 1.28 },
        { id: "accent-lock", start: { sync: "marker-open-tail" }, end: 2.04 },
        { id: "finale", start: { after: "clip-open", gap: 2.12 }, end: 6.81 },
      ],
    },
    expectedLookup: {
      "project-end": 7.1,
      "chapter-section.end": 3.4,
      "marker-open-tail": 1.3,
      "clip-open.end": 1.3,
      "clip-accent-lock.start": 1.3,
      "clip-finale.start": 3.4,
      "clip-finale.end": 6.8,
    },
  },
  {
    name: "explicit-field-refs",
    timeline: {
      project: { start: 0.04, end: 4.96 },
      chapters: [
        { id: "beat", start: { at: "project.start" }, end: 2.55 },
      ],
      markers: [
        { id: "cue-1", at: { at: "clip-intro.end" } },
      ],
      clips: [
        { id: "intro", start: { at: "project-start" }, end: { before: "chapter-beat.end", gap: 0.35 } },
        { id: "outro", start: 4.2, end: { until: "project.end" } },
      ],
    },
    expectedLookup: {
      "project-start": 0,
      "project-end": 5,
      "chapter-beat": 0,
      "chapter-beat.end": 2.6,
      "clip-intro.start": 0,
      "clip-intro.end": 2.2,
      "marker-cue-1": 2.2,
      "clip-outro.end": 5,
    },
  },
  {
    name: "chapter-chain",
    timeline: {
      project: { end: 15 },
      chapters: [
        { id: "act-1", start: 0, end: 4.44 },
        { id: "act-2", start: { after: "chapter-act-1" }, end: 10.02 },
        { id: "act-3", start: { after: "chapter-act-2" }, end: { until: "project-end" } },
      ],
      markers: [
        { id: "bridge", at: { before: "chapter-act-3", gap: 0.75 } },
      ],
      clips: [
        { id: "bridge-card", start: { sync: "marker-bridge" }, end: 10.6 },
      ],
    },
    expectedLookup: {
      "chapter-act-1.end": 4.4,
      "chapter-act-2.start": 4.4,
      "chapter-act-2.end": 10,
      "chapter-act-3.start": 10,
      "chapter-act-3.end": 15,
      "marker-bridge": 9.3,
      "clip-bridge-card.start": 9.3,
    },
  },
  {
    name: "quantization-edges",
    timeline: {
      project: { end: 3.14 },
      chapters: [
        { id: "all", start: 0, end: { until: "project-end" } },
      ],
      markers: [
        { id: "fine", at: 1.05 },
      ],
      clips: [
        { id: "tiny", start: { at: "marker-fine" }, end: 1.149 },
        { id: "next", start: { after: "clip-tiny", gap: 0.04 }, end: { until: "project-end" } },
      ],
    },
    expectedLookup: {
      "project-end": 3.1,
      "chapter-all.end": 3.1,
      "marker-fine": 1.1,
      "clip-tiny.start": 1.1,
      "clip-tiny.end": 1.1,
      "clip-next.start": 1.2,
      "clip-next.end": 3.1,
    },
  },
];

const expectedOperatorsCovered = new Set(["at", "after", "before", "sync", "until"]);

run();

function run() {
  testFixtures();
  testOperatorsCovered();
  testRoundtripStability();
  testCycleDetection();
  testInvalidReference();
  console.log(`All ${fixtures.length + 4} tests passed.`);
}

function testFixtures() {
  for (const fixture of fixtures) {
    const result = resolveTimeline(clone(fixture.timeline));

    for (const [symbol, expected] of Object.entries(fixture.expectedLookup)) {
      assert.strictEqual(
        result.lookup[symbol],
        expected,
        `Fixture "${fixture.name}" resolved ${symbol} to ${result.lookup[symbol]} instead of ${expected}.`
      );
    }

    assert.ok(
      isResolved(result.timeline),
      `Fixture "${fixture.name}" still contains symbolic expressions after resolution.`
    );
  }
}

function testOperatorsCovered() {
  const seen = new Set();

  for (const fixture of fixtures) {
    walkExpressions(fixture.timeline, (expression) => {
      for (const operator of expectedOperatorsCovered) {
        if (Object.prototype.hasOwnProperty.call(expression, operator)) {
          seen.add(operator);
        }
      }
    });
  }

  assert.deepStrictEqual(seen, expectedOperatorsCovered, "Fixtures do not cover every required expression operator.");
}

function testRoundtripStability() {
  for (const fixture of fixtures) {
    const serialized = JSON.stringify(fixture.timeline);
    const first = resolveTimeline(JSON.parse(serialized));

    const edited = clone(fixture.timeline);
    edited.meta = { revision: `edited-${fixture.name}` };
    edited.clips = edited.clips.map((clip) => ({ ...clip, label: `label-${clip.id}` }));

    const second = resolveTimeline(JSON.parse(JSON.stringify(edited)));

    assert.deepStrictEqual(
      first.lookup,
      second.lookup,
      `Roundtrip stability failed for fixture "${fixture.name}".`
    );
  }
}

function testCycleDetection() {
  const timeline = {
    project: { end: 10 },
    chapters: [],
    markers: [],
    clips: [
      { id: "a", start: { after: "clip-b" }, end: { after: "clip-a", gap: 1 } },
      { id: "b", start: { after: "clip-a" }, end: { after: "clip-b", gap: 1 } },
    ],
  };

  assert.throws(
    () => resolveTimeline(timeline),
    /Cycle detected/,
    "Expected cyclic clip dependencies to throw."
  );
}

function testInvalidReference() {
  const timeline = {
    project: { end: 5 },
    chapters: [],
    markers: [],
    clips: [
      { id: "orphan", start: { at: "marker-missing" }, end: 1 },
    ],
  };

  assert.throws(
    () => resolveTimeline(timeline),
    /Invalid reference "marker-missing"/,
    "Expected missing marker references to throw."
  );
}

function walkExpressions(value, visit) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkExpressions(item, visit));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (isSymbolicExpressionObject(value)) {
    visit(value);
  }

  for (const nested of Object.values(value)) {
    walkExpressions(nested, visit);
  }
}

function isResolved(value) {
  if (Array.isArray(value)) {
    return value.every(isResolved);
  }

  if (!value || typeof value !== "object") {
    return true;
  }

  if (isSymbolicExpressionObject(value)) {
    return false;
  }

  return Object.values(value).every(isResolved);
}

function isSymbolicExpressionObject(value) {
  const operators = ["at", "after", "before", "sync", "until"];
  const keys = Object.keys(value);
  const present = operators.filter((key) => Object.prototype.hasOwnProperty.call(value, key));

  if (present.length !== 1) {
    return false;
  }

  if (typeof value[present[0]] !== "string") {
    return false;
  }

  return keys.every((key) => key === present[0] || key === "gap");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
