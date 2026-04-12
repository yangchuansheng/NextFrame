"use strict";

const GRID_SIZE = 0.1;

function resolveTimeline(timelineWithSymbols) {
  validateTimelineShape(timelineWithSymbols);

  const context = buildContext(timelineWithSymbols);
  const graph = buildDependencyGraph(context);
  const order = topologicallySort(graph);
  const values = resolveValues(graph, order);
  const quantizedValues = quantizeValues(values);

  return {
    timeline: materializeResolvedTimeline(context, quantizedValues),
    lookup: buildLookup(context, quantizedValues),
  };
}

function validateTimelineShape(timeline) {
  if (!timeline || typeof timeline !== "object" || Array.isArray(timeline)) {
    throw new Error("Timeline must be an object.");
  }

  const project = timeline.project || {};

  if (project.end === undefined) {
    throw new Error("Timeline project.end is required so project-end can be resolved.");
  }

  for (const key of ["chapters", "markers", "clips"]) {
    const value = timeline[key];
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`Timeline ${key} must be an array when provided.`);
    }
  }
}

function buildContext(timeline) {
  const context = {
    source: timeline,
    nodes: new Map(),
    refs: new Map(),
    rawFieldPaths: [],
    idsByKind: {
      chapter: new Set(),
      marker: new Set(),
      clip: new Set(),
    },
  };

  const project = timeline.project || {};

  addNode(context, {
    nodeId: "project.start",
    kind: "project",
    entityId: "project",
    field: "start",
    refBase: "project-start",
    value: project.start === undefined ? 0 : project.start,
    path: ["project", "start"],
  });

  addNode(context, {
    nodeId: "project.end",
    kind: "project",
    entityId: "project",
    field: "end",
    refBase: "project-end",
    value: project.end,
    path: ["project", "end"],
  });

  addEntityNodes(context, timeline.chapters || [], "chapter", ["start", "end"]);
  addEntityNodes(context, timeline.markers || [], "marker", ["at"]);
  addEntityNodes(context, timeline.clips || [], "clip", ["start", "end"]);

  return context;
}

function addEntityNodes(context, entities, kind, fields) {
  for (let index = 0; index < entities.length; index += 1) {
    const entity = entities[index];

    if (!entity || typeof entity !== "object" || Array.isArray(entity)) {
      throw new Error(`Each ${kind} must be an object.`);
    }

    if (typeof entity.id !== "string" || entity.id.trim() === "") {
      throw new Error(`Each ${kind} requires a non-empty string id.`);
    }

    const entityId = entity.id.trim();

    if (context.idsByKind[kind].has(entityId)) {
      throw new Error(`Duplicate ${kind} id "${entityId}".`);
    }

    context.idsByKind[kind].add(entityId);

    for (const field of fields) {
      if (entity[field] === undefined) {
        throw new Error(`${kind} "${entityId}" requires a ${field} value.`);
      }

      addNode(context, {
        nodeId: `${kind}.${entityId}.${field}`,
        kind,
        entityId,
        field,
        refBase: `${kind}-${entityId}`,
        value: entity[field],
        path: [`${kind}s`, index, field],
      });
    }
  }
}

function addNode(context, definition) {
  const node = {
    nodeId: definition.nodeId,
    kind: definition.kind,
    entityId: definition.entityId,
    field: definition.field,
    refBase: definition.refBase,
    path: definition.path,
    raw: definition.value,
    expression: parseExpression(definition.value),
    deps: [],
    dependents: [],
  };

  if (context.nodes.has(node.nodeId)) {
    throw new Error(`Duplicate node "${node.nodeId}".`);
  }

  context.nodes.set(node.nodeId, node);
  context.rawFieldPaths.push({ nodeId: node.nodeId, path: node.path });

  registerRef(context.refs, node);
}

function registerRef(refs, node) {
  const canonical = `${node.refBase}.${node.field}`;

  refs.set(canonical, {
    nodeId: node.nodeId,
    kind: node.kind,
    field: node.field,
    refBase: node.refBase,
  });

  if (node.kind === "project") {
    refs.set(node.refBase, {
      nodeId: node.nodeId,
      kind: node.kind,
      field: node.field,
      refBase: node.refBase,
    });
    refs.set(`project.${node.field}`, {
      nodeId: node.nodeId,
      kind: node.kind,
      field: node.field,
      refBase: node.refBase,
    });
    return;
  }

  if (node.kind === "marker" && node.field === "at") {
    refs.set(node.refBase, {
      nodeId: node.nodeId,
      kind: node.kind,
      field: node.field,
      refBase: node.refBase,
    });
    refs.set(node.entityId, {
      nodeId: node.nodeId,
      kind: node.kind,
      field: node.field,
      refBase: node.refBase,
    });
  }

  if ((node.kind === "chapter" || node.kind === "clip") && node.field === "start") {
    refs.set(node.refBase, {
      nodeId: node.nodeId,
      kind: node.kind,
      field: node.field,
      refBase: node.refBase,
    });
  }
}

function parseExpression(value) {
  if (typeof value === "number") {
    return { type: "number", value };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected a number or symbolic object, received ${JSON.stringify(value)}.`);
  }

  const keys = Object.keys(value);
  const operators = ["at", "after", "before", "sync", "until"];
  const present = operators.filter((key) => Object.prototype.hasOwnProperty.call(value, key));

  if (present.length !== 1) {
    throw new Error(`Symbolic expression must contain exactly one operator: ${JSON.stringify(value)}.`);
  }

  const operator = present[0];
  const reference = value[operator];

  if (typeof reference !== "string" || reference.trim() === "") {
    throw new Error(`Expression ${JSON.stringify(value)} must reference a non-empty string symbol.`);
  }

  if (Object.prototype.hasOwnProperty.call(value, "gap") && typeof value.gap !== "number") {
    throw new Error(`Expression ${JSON.stringify(value)} has a non-numeric gap.`);
  }

  const allowedKeys = new Set(["gap", operator]);

  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unsupported key "${key}" in expression ${JSON.stringify(value)}.`);
    }
  }

  return {
    type: "expr",
    operator,
    reference: reference.trim(),
    gap: value.gap === undefined ? 0 : value.gap,
  };
}

function buildDependencyGraph(context) {
  for (const node of context.nodes.values()) {
    if (node.expression.type === "number") {
      continue;
    }

    const dependency = resolveReference(context, node.expression.reference, node.expression.operator);
    node.deps = [dependency.nodeId];
  }

  for (const node of context.nodes.values()) {
    for (const depId of node.deps) {
      const depNode = context.nodes.get(depId);
      depNode.dependents.push(node.nodeId);
    }
  }

  return context.nodes;
}

function resolveReference(context, reference, operator) {
  const direct = context.refs.get(reference);

  if (direct) {
    if (reference.includes(".")) {
      return direct;
    }

    if (operator === "after" && (direct.kind === "chapter" || direct.kind === "clip")) {
      return getRequiredRef(context, `${direct.refBase}.end`);
    }

    return direct;
  }

  const implicit = inferImplicitReference(context, reference, operator);

  if (implicit) {
    return implicit;
  }

  throw new Error(`Invalid reference "${reference}".`);
}

function inferImplicitReference(context, reference, operator) {
  if (reference.startsWith("chapter-")) {
    const chapterId = reference.slice("chapter-".length);
    const field = operator === "after" ? "end" : "start";
    return getOptionalRef(context, `chapter-${chapterId}.${field}`);
  }

  if (reference.startsWith("clip-")) {
    const clipId = reference.slice("clip-".length);
    const field = operator === "after" ? "end" : "start";
    return getOptionalRef(context, `clip-${clipId}.${field}`);
  }

  if (reference.startsWith("marker-")) {
    const markerId = reference.slice("marker-".length);
    return getOptionalRef(context, `marker-${markerId}.at`);
  }

  return null;
}

function getOptionalRef(context, key) {
  return context.refs.get(key) || null;
}

function getRequiredRef(context, key) {
  const ref = context.refs.get(key);

  if (!ref) {
    throw new Error(`Invalid reference "${key}".`);
  }

  return ref;
}

function topologicallySort(nodes) {
  const indegree = new Map();

  for (const node of nodes.values()) {
    indegree.set(node.nodeId, node.deps.length);
  }

  const ready = [];

  for (const node of nodes.values()) {
    if (indegree.get(node.nodeId) === 0) {
      ready.push(node.nodeId);
    }
  }

  const order = [];

  while (ready.length > 0) {
    const currentId = ready.shift();
    order.push(currentId);

    const current = nodes.get(currentId);

    for (const dependentId of current.dependents) {
      const next = indegree.get(dependentId) - 1;
      indegree.set(dependentId, next);

      if (next === 0) {
        ready.push(dependentId);
      }
    }
  }

  if (order.length !== nodes.size) {
    const cyclicNodes = [...nodes.keys()].filter((nodeId) => !order.includes(nodeId));
    throw new Error(`Cycle detected in symbolic timeline: ${cyclicNodes.join(", ")}.`);
  }

  return order;
}

function resolveValues(nodes, order) {
  const values = new Map();

  for (const nodeId of order) {
    const node = nodes.get(nodeId);

    if (node.expression.type === "number") {
      values.set(nodeId, node.expression.value);
      continue;
    }

    const referenceValue = values.get(node.deps[0]);
    const resolved = evaluateExpression(node.expression, referenceValue);
    values.set(nodeId, resolved);
  }

  validateResolvedRanges(nodes, values);

  return values;
}

function evaluateExpression(expression, referenceValue) {
  switch (expression.operator) {
    case "at":
    case "sync":
    case "until":
      return referenceValue;
    case "after":
      return referenceValue + expression.gap;
    case "before":
      return referenceValue - expression.gap;
    default:
      throw new Error(`Unsupported operator "${expression.operator}".`);
  }
}

function validateResolvedRanges(nodes, values) {
  for (const node of nodes.values()) {
    if (node.field !== "start") {
      continue;
    }

    const endNodeId = `${node.kind}.${node.entityId}.end`;

    if (!nodes.has(endNodeId)) {
      continue;
    }

    const startValue = values.get(node.nodeId);
    const endValue = values.get(endNodeId);

    if (startValue > endValue) {
      throw new Error(`${node.kind} "${node.entityId}" resolves to start > end.`);
    }
  }
}

function quantizeValues(values) {
  const quantized = new Map();

  for (const [nodeId, value] of values.entries()) {
    quantized.set(nodeId, quantize(value));
  }

  return quantized;
}

function quantize(value) {
  const scaled = Math.round((value + 1e-9) * 10);
  return Number((scaled / 10).toFixed(1));
}

function materializeResolvedTimeline(context, values) {
  const resolved = deepClone(context.source);

  for (const entry of context.rawFieldPaths) {
    setPathValue(resolved, entry.path, values.get(entry.nodeId));
  }

  return resolved;
}

function buildLookup(context, values) {
  const lookup = {};

  lookup["project-start"] = values.get("project.start");
  lookup["project-end"] = values.get("project.end");
  lookup["project.start"] = values.get("project.start");
  lookup["project.end"] = values.get("project.end");

  for (const node of context.nodes.values()) {
    if (node.kind === "project") {
      continue;
    }

    const base = node.refBase;
    const explicit = `${base}.${node.field}`;
    const value = values.get(node.nodeId);

    lookup[explicit] = value;

    if (node.kind === "marker" && node.field === "at") {
      lookup[base] = value;
      lookup[node.entityId] = value;
    }

    if ((node.kind === "chapter" || node.kind === "clip") && node.field === "start") {
      lookup[base] = value;
    }
  }

  return lookup;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setPathValue(target, path, value) {
  let cursor = target;

  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor[path[index]];
  }

  cursor[path[path.length - 1]] = value;
}

module.exports = {
  GRID_SIZE,
  resolveTimeline,
};
