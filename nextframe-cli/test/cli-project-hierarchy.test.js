import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const CLI = resolve(ROOT, "bin/nextframe.js");

function runCli(args) {
  return spawnSync("node", [CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });
}

function runJson(args, expectedStatus = 0) {
  const run = runCli(args);
  assert.equal(run.status, expectedStatus, run.stderr || run.stdout);
  return JSON.parse(run.stdout);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function tmpRoot(label) {
  return join(tmpdir(), `${label}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

function cleanup(path) {
  rmSync(path, { recursive: true, force: true });
}

test("cli-projects-1: project-new creates project metadata and project-list reports it", () => {
  const root = tmpRoot("cli-projects-1");
  try {
    mkdirSync(root, { recursive: true });

    const created = runJson(["project-new", "alpha", `--root=${root}`, "--json"]);
    const projectPath = join(root, "alpha");
    const projectFile = join(projectPath, "project.json");

    assert.deepEqual(created, { ok: true, path: projectPath });
    assert.ok(existsSync(projectFile));

    const project = readJson(projectFile);
    assert.equal(project.name, "alpha");
    assert.match(project.created, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(project.updated, project.created);

    const listed = runJson(["project-list", `--root=${root}`, "--json"]);
    assert.equal(listed.ok, true);
    assert.equal(listed.projects.length, 1);
    assert.equal(listed.projects[0].name, "alpha");
    assert.equal(listed.projects[0].path, projectPath);
    assert.equal(listed.projects[0].episodes, 0);
    assert.equal(listed.projects[0].updated, project.updated);

    const plain = runCli(["project-list", `--root=${root}`]);
    assert.equal(plain.status, 0, plain.stderr);
    assert.match(plain.stdout, /NAME/);
    assert.match(plain.stdout, /EPISODES/);
    assert.match(plain.stdout, /LAST UPDATED/);
    assert.match(plain.stdout, /alpha/);
    assert.match(plain.stdout, /\b0\b/);
  } finally {
    cleanup(root);
  }
});

test("cli-projects-2: episode-new assigns sequential order and updates the parent project", () => {
  const root = tmpRoot("cli-projects-2");
  try {
    mkdirSync(root, { recursive: true });
    runJson(["project-new", "series", `--root=${root}`, "--json"]);

    const projectFile = join(root, "series", "project.json");
    const original = readJson(projectFile);
    original.updated = "2000-01-01T00:00:00.000Z";
    writeFileSync(projectFile, JSON.stringify(original, null, 2) + "\n");

    runJson(["episode-new", "series", "zeta", `--root=${root}`, "--json"]);
    runJson(["episode-new", "series", "alpha", `--root=${root}`, "--json"]);

    const zeta = readJson(join(root, "series", "zeta", "episode.json"));
    const alpha = readJson(join(root, "series", "alpha", "episode.json"));
    const project = readJson(projectFile);

    assert.equal(zeta.name, "zeta");
    assert.equal(zeta.order, 1);
    assert.match(zeta.created, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(alpha.name, "alpha");
    assert.equal(alpha.order, 2);
    assert.notEqual(project.updated, "2000-01-01T00:00:00.000Z");
  } finally {
    cleanup(root);
  }
});

test("cli-projects-3: episode-list aggregates segment counts and durations sorted by episode order", () => {
  const root = tmpRoot("cli-projects-3");
  try {
    mkdirSync(root, { recursive: true });
    runJson(["project-new", "series", `--root=${root}`, "--json"]);
    runJson(["episode-new", "series", "zeta", `--root=${root}`, "--json"]);
    runJson(["episode-new", "series", "alpha", `--root=${root}`, "--json"]);

    runJson(["segment-new", "series", "zeta", "intro", `--root=${root}`, "--duration=5", "--json"]);
    runJson(["segment-new", "series", "alpha", "b-roll", `--root=${root}`, "--duration=3", "--json"]);
    runJson(["segment-new", "series", "alpha", "a-intro", `--root=${root}`, "--duration=7", "--json"]);

    const listed = runJson(["episode-list", "series", `--root=${root}`, "--json"]);
    assert.equal(listed.ok, true);
    assert.deepEqual(
      listed.episodes.map((episode) => ({
        name: episode.name,
        order: episode.order,
        segments: episode.segments,
        totalDuration: episode.totalDuration,
      })),
      [
        { name: "zeta", order: 1, segments: 1, totalDuration: 5 },
        { name: "alpha", order: 2, segments: 2, totalDuration: 10 },
      ],
    );
  } finally {
    cleanup(root);
  }
});

test("cli-projects-4: segment-new reuses the empty timeline scaffold and segment-list sorts by filename", () => {
  const root = tmpRoot("cli-projects-4");
  try {
    mkdirSync(root, { recursive: true });
    runJson(["project-new", "series", `--root=${root}`, "--json"]);
    runJson(["episode-new", "series", "alpha", `--root=${root}`, "--json"]);

    const projectFile = join(root, "series", "project.json");
    const original = readJson(projectFile);
    original.updated = "2000-01-01T00:00:00.000Z";
    writeFileSync(projectFile, JSON.stringify(original, null, 2) + "\n");

    const first = runJson([
      "segment-new",
      "series",
      "alpha",
      "b-roll",
      `--root=${root}`,
      "--duration=3",
      "--fps=24",
      "--json",
    ]);
    const second = runJson([
      "segment-new",
      "series",
      "alpha",
      "a-intro",
      `--root=${root}`,
      "--duration=7",
      "--json",
    ]);

    const firstPath = join(root, "series", "alpha", "b-roll.json");
    const secondPath = join(root, "series", "alpha", "a-intro.json");
    assert.deepEqual(first, { ok: true, path: firstPath });
    assert.deepEqual(second, { ok: true, path: secondPath });

    const bRoll = readJson(firstPath);
    assert.equal(bRoll.schema, "nextframe/v0.1");
    assert.equal(bRoll.duration, 3);
    assert.equal(bRoll.project.fps, 24);
    assert.equal(bRoll.project.width, 1920);
    assert.equal(bRoll.project.height, 1080);
    assert.deepEqual(bRoll.chapters, []);
    assert.deepEqual(bRoll.markers, []);
    assert.deepEqual(bRoll.tracks, []);
    assert.deepEqual(bRoll.assets, []);

    const listed = runJson(["segment-list", "series", "alpha", `--root=${root}`, "--json"]);
    assert.equal(listed.ok, true);
    assert.deepEqual(
      listed.segments.map((segment) => ({ name: segment.name, duration: segment.duration })),
      [
        { name: "a-intro", duration: 7 },
        { name: "b-roll", duration: 3 },
      ],
    );
    assert.equal(listed.segments[0].path, secondPath);
    assert.equal(listed.segments[1].path, firstPath);

    const plain = runCli(["segment-list", "series", "alpha", `--root=${root}`]);
    assert.equal(plain.status, 0, plain.stderr);
    assert.match(plain.stdout, /NAME/);
    assert.match(plain.stdout, /PATH/);
    assert.match(plain.stdout, /DURATION/);
    assert.match(plain.stdout, /a-intro/);

    const project = readJson(projectFile);
    assert.notEqual(project.updated, "2000-01-01T00:00:00.000Z");
  } finally {
    cleanup(root);
  }
});
