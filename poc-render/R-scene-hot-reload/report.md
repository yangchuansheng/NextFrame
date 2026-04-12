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

Pending validation run. The final measured save-to-next-render latency will be filled in after running `node index.js` and mutating `mySimpleScene.js` during the live loop.

## LOC

Pending final count after install and validation.

## Gotchas

- ESM cache-busting creates a new module instance on every reload, so a very long session can accumulate old module objects in memory.
- File watchers can emit multiple events per save depending on the editor. This POC serializes reloads so duplicate events do not overlap.
- The render loop is 200 ms start-to-start, so worst-case visible latency is just under one loop interval plus file-save and import overhead.
