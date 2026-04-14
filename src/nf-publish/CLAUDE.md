# nf-publish — Native macOS publisher that drives creator portals through WKWebView tabs.

## Build
`cargo check -p nf-publish`

## Core Constraints
- User-visible actions must go through native `NSEvent`; JS is for read/locate/file-dialog work only.
- Keep per-tab command/result/screenshot paths aligned with `state/` helpers and polling.
- Preserve the fixed persistent data-store UUID and Safari-like fingerprint setup in `main.rs`.
- Tabs stay on their platform domains; cross-domain navigation risks losing login state.

## Module Structure
- `main.rs`: app boot, WebKit setup, persistent cookie store
- `commands/` + `keyboard/`: command parsing and native input primitives
- `state/`: tab registry, persistence, navigation, session checks
- `ui/` + `delegates.rs`: window chrome, WKWebView delegates, tab layout
- `polling.rs` + `eval.rs`: command-file loop and JS evaluation helpers
