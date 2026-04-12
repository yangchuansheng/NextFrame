import { REGISTRY, listScenes } from "../scenes/index.js";
import { validateTimeline } from "../engine/validate.js";
import { resolveTimeline, resolveExpression } from "../engine/time.js";
import { describeAt } from "../engine/describe.js";
import { renderGantt as gantt } from "../views/gantt.js";

export const TOOLS = {
  list_scenes: {
    schema: { name: "list_scenes", description: "List all scenes and their META", params: [] },
    handler: () => ({ ok: true, value: listScenes() }),
  },
  get_scene_meta: {
    schema: {
      name: "get_scene_meta",
      description: "Get META for a single scene",
      params: [{ name: "id", type: "string", required: true }],
    },
    handler: ({ id }) => {
      const entry = REGISTRY.get(id);
      if (!entry) return { ok: false, error: { code: "UNKNOWN_SCENE", message: `no scene "${id}"` } };
      return { ok: true, value: entry.META };
    },
  },
  validate_timeline: {
    schema: {
      name: "validate_timeline",
      description: "Run 6 safety gates",
      params: [{ name: "timeline", type: "object", required: true }],
    },
    handler: ({ timeline }) => ({ ok: true, value: validateTimeline(timeline) }),
  },
  resolve_time: {
    schema: {
      name: "resolve_time",
      description: "Resolve a symbolic time expression against a timeline",
      params: [{ name: "timeline", type: "object", required: true }, { name: "expr", type: "object", required: true }],
    },
    handler: ({ timeline, expr }) => {
      const r = resolveTimeline(timeline);
      if (!r.ok) return r;
      const lookup = withShorthandRefs(r.lookup || {}, r.value);
      return resolveExpression(expr, lookup, timeline.duration);
    },
  },
  describe_frame: {
    schema: {
      name: "describe_frame",
      description: "Semantic metadata at time t",
      params: [{ name: "timeline", type: "object", required: true }, { name: "t", type: "number", required: true }],
    },
    handler: ({ timeline, t }) => describeAt(timeline, t),
  },
  gantt_ascii: {
    schema: {
      name: "gantt_ascii",
      description: "ASCII gantt chart of the timeline",
      params: [{ name: "timeline", type: "object", required: true }, { name: "width", type: "number", required: false }],
    },
    handler: ({ timeline, width }) => {
      const r = resolveTimeline(timeline);
      if (!r.ok) return r;
      return { ok: true, value: gantt(r.value, { width: width || 80 }) };
    },
  },
  suggest_clip_at: {
    schema: {
      name: "suggest_clip_at",
      description: "Return clips active at time t",
      params: [{ name: "timeline", type: "object", required: true }, { name: "t", type: "number", required: true }],
    },
    handler: ({ timeline, t }) => {
      const r = resolveTimeline(timeline);
      if (!r.ok) return r;
      const active = [];
      for (const trk of r.value.tracks || []) {
        for (const clip of trk.clips || []) {
          if (t >= clip.start && t <= clip.start + clip.dur) {
            active.push({ track: trk.id, id: clip.id, scene: clip.scene });
          }
        }
      }
      return { ok: true, value: active };
    },
  },
};

export const TOOL_DEFINITIONS = Object.fromEntries(
  Object.entries(TOOLS).map(([name, tool]) => [name, { description: tool.schema.description }])
);

function withShorthandRefs(lookup, timeline) {
  const aliases = { ...lookup };

  for (const marker of timeline.markers || []) {
    if (marker?.id && aliases[marker.id] === undefined && lookup[`marker-${marker.id}`] !== undefined) {
      aliases[marker.id] = lookup[`marker-${marker.id}`];
    }
  }

  for (const chapter of timeline.chapters || []) {
    if (chapter?.id && aliases[chapter.id] === undefined && lookup[`chapter-${chapter.id}`] !== undefined) {
      aliases[chapter.id] = lookup[`chapter-${chapter.id}`];
    }
  }

  for (const track of timeline.tracks || []) {
    for (const clip of track.clips || []) {
      if (clip?.id && aliases[clip.id] === undefined && lookup[`clip-${clip.id}`] !== undefined) {
        aliases[clip.id] = lookup[`clip-${clip.id}`];
      }
    }
  }

  return aliases;
}
