# Task — R49: Color theme presets

## Goal
Add 3 preset color themes the user can switch between: Default Dark (current), Velvet (purple-pink), Ice (blue-cyan). Changes app accent color and background tint. Persisted in store.

## Requirements

### JS (`runtime/web/src/theme.js`)
- `export const THEMES = { default: {...}, velvet: {...}, ice: {...} }`
- Each theme: `{name, bg, surface, border, text, accent}` (5 CSS var values)
- `export function applyTheme(themeName)` — sets CSS custom properties on `document.documentElement`: `--nf-bg`, `--nf-surface`, `--nf-border`, `--nf-text`, `--nf-accent`
- `export function initTheme(store)` — reads `store.state.theme` (default 'default') and applies on mount; subscribes to changes

### CSS
- `runtime/web/index.html` style block updated to use these CSS vars where possible (at least for #app background, borders, menu accent)
- Non-invasive: existing hardcoded hex can remain for scene colors; only app chrome uses vars

### View menu
- `runtime/web/src/menu.js` — View menu > Theme > [Default / Velvet / Ice] radio-style items
- Click switches theme via store.mutate

### Store
- Add `state.theme: 'default'`

## Technical Constraints
- Pure ES modules, no deps
- All existing tests pass
- No regression of welcome/toast/tutorial color schemes

## Verification Commands
```bash
test -f runtime/web/src/theme.js
grep -qE 'THEMES|applyTheme' runtime/web/src/theme.js
grep -q 'initTheme' runtime/web/index.html
grep -qE 'theme' runtime/web/src/store.js
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo build --workspace
node runtime/web/test/bdd/run.mjs
```
