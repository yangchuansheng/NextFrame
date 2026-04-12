import test from "node:test";
import assert from "node:assert/strict";

import { validateTimeline } from "../src/engine/validate.js";

function msg(id, text) {
  return `${id}: ${text}`;
}

function makeTimeline() {
  return {
    schema: "nextframe/v0.1",
    duration: 4,
    background: "#101010",
    project: { width: 320, height: 180, aspectRatio: 16 / 9, fps: 30 },
    assets: [],
    tracks: [
      {
        id: "v1",
        kind: "video",
        clips: [{ id: "base", start: 0, dur: 1, scene: "auroraGradient", params: {} }],
      },
    ],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("safety-gates-1: schema rejects malformed timelines without throwing", () => {
  const id = "safety-gates-1";
  const inputs = [
    null,
    {},
    { schema: "nextframe/v0.1", duration: 2 },
  ];

  for (const input of inputs) {
    const result = validateTimeline(input);
    assert.equal(result.ok, false, msg(id, "schema-invalid input should fail validation"));
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0, msg(id, "schema-invalid input should report errors"));
    assert.match(result.errors[0].code, /^(BAD_|NO_|MISSING_)/, msg(id, "first error code should be schema-shaped"));
    assert.ok(
      result.errors.some((error) => /^(BAD_|NO_|MISSING_)/.test(error.code)),
      msg(id, "each case should surface at least one schema error"),
    );
  }
});

test("safety-gates-2: symbolic time rejects dangling refs and cycles with anchor hints", () => {
  const id = "safety-gates-2";

  const missingRefTimeline = makeTimeline();
  missingRefTimeline.tracks[0].clips.push({
    id: "late",
    start: { after: "nonexistent-marker" },
    dur: 1,
    scene: "textOverlay",
    params: { text: "late" },
  });
  const missingRef = validateTimeline(missingRefTimeline);
  assert.equal(missingRef.ok, false, msg(id, "dangling symbolic refs should fail validation"));
  assert.match(
    missingRef.errors[0].code,
    /TIME_REF_NOT_FOUND|TIME_.*MISSING|UNKNOWN_MARKER/i,
    msg(id, "dangling ref should return a structured time error"),
  );
  assert.match(String(missingRef.errors[0].hint), /available/i, msg(id, "dangling ref hint should list available anchors"));

  const cycleTimeline = makeTimeline();
  cycleTimeline.tracks[0].clips = [
    { id: "A", start: { after: "clip-B" }, dur: 1, scene: "auroraGradient", params: {} },
    { id: "B", start: { after: "clip-A" }, dur: 1, scene: "textOverlay", params: { text: "B" } },
  ];
  const cycle = validateTimeline(cycleTimeline);
  assert.equal(cycle.ok, false, msg(id, "symbolic cycles should fail validation"));
  assert.match(cycle.errors[0].code, /CYCLE|TIME_CYCLE/i, msg(id, "cycle should report a cycle error code"));
  assert.match(String(cycle.errors[0].hint), /available/i, msg(id, "cycle hint should list available anchors"));
});

test("safety-gates-3: missing assets downgrade to warnings instead of hard failure", () => {
  const id = "safety-gates-3";
  const timeline = makeTimeline();
  timeline.assets = [{ id: "a1", path: "/tmp/definitely-missing-xyz.png" }];

  const result = validateTimeline(timeline);
  const warning = result.warnings.find((entry) => entry.code === "MISSING_ASSET");

  assert.equal(result.ok, true, msg(id, "missing assets should not block validation"));
  assert.ok(warning, msg(id, "missing asset warning should be emitted"));
  assert.equal(warning.ref, "a1", msg(id, "missing asset warning should name the asset id"));
  assert.match(warning.message, /a1/, msg(id, "missing asset warning message should name the asset id"));
});

test("safety-gates-4: unknown scenes are rejected with clip ref and available hint", () => {
  const id = "safety-gates-4";
  const timeline = makeTimeline();
  timeline.tracks[0].clips = [{ id: "badClipId", start: 0, dur: 1, scene: "doesNotExistXYZ", params: {} }];

  const result = validateTimeline(timeline);

  assert.equal(result.ok, false, msg(id, "unknown scenes should fail validation"));
  assert.equal(result.errors[0].code, "UNKNOWN_SCENE", msg(id, "unknown scene code should be preserved"));
  assert.equal(result.errors[0].ref, "badClipId", msg(id, "unknown scene error should attach the failing clip id"));
  assert.match(String(result.errors[0].hint), /available/, msg(id, "unknown scene hint should list available scene ids"));
});

test("safety-gates-5: same-track overlaps surface warnings without aborting validation", () => {
  const id = "safety-gates-5";
  const timeline = makeTimeline();
  timeline.tracks[0].clips = [
    { id: "a", start: 0, dur: 2, scene: "auroraGradient", params: {} },
    { id: "b", start: 1, dur: 2, scene: "textOverlay", params: { text: "B" } },
  ];

  const result = validateTimeline(timeline);
  const overlap = result.warnings.find((entry) => entry.code === "CLIP_OVERLAP");

  assert.equal(result.ok, true, msg(id, "overlap should not hard-fail validation"));
  assert.ok(overlap, msg(id, "overlap warning should be emitted"));
  assert.ok(
    overlap.ref === "v1" || /v1/.test(overlap.message),
    msg(id, "overlap warning should name the track id"),
  );
});

test("safety-gates-6: duplicate track and clip ids return structured errors without throwing", () => {
  const id = "safety-gates-6";

  const dupTrackTimeline = clone(makeTimeline());
  dupTrackTimeline.tracks.push({
    id: "v1",
    kind: "video",
    clips: [{ id: "other", start: 1, dur: 1, scene: "textOverlay", params: { text: "other" } }],
  });
  assert.doesNotThrow(
    () => validateTimeline(dupTrackTimeline),
    msg(id, "duplicate track ids should not throw out of validateTimeline"),
  );
  const dupTrack = validateTimeline(dupTrackTimeline);
  assert.equal(dupTrack.ok, false, msg(id, "duplicate track ids should fail validation"));
  assert.equal(dupTrack.errors[0].code, "DUP_TRACK_ID", msg(id, "duplicate track ids should report DUP_TRACK_ID"));
  assert.equal(dupTrack.errors[0].ref, "v1", msg(id, "duplicate track ids should attach the duplicate id"));

  const dupClipTimeline = clone(makeTimeline());
  dupClipTimeline.tracks[0].clips = [
    { id: "c1", start: 0, dur: 1, scene: "auroraGradient", params: {} },
    { id: "c1", start: 1, dur: 1, scene: "textOverlay", params: { text: "dup" } },
  ];
  assert.doesNotThrow(
    () => validateTimeline(dupClipTimeline),
    msg(id, "duplicate clip ids should not throw out of validateTimeline"),
  );
  const dupClip = validateTimeline(dupClipTimeline);
  assert.equal(dupClip.ok, false, msg(id, "duplicate clip ids should fail validation"));
  assert.equal(dupClip.errors[0].code, "DUP_CLIP_ID", msg(id, "duplicate clip ids should report DUP_CLIP_ID"));
  assert.equal(dupClip.errors[0].ref, "c1", msg(id, "duplicate clip ids should attach the duplicate id"));
});
