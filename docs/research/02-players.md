# Research 02 — Lottie player / runtime libraries

A "player" is the code that takes a Lottie JSON (or `.lottie` zip) and renders it on screen. There are several to choose from; for `open-lottie-ui` we need to pick:

- **What we embed in our preview UI** (browser side).
- **What we use server-side** for headless rendering / thumbnails (see `14-headless-render.md`).

## Browser players

### `lottie-web` (Airbnb)

- Repo: [airbnb/lottie-web](https://github.com/airbnb/lottie-web).
- The original; reference implementation. SVG / canvas / HTML renderers selectable at runtime.
- Pros: widest compatibility, every Bodymovin feature works (text, expressions, mattes, gradients), used in 99 % of tutorials, no WASM, zero build complexity.
- Cons: pure JS, single-threaded, can be CPU-heavy on complex animations, larger bundle (~250 KB minified for the SVG renderer alone), no native dotLottie support.
- **Best when:** maximum format compatibility matters; preview-of-arbitrary-user-uploaded files.

### `lottie-react` (LottieFiles)

- Repo: [LottieFiles/lottie-react](https://github.com/LottieFiles/lottie-react).
- Thin React wrapper around `lottie-web`. Same engine, same tradeoffs.
- For `open-lottie-ui`'s preview component this is the obvious starter.

### `@lottiefiles/dotlottie-web` + `@lottiefiles/dotlottie-react`

- Repo: [LottieFiles/dotlottie-web](https://github.com/LottieFiles/dotlottie-web).
- Modern player. Renders via canvas, powered by **ThorVG** under the hood (Samsung's vector graphics engine compiled to WASM via `dotlottie-rs`).
- Supports `.lottie` natively (multi-animation, themes, state machines).
- Pros: smaller payloads, better perf on complex shapes, dotLottie features.
- Cons: WASM blob (~600 KB), partial expression support, occasional rendering deltas vs. lottie-web on edge cases. Forum reports note **single dotlottie-react in some cases is slower than lottie-web in iframe** for small animations — the WASM init cost matters for short playbacks.
- **Best when:** production deployment; we want themes/state machines; payload size is the goal.

### `Skottie` (Skia / Chromium)

- Part of Skia. Rendering exposed via `canvaskit-wasm` in JS. Used by Chrome internally and by some of Google's properties.
- Excellent perf and accuracy but not packaged as a drop-in player; you assemble it from canvaskit bindings.
- **Best when:** server-side headless rendering (canvaskit in Node) where we want pixel-perfect output.

### `rlottie` (Samsung)

- Native (C++) library; primarily for embedded / Tizen.
- Not directly relevant for the browser-side admin, but the **Telegram TGS** ecosystem is built on it, and python-lottie can read TGS — useful if a user drags in a Telegram sticker.

### `thorvg` (LAC / Samsung)

- The vector engine inside `dotlottie-rs`. Has its own wasm/JS bindings (`thorvg-wasm`).
- Lower-level than the LottieFiles dotlottie-web wrapper; we probably don't use it directly unless we need finer control.

## Server-side / headless

We cover these in `14-headless-render.md`. Two viable paths:

1. **`puppeteer-lottie`** — spin up headless Chrome, point it at lottie-web in a page, screenshot frames. Slow but compatible.
2. **`canvaskit-wasm` (Skia) + Skottie in Node** — no browser, runs in pure Node, much faster, somewhat less compatible.
3. **`dotlottie-rs` CLI** — a native binary that can render frames; fastest, but only what ThorVG supports.

## Decision table for `open-lottie-ui`

| Surface | Pick | Reason |
|---|---|---|
| Library preview cards (auto-play on hover) | `dotlottie-react` | Smaller payload, supports both `.json` and `.lottie`. |
| Detail / review preview (full controls, scrubbing, side-by-side) | `lottie-react` (lottie-web) | Best feature compatibility for arbitrary user files; we *want* to see exactly how lottie-web will render. |
| Headless thumbnail generation (server-side) | `puppeteer-lottie` first; evaluate `canvaskit-wasm` if perf is bad | Compatibility wins for v1 thumbnails. |
| Export/repackage to `.lottie` | `dotlottie-js` | Official packager. |

We embed *both* lottie-web and dotlottie-web because the comparison itself is useful — the admin can show "this animation renders differently in dotlottie-web; here's the diff" as a feature.

## Sources

- [airbnb/lottie-web](https://github.com/airbnb/lottie-web)
- [LottieFiles/dotlottie-web](https://github.com/LottieFiles/dotlottie-web)
- [LottieFiles/dotlottie-rs](https://github.com/LottieFiles/dotlottie-rs)
- [LottieFiles Runtimes overview](https://lottiefiles.com/runtimes)
- [Forum — dotlottie-react vs iframe perf](https://forum.lottiefiles.com/t/lottiefiles-dotlottie-react-slower-that-simple-iframe/5982)
- [Forum — community consensus on web players](https://forum.lottiefiles.com/t/what-is-the-communitys-consensus-on-which-web-player-to-use/466)
- [npm-compare lottie-react / react-lottie / react-lottie-player](https://npm-compare.com/lottie-react,react-lottie,react-lottie-player)
- [Samsung/rlottie](https://github.com/Samsung/rlottie)
