# R-scene-hot-reload report

## Setup

- Install: `npm install`
- Run: `node index.js`
- Output: `/tmp/poc-r/latest.png`

## Hot reload test

Run this from the POC directory while `node index.js` is already running:

```sh
sed -i '' 's/const hue = ((params.hue % 360) + 360) % 360;/const hue = ((((params.hue * 2) + 60) % 360) + 360) % 360;/' mySimpleScene.js
```

That mutates the hue formula in-place. The watcher reloads `mySimpleScene.js`, and the next render loop iteration writes a visibly different `/tmp/poc-r/latest.png` without restarting Node.

## How the Node ESM cache-bust works

`import()` in Node caches ESM modules by the fully resolved module URL, not just by pathname. This POC reloads the scene with:

```js
const sceneUrl = `${pathToFileURL(SCENE_PATH).href}?v=${Date.now()}-${serial}`;
await import(sceneUrl);
```

Even though the file on disk is still `mySimpleScene.js`, each `?v=...` query string makes the specifier unique, so Node treats it as a fresh module instance and re-evaluates the file.

## Measured latency

- Measured live by running `node index.js`, then applying the `sed` edit above while the loop was active.
- Save-to-next-render latency: `95.2 ms`
- Validation signal: `/tmp/poc-r/latest.png` changed from SHA1 `2dc1de93c0c8392dfec263c642dd2660c71f8ddc` to `656b8e3aa64c3b1a711b68ad8c7c1e3830b50d25` without restarting Node.

## LOC

- Total POC LOC: `218`

## Gotchas

- ESM cache-busting creates a new module instance on every reload, so a very long session can accumulate old module objects in memory.
- File watchers can emit multiple events per save depending on the editor. This POC serializes reloads so duplicate events do not overlap.
- The render loop is 200 ms start-to-start, so worst-case visible latency is just under one loop interval plus file-save and import overhead.
