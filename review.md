# Review Summary

`complete: false`  
`score: 8/10`

All functional verification passed:

- `node --test test/smoke.test.js` passed
- `node --test test/architecture.test.js` passed
- Scene contract helper verification passed
- `vignette` is registered through the CLI
- `node --test test/` passed with 15/15 tests
- `new -> validate -> render -> ffprobe` passed and produced h264 output
- BDD directories/files exist
- `CONTRIBUTING.md` exists

## Blocking Issues

1. `nextframe-cli/test/smoke.test.js` was modified.
   The task explicitly says to keep the existing smoke test passing **AS-IS** and add new coverage in separate files. The diff shows the scene-list assertion was changed from exact `21` to `>= 21` and a new `vignette` assertion was added. That violates the requirement even though the test still passes.

2. `nextframe-cli/README.md` does not link `CONTRIBUTING.md`.
   `spec/architecture/08-contract-first.md` says T8 verifies that the file exists **and is linked from README**. The contributing file exists, but the README has no reference to it.

## Fix

- Revert `nextframe-cli/test/smoke.test.js` to its original content and keep all new coverage in `test/architecture.test.js` and `test/scene-contract.test.js`.
- Add a `CONTRIBUTING.md` link to `nextframe-cli/README.md`.

Everything else I checked is in good shape, including the architecture tests, guard wiring, scene registry validation, AI tool map, typedefs, vignette scene, and BDD scenario counts.
