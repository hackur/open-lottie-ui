# Research 14 — Headless Lottie rendering

We need server-side rendering of frames for:

- **Thumbnails** — every library item shows a still preview frame in the grid.
- **Visual diff** — sample frames at fixed intervals from two animations, pixel-diff (see `15-visual-diff.md`).
- **Export to GIF/MP4/WebM** — chain frames through ffmpeg.
- **Failure detection on generation** — render frame 0 and the midpoint; if both are blank/identical, reject.

## Three viable approaches

### 1. `puppeteer-lottie` (Puppeteer + lottie-web)

- Repo: [transitive-bullshit/puppeteer-lottie](https://github.com/transitive-bullshit/puppeteer-lottie) (npm: `puppeteer-lottie`), CLI: [transitive-bullshit/puppeteer-lottie-cli](https://github.com/transitive-bullshit/puppeteer-lottie-cli), official mirror: [LottieFiles/puppeteer-lottie](https://github.com/LottieFiles/puppeteer-lottie).
- Spins up headless Chrome, loads a page that runs lottie-web, captures each frame.
- API:
  ```ts
  await renderLottie({
    path: "in.json",
    output: "frames/frame-%d.png",         // %d sequence
    captureFrame: 10,                       // single frame for thumbnails
    width: 640,
    deviceScaleFactor: 2,
    style: { background: "transparent" }
  });
  ```
- **Pros**: highest fidelity (lottie-web is the reference renderer), supports text/expressions, transparent background, scaling.
- **Cons**: heavyweight (Chromium ~150 MB install), slow per-frame (tens of ms per screenshot), CPU-bound.

### 2. Skottie via `canvaskit-wasm` in Node

- Skia ships canvaskit as a WASM module that runs in Node. Skottie is the Skia-native Lottie renderer used inside Chrome.
- No browser required, no Chromium binary. Faster per-frame than puppeteer.
- **Pros**: lightweight, fast, deterministic.
- **Cons**: Skottie's compatibility is *similar* to lottie-web but not identical (text, expressions, some shape ops differ). Setup is more involved (loading the wasm, wiring fonts).
- Existing wrapper: [Facundo Paredes' write-up "How I rendered Lottie in NodeJS"](https://medium.com/@facuparedes/how-i-managed-to-render-a-lottie-in-nodejs-for-real-869454d236a7).

### 3. `dotlottie-rs` CLI

- Rust binary that can render frames using ThorVG.
- Fastest of the three; smallest install.
- Compatibility: ThorVG's Lottie support is mature but lags lottie-web on some niche features.

## Decision matrix

| Use | Pick | Why |
|-----|------|-----|
| Thumbnails (fire-and-forget, 1 frame per file, N files at import) | `puppeteer-lottie` (initial) → consider `dotlottie-rs` if perf hurts | Compatibility for arbitrary user-uploaded files. |
| Visual diff sampling (5–10 frames per generation) | `puppeteer-lottie` | We want to compare what lottie-web *actually* renders. |
| GIF/MP4 export | `puppeteer-lottie` → ffmpeg | Same. |
| Failure-detection rendering | `puppeteer-lottie` (low frame count) | Latency budget is tight but the call volume is small. |

## Implementation notes

- **Pool of headless Chromes.** Launching takes ~1 s; pool 1–2 instances and reuse via `puppeteer-cluster` semantics.
- **Cache thumbnails on disk.** A library item's thumbnail under `.cache/thumbs/{id}.png`. Invalidated when the source file's hash changes.
- **Transparent backgrounds.** Default; we composite onto checkerboard in the UI to indicate transparency.
- **Per-frame timing budget.** ~30–50 ms per frame at 320×320 in puppeteer; for a 60-frame visual diff we accept ~3 s wall.
- **Frame numbering policy.** We render at the animation's intrinsic `fr`. For diffs we sample at `[0, op*0.25, op*0.5, op*0.75, op-1]` by default.

## Bonus: framework-free first-frame thumbnail

For library *grids* where 100s of thumbs are needed, even puppeteer is too slow. Cheap fallback:

- Use `lottie-web`'s SVG renderer in a hidden iframe, capture `<svg>` outerHTML, save as `.svg`.
- Render `.svg` to PNG via `sharp` or `resvg-js` (both fast native).
- This is "ssr-on-client" but works and is fast.

We default to this for grid thumbnails and only invoke puppeteer when SVG rendering fails (e.g., the animation uses image layers).

## Sources

- [transitive-bullshit/puppeteer-lottie](https://github.com/transitive-bullshit/puppeteer-lottie)
- [LottieFiles/puppeteer-lottie (mirror)](https://github.com/LottieFiles/puppeteer-lottie)
- [puppeteer-lottie-cli](https://github.com/transitive-bullshit/puppeteer-lottie-cli)
- [puppeteer-lottie on npm](https://www.npmjs.com/package/puppeteer-lottie)
- [How I rendered Lottie in Node.js (no browser) — Paredes](https://medium.com/@facuparedes/how-i-managed-to-render-a-lottie-in-nodejs-for-real-869454d236a7)
- [Generate images with Node + Puppeteer (Volkov)](https://vexell.medium.com/quick-and-simple-way-to-generate-images-with-node-js-and-puppeteer-1cdcb9209d5b)
