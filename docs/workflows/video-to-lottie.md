# Workflow — Video / GIF / WebP to Lottie

The reverse direction: take a raster animation (`.mp4`, `.mov`, `.gif`, `.apng`, animated `.webp`) and produce a Lottie JSON file. This is one of the most-asked-for features on the LottieFiles forum and one of the **most likely to disappoint**, because Lottie is fundamentally vector and video is fundamentally raster. There is no lossless conversion. There are only tradeoffs.

This document walks through the three viable strategies, their failure modes, and a recommendation for `open-lottie-ui`. It is research + a workplan; nothing is implemented yet.

## 1. Honest framing

Lottie is a JSON description of vector shapes (`ty: 4`), images (`ty: 2`), text (`ty: 5`), and a handful of more exotic layer types, with keyframed transforms. Video is a stream of rasterised pixels.

There are three strategies for getting from one to the other, and they produce **very different** outputs:

1. **Image-layer wrapping.** Embed each frame as a base64-encoded PNG inside a Lottie image asset (`ty: 2`), use opacity keyframes to flip from one frame to the next, ship the result as a single `.json`. The output *is* a valid Lottie that any compliant player will play. But it has the file size of a video plus 33 % base64 overhead, and you get **none** of the benefits of being a Lottie (no scalability, no theming, no recolouring, no font swap). It is a video pretending to be a Lottie. The honest name for this is "raster slideshow."
2. **Vector tracing.** Convert each frame to SVG via `vtracer`, `potrace`, or autotrace; parse the SVG paths; emit them as Lottie shape items (`ty: 4`, `sh` shape with `ks` keyframes). The output is a "real" Lottie made of paths. Quality varies wildly: simple flat-coloured logos with sharp edges trace fine; photographs and gradients become unrecognisable jitter. Path counts explode (thousands of shapes per frame), file sizes and CPU usage in the player can be worse than the video. Inter-frame jitter is the killer — without temporal coherence, every frame's traced paths re-flow slightly, producing a "boiling" effect.
3. **Hybrid (manual).** Vectorise selected elements (background, logo, text) once and animate them with transform keyframes; leave moving photographic content as raster image layers. This is what After Effects + Bodymovin produces when a designer rotoscopes by hand. Quality is excellent because a human is in the loop; throughput is one minute of animation per several hours of work. Not automatable.

The right answer for *most* incoming videos is "do not convert, just use the video." We expose this honestly in the UI: when a user uploads a video, we offer Lottie conversion only with explicit warning copy, and we offer "embed as a video asset" as the primary path.

## 2. Tool survey

| Tool | Approach | License | Notes |
|---|---|---|---|
| Adobe After Effects + [Bodymovin](https://github.com/airbnb/lottie-web/tree/master/extension) | Hybrid; manual rotoscoping | proprietary (AE), MIT (Bodymovin) | The de-facto pro pipeline. Designer rotos in AE, exports via Bodymovin. Excellent results, no automation. |
| [LottieFiles "Video to Lottie"](https://lottiefiles.com/tools/video-to-lottie) | Image-layer wrapping (per their FAQ) | proprietary, login required | Mass-market converter; output is a heavy slideshow Lottie. |
| [LottieFyr](https://lottiefyr.com/) | Image-layer wrapping ("traces motion" in marketing copy; output behaviour matches slideshow) | proprietary | Free, no login. Practical sanity-check tool. |
| [VizGPT Video to Lottie](https://vizgpt.ai/tools/video-to-lottie-converter) | Browser-based; image-layer (their own description) | proprietary | Useful as reference for the output shape. |
| [`mp4tolottie`](https://pypi.org/project/mp4tolottie/) | Frame extraction + image-layer | unspecified — confirm before depending | Python package. Couldn't reach the homepage during research; treat as unverified. |
| [`giftolottie`](https://github.com/bodqhrohro/giftolottie) | Image-layer (TGS / Telegram sticker target) | MIT | Tiny, archived feel. The author notes Telegram itself moved to WebM stickers in 2022, so the project is largely historical. Useful as an MIT-licensed reference implementation of "GIF frames → Lottie shapes" written from scratch against the lottie-web JSON schema. |
| [vtracer](https://github.com/visioncortex/vtracer) | Vector tracing of one frame at a time | MIT | The best open-source raster→SVG tracer. Handles colour images. CLI flags for colour/precision/segment length. Per-frame output is fine; you must stitch into Lottie yourself. |
| [potrace](https://potrace.sourceforge.net/) | Vector tracing — black & white only | GPL-2.0 | The classic. Excellent for monochrome logos; not useful for colour video. **GPL boundary** — must shell out to the binary, never link the C library, per `research/16-licenses.md`. |
| [autotrace](https://github.com/autotrace/autotrace) | Vector tracing — colour | GPL-2.0 | Older than vtracer; output is generally lower quality but supports a wider range of input formats. Same GPL-boundary rules as potrace. |
| [Glaxnimate](https://glaxnimate.org/) | Manual hybrid (per-frame edit) | GPL-3.0 | Open-source desktop editor we already wire as a roundtrip plugin. Designer can import an MP4 reference layer, draw paths over it, export Lottie. |
| [Synfig Studio](https://www.synfig.com/) | Manual hybrid | GPL-3.0 | Alternative to Glaxnimate; not currently in our plugin list. |
| Rive | Closed pipeline; their video-to-anim feature is internal-only | proprietary | Worth tracking; not usable from our app. |
| [SVGator](https://www.svgator.com/) | Designer tool with a "video import" step | proprietary | SaaS; limited automation hooks. |
| Various "animaker / online converter" sites | Image-layer wrapping (mostly) | varies, often unclear | Avoid. Many produce broken JSON or upload your file to an unknown server. We do not depend on any of these. |

The short version: open-source coverage of "video to Lottie" in 2026 is poor. The two paths that actually exist are (a) image-layer wrapping with ffmpeg + a small JSON serializer, and (b) per-frame vtracer plus a custom path stitcher. Everything else is either proprietary, manual, or marketing.

## 3. Per-format input considerations

| Format | Alpha | Container | Per-frame extraction |
|---|---|---|---|
| `.mp4` (H.264 / H.265 yuv420p) | none | streamable | `ffmpeg -i in.mp4 -vf "fps=30" frame_%04d.png` |
| `.mov` (ProRes 4444 / qtrle) | yes (`yuva444p10le` / `rgba`) | not always seekable | as above; ffmpeg auto-detects alpha and writes RGBA PNGs |
| `.mov` (HEVC alpha, Apple) | yes | needs VideoToolbox-enabled ffmpeg | as above |
| `.webm` (VP9 yuva420p) | yes | streamable | as above |
| `.gif` | 1-bit binary mask | yes (per-frame) | `ffmpeg -i in.gif frame_%04d.png` — beware indexed colour; force `-pix_fmt rgba` to avoid palette artefacts |
| `.apng` | 8-bit | yes | `ffmpeg -i in.apng frame_%04d.png` (modern ffmpeg builds) |
| Animated WebP | 8-bit | yes | ffmpeg's animated webp decoder is patchy; use `anim_dump` (libwebp) or ImageMagick when ffmpeg drops frames |

For all of the above, normalise to PNG with RGBA before going further:

```bash
ffmpeg -i input.gif -vf "fps=30,scale=400:-1:flags=lanczos,format=rgba" frame_%04d.png
```

(force-converting to RGBA up front saves a class of "alpha was indexed and we lost it" bugs).

## 4. Workflow A — ffmpeg + image-layer Lottie (the cheap path)

Cheap, works, output is enormous.

### 4a. Extract frames

```bash
ffmpeg -i input.mp4 -vf "fps=30,scale=400:-1:flags=lanczos,format=rgba" frame_%04d.png
```

Optional: re-encode each PNG to a smaller PNG with `pngquant` or to WebP to roughly halve the file size:

```bash
for f in frame_*.png; do pngquant --quality=80-95 --output "$f" --force "$f"; done
```

Or, for WebP:

```bash
for f in frame_*.png; do
  cwebp -q 80 "$f" -o "${f%.png}.webp"
done
```

Lottie image assets are typed by the data URL prefix (`data:image/png;base64,…` vs `data:image/webp;base64,…`). lottie-web supports both since v5.7. dotlottie-rs / Skottie are PNG-only — if you need broad runtime support, stick to PNG.

### 4b. Assemble the Lottie JSON

The schema (per `lottie-docs/assets`):

```json
{
  "v": "5.9.0",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 400,
  "h": 400,
  "nm": "raster slideshow",
  "assets": [
    { "id": "f0001", "w": 400, "h": 400, "e": 1, "u": "", "p": "data:image/png;base64,..." },
    { "id": "f0002", "w": 400, "h": 400, "e": 1, "u": "", "p": "data:image/png;base64,..." }
    /* ... one per frame ... */
  ],
  "layers": [
    {
      "ddd": 0, "ind": 1, "ty": 2, "nm": "f0001",
      "refId": "f0001",
      "ks": { "o": { "a": 1, "k": [
        { "t": 0,  "s": [100] },
        { "t": 1,  "s": [0]   }
      ]}, "p": { "a": 0, "k": [200, 200, 0] }, "a": { "a": 0, "k": [200, 200, 0] }, "s": { "a": 0, "k": [100, 100, 100] }, "r": { "a": 0, "k": 0 }},
      "ip": 0, "op": 1, "st": 0, "bm": 0
    }
    /* ... one image layer per frame, ip = frame index, op = frame index + 1 ... */
  ],
  "meta": { "g": "open-lottie-ui video import" }
}
```

A more compact variant uses **one image layer with the asset reference swapped via slot expressions** — but slot expressions are a Lottie 1.0 spec feature with patchy player support, and the layer-per-frame model is the safest target.

Pseudo-code for the encoder (would live in `packages/lottie-tools/src/video-import.ts`):

```ts
import fs from 'node:fs';
import path from 'node:path';

export function buildSlideshowLottie(frameDir: string, fps = 30, w = 400, h = 400) {
  const frames = fs.readdirSync(frameDir).filter(f => /^frame_\d+\.png$/.test(f)).sort();
  const op = frames.length;

  const assets = frames.map((f, i) => ({
    id: `f${String(i).padStart(4, '0')}`,
    w, h, e: 1, u: '',
    p: `data:image/png;base64,${fs.readFileSync(path.join(frameDir, f)).toString('base64')}`,
  }));

  const layers = frames.map((_, i) => ({
    ddd: 0, ind: i + 1, ty: 2, nm: assets[i].id, refId: assets[i].id,
    ks: { o: { a: 0, k: 100 }, p: { a: 0, k: [w / 2, h / 2, 0] }, a: { a: 0, k: [w / 2, h / 2, 0] }, s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 } },
    ip: i, op: i + 1, st: 0, bm: 0,
  }));

  return { v: '5.9.0', fr: fps, ip: 0, op, w, h, nm: 'video import', assets, layers, meta: { g: 'open-lottie-ui' } };
}
```

### 4c. Caveats

- **File size** is the entire video (lossy or lossless) plus ~33 % base64 overhead. A 5-second 400×400 video at 30 fps becomes a ~10–40 MB JSON. lottie-web parses this fine; mobile runtimes struggle. dotLottie packaging (`.lottie`, ZIP-encoded) reclaims most of the overhead — see the dotLottie wrapping in our `dotlottie-pack` plugin.
- **Player support**. lottie-web — full. Skottie — yes for PNG, less reliably for WebP. lottie-android / lottie-ios — both fine on PNG; both hit performance walls on dozens of full-frame image swaps per second on low-end devices.
- **Recolouring / theming** is not possible: the pixels are baked in.
- **Looping** is fine; just leave `op` at the last-frame index and let the player loop.

### 4d. Why offer this anyway?

Because it is exactly what users *think* "video to Lottie" means when they ask for it. Designers want a single file that they can drop into a Lottie player and ship. They do not, generally, want to redraw their video in vectors. Offering this path with an explicit "this will be a heavy file" warning and a size readout is the user-respectful answer. Keep them in our app rather than redirecting them to a sketchy online converter.

## 5. Workflow B — vtracer per frame

A real attempt at a "vector Lottie." Useful for short animations of simple flat-coloured graphics — animated logos, icon transitions, line-art mascots. Hopeless for photographic content.

### 5a. Extract + trace each frame

```bash
ffmpeg -i input.mp4 -vf "fps=15,scale=400:-1:flags=lanczos,format=rgba" frame_%04d.png

for f in frame_*.png; do
  vtracer --input "$f" --output "${f%.png}.svg" \
    --colormode color --filter_speckle 4 \
    --color_precision 6 --gradient_step 16 \
    --mode polygon --segment_length 4
done
```

Notes on the vtracer flags:

- `--colormode color` — keep it; `bw` collapses every shape to one of two values.
- `--filter_speckle 4` — drops single-pixel noise; raise to 8 for noisier sources.
- `--mode polygon` — straight-line polygons; faster + cheaper Lottie than `spline`. `spline` is closer to the source for smooth curves but doubles the path-point count.
- `--color_precision 6` — quantises to ~64 colours per channel; lower for posterized output.
- The *biggest* lever for inter-frame jitter is `--segment_length`; high values smooth the boil but lose detail.

### 5b. Stitch SVGs into a Lottie

Each SVG becomes a stack of `ty: 4` shape layers. The stitcher needs to:

1. Parse each `<path d="…">`.
2. Convert SVG path commands to Lottie's bezier `sh` shape format (`{ "ks": { "k": { "i": [...], "o": [...], "v": [...], "c": true }}}`). This is the heart of every SVG-to-Lottie tool that exists; the canonical references are `python-lottie`'s `parsers.svg` module and `@lottiefiles/lottie-types`.
3. Emit colour as a `fl` (fill) with the SVG path's resolved fill colour.
4. Wrap into a layer per frame with `ip = frame_index`, `op = frame_index + 1`, opacity `100`.

Or — simpler, much heavier — use a single layer per *path*, with keyframes on `sh.ks.k` for the path data so the path morphs across frames. This produces dramatically smaller files for animations where the same number of paths persist across frames, but vtracer makes no such guarantee, so the path topology changes every frame and morphing is unsound. We don't recommend the morph variant for any automated pipeline.

### 5c. Caveats

- **Jitter / boiling.** Inter-frame coherence is the problem nobody has solved end-to-end without a human in the loop. The output will look like the source ran through a "trace bitmap" filter every frame, because that is exactly what happened.
- **Path counts explode.** A typical real-world frame from vtracer at default settings produces 40–200 paths. At 30 fps × 5 seconds × 100 paths = 15 000 paths in the file. Lottie players handle this but performance suffers.
- **Gradients, blur, glow effects** in the source video will be approximated as banded flat-colour regions. Gradient ramps especially become "stairs."
- **Text** does not survive: vtracer cannot recover glyphs as text (we'd need OCR + glyph re-injection, which is a research project unto itself).

### 5d. When to actually try this

- The source is a 1–3 second flat-coloured logo intro at 12–15 fps. Result is usable.
- The source is a moving photo / video footage. Result is unusable; offer Workflow A instead.

We gate this behind a "Try vector trace (experimental)" affordance in the UI with an explicit preview; if the user dislikes it, they fall back to Workflow A.

## 6. Workflow C — hand-tracing in Glaxnimate / Synfig

For when the user is willing to spend manual time. This is exactly what `plugins/glaxnimate-roundtrip/` already does for editing existing Lottie files; for a video import, the flow is:

1. User uploads `input.mp4`.
2. We extract frames with ffmpeg (workflow A's command).
3. We open Glaxnimate with the frames as a reference layer (Glaxnimate supports image-sequence reference layers natively).
4. Designer manually traces shapes / sets keyframes.
5. Designer saves; we re-import the `.json` via the existing roundtrip plugin.

Glaxnimate is GPL-3.0; the boundary rules from `research/16-licenses.md` apply (we shell out, never link). We have a head-start here because the plugin already exists.

## 7. Recommended pipeline for open-lottie-ui

For M1: **ship Workflow A** as the only automated path, behind explicit warning copy.

UI sketch on `/import`:

```
┌─────────────────────────────────────────────────────────┐
│ Drop a file...   [ select ]                            │
│ Accepted: .json, .lottie, .svg, .mp4, .gif, .webp     │
│                                                        │
│ ── selected: my-clip.mp4 ──────────────────────────── │
│   Resolution: 1280×720      Duration: 4.2s @ 30 fps  │
│                                                        │
│ This is a video file. Lottie cannot represent video    │
│ losslessly. Choose how to convert:                    │
│                                                        │
│ ( ) Embed as raster slideshow (recommended)            │
│       Output ≈ 12 MB JSON (8.5 MB after dotLottie zip)│
│       Plays everywhere lottie-web plays.              │
│                                                        │
│ ( ) Vector trace each frame (experimental)             │
│       Best for flat logos / icons. Likely to look      │
│       jittery on photographic content.                 │
│                                                        │
│ ( ) Don't convert; keep as a video asset              │
│       (We'll store it but it won't be in the Lottie   │
│       library — we'll add it under /assets.)         │
│                                                        │
│  [ Cancel ]                              [ Import → ] │
└─────────────────────────────────────────────────────────┘
```

Server route `/api/import/video`:

1. Accept the upload, write to a tmpdir.
2. Probe with `ffprobe` (already an ffmpeg dep). Reject anything > 10 s @ 30 fps for the first iteration; warn.
3. If user picked **slideshow**:
   1. `ffmpeg` → frames.
   2. `pngquant` → smaller frames.
   3. `buildSlideshowLottie()` (sketched above) → `final.json`.
   4. Optionally pack as `.lottie` via the existing `dotlottie-pack` plugin.
4. If user picked **vector trace**:
   1. Frames + vtracer per frame.
   2. SVG → Lottie shape-layer stitcher (would live in `packages/lottie-tools/src/svg-stitch.ts`, and reuses the SVG path parser we already need for the `svg-import` plugin).
   3. Produce `final.json`; show a preview alongside the original video; let the user accept or reject.
5. If user picked **keep as video**: write to `assets/{id}/source.<ext>` and add a thumbnail; do not generate a Lottie.

For M2: lift the 10-second limit, expose framerate / resolution controls, ship Workflow C (Glaxnimate roundtrip with image-sequence reference layer).

For M3+: serious vector quality work. Possibilities — temporal coherence by warping the previous frame's path topology onto the new frame; OCR for text re-injection; segmentation-aware tracing. None of this is shovel-ready in 2026 OSS; treat as research.

## 8. Limitations / when NOT to do this

Be candid in copy and in support docs:

- For **photographs / film footage**, Workflow A produces a JSON the size of the video; Workflow B produces a recognisable but jittery vector caricature. Neither is what the user wanted. The right answer is "ship as video; embed in a `<video>` next to the Lottie if you must combine."
- For **screen recordings** with text, Workflow A is okay-but-large; Workflow B will turn the text into illegible blobs.
- For **animated icons / logos** with simple flat-colour fills, Workflow B is genuinely useful. The per-frame trace will be slightly noisy, but the file will be small and recolourable.
- For **GIF stickers** with hard edges and palette colours, Workflow A is fine and small. Many "GIF to Lottie" use cases come from this category and the slideshow output is genuinely a good answer.
- For anything where the user wants **runtime theming / recolouring**, neither path delivers. Theming requires path-level shapes with semantic naming, which is exactly what a designer produces in After Effects — there's no shortcut.

The single best feature we can add is **honest preview + size readout before they hit "Import"**, so they discover the limitations before they've waited on a long render.

## 9. Sources

- [LottieFiles "Video to Lottie" tool](https://lottiefiles.com/tools/video-to-lottie) — the most-asked-about commercial reference; output is image-layer wrapping.
- [LottieFyr — GIF & MP4 to Lottie / JSON](https://lottiefyr.com/) — free converter; useful as a sanity check on what the slideshow output looks like.
- [VizGPT Video to Lottie Converter](https://vizgpt.ai/tools/video-to-lottie-converter) — browser-based; reference output.
- [`mp4tolottie` on PyPI](https://pypi.org/project/mp4tolottie/) — Python library; image-layer; verify before depending.
- [`giftolottie` on GitHub (bodqhrohro)](https://github.com/bodqhrohro/giftolottie) — MIT, hand-rolled GIF → Lottie/TGS encoder. Reference for the schema-from-scratch approach.
- [`vtracer` on GitHub (visioncortex)](https://github.com/visioncortex/vtracer) — MIT raster→SVG tracer; the best open-source colour tracer in 2026. CLI flags documented.
- [`vtracer` CLI README](https://github.com/visioncortex/vtracer/blob/master/cmdapp/vtracer/README.md) — full flag matrix, presets (`bw`, `poster`, `photo`).
- [`potrace` homepage](https://potrace.sourceforge.net/) — black-and-white tracer (GPL-2.0). Reference algorithm.
- [`autotrace` on GitHub](https://github.com/autotrace/autotrace) — colour-capable older tracer (GPL-2.0).
- [Lottie Docs — Assets schema](https://lottiefiles.github.io/lottie-docs/assets/) — definitive reference for the embedded image asset (`e: 1`, `p: "data:image/png;base64,…"`) used by Workflow A.
- [airbnb/lottie-web Issue #372 — base64 PNG embedding](https://github.com/airbnb/lottie-web/issues/372) — community confirmation that lottie-web parses inline base64 PNG assets.
- [airbnb/lottie-web Issue #2001 — Improvement: base64 images](https://github.com/airbnb/lottie-web/issues/2001) — discussion of file-size implications of the approach.
- [Adobe — How to rotoscope in After Effects](https://makeitcenter.adobe.com/en/blog/rotoscope-after-effects.html) — the manual hybrid pipeline; baseline reference for Workflow C.
- [Boris FX — What is Rotoscoping in After Effects](https://borisfx.com/blog/what-is-rotoscoping-in-after-effects-in-2023/) — overview of the pro pipeline.
- [Glaxnimate](https://glaxnimate.org/) — GPL-3.0 OSS desktop editor with image-sequence reference layers; powers our roundtrip plugin.
- [ImageMagick discussion — extract frames from GIF / APNG / WebP](https://github.com/ImageMagick/ImageMagick/discussions/7158) — covers the awkward cases ffmpeg doesn't handle (especially animated WebP).
- [`ed-asriyan/lottie-converter`](https://github.com/ed-asriyan/lottie-converter) — MIT, primarily Lottie → raster, but its WebM and APNG inverse references are useful.
- [Lottielab](https://www.lottielab.com/) — proprietary commercial reference for what good vector-import tooling looks like.
- [Webflow forum — convert MP4 to Lottie](https://www.flowradar.com/answer/convert-MP4-files-to-LottieFiles-using-Webflow) — captures the user expectation gap that this doc addresses.
- [Webflow forum — convert regular videos to Lottie](https://www.flowradar.com/answer/convert-videos-to-lottie-format-for-webflow) — same gap, slightly different framing.
