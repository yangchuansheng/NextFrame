# Contributing

Full contract: [`spec/architecture/08-contract-first.md`](../spec/architecture/08-contract-first.md)

## Add a scene

1. Create `src/scenes/<id>.js` exporting `function <id>(t, params, ctx, globalT)`.
2. Edit `src/scenes/index.js` to add the import, `META_TABLE` entry, and `RENDER_FNS` entry.
3. Run `node --test test/scene-contract.test.js` and `node --test test/architecture.test.js`.

## Add a CLI subcommand

1. Create `src/cli/<verb>.js` exporting `async function run(argv, ctx)`.
2. Register the verb in `bin/nextframe.js` `SUBCOMMANDS`.
3. Add the 5-file BDD module under `spec/cockpit-app/bdd/cli-<verb>/`.

## Add an AI tool

1. Add an entry to `src/ai/tools.js` `TOOLS` with `schema` and `handler`.
2. Run `node --test test/architecture.test.js`.

## Run tests

`node --test test/`
