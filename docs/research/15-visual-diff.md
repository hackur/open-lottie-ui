# Research 15 — Visual diffing for animations

The review screen shows two animations side-by-side. Often the human eye is enough. Sometimes — especially for "remix" outputs — we want a *quantified* diff that highlights what changed.

## What "visual diff" means here

Two related questions:

1. **Did the output change?** Sanity check: did Claude actually do anything?
2. **What changed?** A heatmap or per-region delta to focus the human's attention.

We answer both by sampling frames from both animations and pixel-diffing.

## Tools

### `pixelmatch` (mapbox)

- Repo: [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch).
- Pure JS, ~3 KB, works in Node and the browser.
- API:
  ```ts
  const numDiff = pixelmatch(imgA, imgB, diffOut, w, h, { threshold: 0.1 });
  ```
- Fast on small images (<2 MP), single-threaded, doesn't scale.

### `odiff`

- Repo: [dmtrKovalenko/odiff](https://github.com/dmtrKovalenko/odiff).
- Native (Zig with SIMD: SSE2/AVX2/AVX512/NEON). 6× faster than ImageMagick + pixelmatch on large images.
- npm wrapper `odiff-bin`.
- Below ~1 MP pixelmatch is actually faster (no FFI overhead); above that odiff wins easily.

### `resemble.js`

- Older, slower than both above; we skip.

### Per-frame video tools (`ffmpeg-quality-metrics`, SSIM)

- Overkill for our case. We need a per-pixel mask, not a single quality score.

## Our diff pipeline

```ts
async function diffAnimations(a: LottiePath, b: LottiePath, opts) {
  // 1. Render N matched frames from each.
  const frames = await renderFramesPair(a, b, { count: 8, size: 320 });

  // 2. Per-pair: pick engine by size.
  const engine = opts.size <= 512 ? "pixelmatch" : "odiff";

  // 3. Diff each pair, collect diff masks + counts.
  const results = await Promise.all(frames.map((p) => diffPair(p, engine)));

  // 4. Aggregate.
  return {
    totalDiffPixels: sum(results.map((r) => r.diff)),
    perFrame: results,
    overallChangeRatio: ...,
    heatmap: composite(results.map((r) => r.mask)),  // OR'd mask = "where they ever differ"
  };
}
```

## How we surface it in the UI

- **Toggle**: "Show diff" on the right preview switches it from animation playback to a static heatmap of accumulated diff pixels.
- **Per-frame slider**: scrub to a frame, see the overlay of diff pixels for that frame in red.
- **Single number**: "Changed 14% of frames" badge for at-a-glance triage.

## Edge cases

- **Different durations / `op`s** — we resample to a common `op` first (same number of evenly-spaced frames from each).
- **Different sizes** — render both at the same target size (default 320×320, configurable).
- **Sub-pixel anti-aliasing differences** — set `pixelmatch` threshold = 0.1 (its default; tolerant of AA noise).
- **Animations with only timing changes** — a pure speed change *will* light up many pixels. This is fine; our diff is "literally compare frames", not "compare semantics."

## Performance targets

- Diffing 8 frames at 320×320: ~200 ms with pixelmatch.
- Acceptable for the review screen (one-shot per generation).
- For batch operations we cap parallel diffs at 4 to avoid pegging CPU.

## Sources

- [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch)
- [dmtrKovalenko/odiff](https://github.com/dmtrKovalenko/odiff)
- [Why our visual regression is so slow? — Kovalenko on dev.to](https://dev.to/dmtrkovalenko/why-our-visual-regression-is-so-slow-33dn)
- [HoneyDiff vs odiff vs pixelmatch benchmarks (Vizzly)](https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/)
- [Visual regression testing 101 (Lost Pixel)](https://www.lost-pixel.com/blog/visual-regression-testing-101)
- [Visual diffing algorithms gist (Mathspy)](https://gist.github.com/Mathspy/351b0e74669482abcdd9477bc933c1dd)
