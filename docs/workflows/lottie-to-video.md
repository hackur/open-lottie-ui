# Workflow — Lottie to video

How to take a Lottie JSON / dotLottie file and turn it into a real video file. Optimised for the case where the user wants the output to remain transparent (alpha-capable) so it can be composited downstream — e.g. dropped onto footage in CapCut / DaVinci, layered over a hero image, or just shipped to a client whose runtime cannot play Lottie at all.

This document is research + a recommended pipeline for `open-lottie-ui`. No code is written yet; this is a M1 / M2 workplan.

## 1. Problem statement

Designers and developers ask for "Lottie to MP4" for several reasons that look the same on the surface but have very different requirements:

1. **Compositing in a video timeline.** Drop the animation over live footage, a 3D render, or a still photo. Needs **alpha**. A flat-on-white MP4 is useless here — the white halo bleeds onto every frame.
2. **Embedding in a non-Lottie runtime.** Email clients, PowerPoint, broadcast playout, Final Cut Pro for proxy review. Doesn't always need alpha; sometimes a flat MP4 with the brand background baked in is fine.
3. **Shipping to clients without an integrator.** Marketing handoff, "give me an MP4 I can paste into the deck." Usually flat is fine.
4. **Archival of the rendered output.** Same animation, same framerate, no JS player required — useful for regression diffing (see `research/15-visual-diff.md`) and for reproducible build artifacts.

Use cases (1) and (4) are the hard ones because they need to preserve the alpha channel through the encode. The naive `ffmpeg -i frame_%04d.png out.mp4` recipe gives you `yuv420p` and silently drops alpha; this is the single most common gotcha.

The other gotcha: there is no general-purpose alpha codec that works in all browsers, all editors, and all phones at once. Pipelines must pick a target format up front.

## 2. Format requirements for alpha

| Container | Codec | Pixel format | Pros | Cons |
|---|---|---|---|---|
| MOV | ProRes 4444 / 4444 XQ | `yuva444p10le` | Universal in pro NLEs (Premiere, FCP, DaVinci, Avid). 10/12-bit. | Huge files (~300+ Mbps for HD). |
| MOV | QuickTime Animation (qtrle) | `rgba` | Lossless, smaller than ProRes for graphics with flat regions. | Old-school; some modern apps reject it. |
| WebM | VP9 (`libvpx-vp9`) | `yuva420p` | Plays in Chrome/Firefox/Edge with `<video>` and `display: block`. Small. | Safari can't decode alpha; encoding is slow. |
| MOV/MP4 | HEVC with alpha | `yuva420p` (Apple variant) | Plays in Safari, AVFoundation, iOS. | Apple-only ecosystem; ffmpeg builds without VideoToolbox can't write it. |
| PNG sequence | n/a | `rgba` | Universal; lossless. | Massive on disk; no playback as a single file. |
| GIF | n/a | indexed + binary alpha | Universally supported. | 256 colours; alpha is 1-bit (no semi-transparency). Banding/dither always visible. |
| APNG | n/a | `rgba` | 8-bit alpha; supported in modern browsers; small for short loops. | Not playable as a "video" in NLEs. |
| Animated WebP | n/a | `rgba` | Modern; small. | Patchy NLE / phone support; ffmpeg writes via `libwebp_anim`. |

The decision tree we recommend (and bake into the open-lottie-ui plugin):

- "I am compositing this over video" → **ProRes 4444 MOV** (default), **HEVC alpha MOV** if iOS-native is required.
- "I am putting this on a website / in an HTML overlay" → **VP9 WebM** with `yuva420p`. Fall back to **APNG** for short loops where Safari support matters.
- "I want a stills sequence I can hand off" → PNG sequence (always have this as an option; it's the canonical intermediate anyway).
- "I just need a flat MP4 for the deck" → H.264 `yuv420p`, background colour baked in. Fast, universal, no alpha.

## 3. Workflow A — PNG sequence then ffmpeg (canonical)

This is the workflow we recommend as the default. It is the most predictable, most reproducible, and the one the largest community has documented; it also gives the user a frames directory they can inspect with any image viewer if something goes wrong.

### 3a. Render PNG frames

Three ways to produce the PNG sequence:

1. **`puppeteer-lottie`** (Node, MIT). Loads `lottie-web` in headless Chrome, advances a frame at a time, screenshots a transparent canvas. Already in our `inventory/npm-packages.md`. Set `background: 'transparent'` (the CLI default).
2. **`lottie-converter`** (ed-asriyan/lottie-converter, C++ wrapper around `rlottie` / Skia, MIT). Faster than puppeteer; ships in Docker; outputs PNG, APNG, WEBP, GIF, WEBM directly.
3. **Skottie / CanvasKit headless.** Fastest of the three; requires shipping a WASM blob; more work to integrate. See workflow C below.

For M1 we lean on `puppeteer-lottie` because it is already in the dep inventory and Headless Chrome is also already in the inventory for `/library` thumbnailing (see `research/14-headless-render.md`). The performance penalty (Chromium boot) is acceptable for a local-first admin tool — we are not rendering thousands of clips.

```bash
# Hypothetical Node API, called from a server route
import renderLottie from 'puppeteer-lottie';
await renderLottie({
  path: 'animation.json',
  output: 'out/frame_%04d.png',
  width: 800,
  height: 800,
  background: 'transparent',
  fps: 30,
});
```

### 3b. Encode with ffmpeg

Verbatim invocations the user can copy-paste. Each one assumes the working directory contains `frame_0001.png`, `frame_0002.png`, ... at 30 fps.

ProRes 4444, alpha preserved (the safe default for any pro-tool destination):

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le \
  -vendor apl0 -qscale:v 9 \
  -movflags +faststart out_prores4444.mov
```

VP9 in WebM, alpha preserved (web-friendly, ~10x smaller than ProRes):

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -c:v libvpx-vp9 -pix_fmt yuva420p \
  -b:v 2M -auto-alt-ref 0 \
  -metadata:s:v:0 alpha_mode="1" \
  out_vp9.webm
```

Two notes on the VP9 invocation: `-auto-alt-ref 0` is required for alpha; if you leave it on, libvpx silently strips the alpha plane in some builds. The `alpha_mode=1` metadata is what tells some browsers (Chromium especially) to honour transparency on the `<video>` element.

QuickTime Animation (qtrle), alpha preserved, lossless:

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -c:v qtrle -pix_fmt rgba \
  out_qtrle.mov
```

H.265 (HEVC) with alpha — Apple-only, requires VideoToolbox-enabled ffmpeg on macOS:

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -c:v hevc_videotoolbox -alpha_quality 0.75 \
  -tag:v hvc1 -pix_fmt bgra \
  out_hevc_alpha.mov
```

Flat H.264 MP4 with a baked-in white background (no alpha — for the "PowerPoint deck" case):

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -filter_complex "color=white:s=800x800,format=yuv420p[bg];[bg][0]overlay=shortest=1,format=yuv420p" \
  -c:v libx264 -crf 18 -preset slow -movflags +faststart \
  out_flat.mp4
```

Animated WebP, alpha preserved (small, modern browsers; not all NLEs accept it):

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -c:v libwebp_anim -lossless 1 -loop 0 \
  out_anim.webp
```

APNG, alpha preserved:

```bash
ffmpeg -framerate 30 -i frame_%04d.png \
  -plays 0 \
  -f apng out_anim.png
```

### 3c. Caveats

- **Color space.** Lottie has no notion of a colour space; lottie-web rasterises to sRGB. If the destination is a Rec.709 video pipeline, embed `-color_primaries bt709 -color_trc bt709 -colorspace bt709` on the encode and don't expect a perfect match — there will be a small gamma shift on saturated colours. For most marketing use this is invisible; for broadcast it isn't.
- **Frame rate.** Lottie can be rendered at any rate; the JSON `fr` field is just the author's intended rate. Pick the destination's rate (30 / 60 / 24) up front and pass it to both the renderer and ffmpeg. If the rates disagree, ffmpeg will silently duplicate or drop frames.
- **Bit depth.** ProRes 4444 wants 10-bit; PNGs are 8-bit. `yuva444p10le` is fine — the encoder upconverts. If you need true 10-bit out of the renderer you have to use Skottie or render OpenEXR via After Effects, neither of which is in scope for M1.
- **Premultiplied alpha.** lottie-web renders straight (un-premultiplied) alpha. Premiere expects straight; FCP X is happy with either. ffmpeg passes it through unchanged. If you composite straight-alpha frames onto a colour background and see dark fringing, you forgot to premultiply: pre-multiply with the `format=rgba,premultiply` filter or composite as straight in the destination tool.
- **Bitrate.** ProRes is constant-quality; just pick `-qscale:v` 9 (medium) to 4 (high). VP9 wants `-b:v` set; `2M` is a safe starting point for HD logo animation. WebM with alpha is roughly 1.4× the bitrate of the same video without alpha for the same perceived quality.

## 4. Workflow B — browser-side MediaRecorder

If we are already inside the admin's Next.js client, we can render `lottie-web` to a hidden `<canvas>` and capture it with `canvas.captureStream()` + `MediaRecorder`. The output is a WebM blob the user can download immediately, with no Node-side ffmpeg required.

Sketch:

```ts
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 800;
const anim = lottie.loadAnimation({
  container: canvas,
  renderer: 'canvas',
  loop: false,
  autoplay: false,
  animationData,
});

const stream = canvas.captureStream(30);
const recorder = new MediaRecorder(stream, {
  mimeType: 'video/webm;codecs=vp9',
});

const chunks: Blob[] = [];
recorder.ondataavailable = e => chunks.push(e.data);
recorder.onstop = () => download(new Blob(chunks, { type: 'video/webm' }));

recorder.start();
anim.play();
anim.addEventListener('complete', () => recorder.stop());
```

Pros:

- Zero server cost, no ffmpeg dependency for the user.
- Plays well with our preview layer — same renderer, same frames.

Cons:

- Real-time only; can't go faster than wallclock.
- Alpha works in Chrome (`video/webm;codecs=vp9`) but Firefox + Safari are inconsistent. Verify with feature detection at runtime.
- File sizes are larger and bitrates are less controllable than the offline ffmpeg path.
- Not suitable for ProRes / HEVC outputs.

We treat this as a "nice to have" fast-path for the **VP9 WebM** target only; everything else goes through Workflow A.

## 5. Workflow C — Skottie + Skia headless

Google's Skia ships Skottie — a Lottie player implemented in C++/WASM that is significantly faster than lottie-web (no DOM, no JS, native rasterizer). The Skottie team publishes a web demo at `https://skottie.skia.org` but does not ship a precompiled CLI binary; you build it yourself from the Skia source tree, or run the WASM version (`canvaskit`) under Node.

If you go this route the pipeline is:

1. Load the JSON with CanvasKit / `Animation.MakeFromJSON`.
2. For each frame, advance and draw to an offscreen surface (`MakeRenderTarget` or `MakeRasterN32Premul`).
3. Read pixels back as RGBA.
4. Pipe RGBA → ffmpeg via stdin (no PNG round-trip, big speedup).

```bash
# Conceptual: Node script pipes raw RGBA to ffmpeg's rawvideo input
node render-skottie.mjs animation.json | \
  ffmpeg -f rawvideo -pix_fmt rgba -s 800x800 -framerate 30 -i - \
  -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le out.mov
```

Skia/CanvasKit is BSD-licensed; safe for our MIT project. The catch is install footprint (~10 MB WASM blob) and the fact that Skottie is not 100% feature-compatible with lottie-web's renderer — text layers, expressions, and certain mattes can render slightly differently. For M1 we leave Skottie behind a feature flag and exercise it only against the Lottie conformance suite (see `research/19-community.md`).

## 6. Workflow D — dotlottie-rs CLI

LottieFiles' `dotlottie-rs` is a Rust implementation that bundles `rlottie` / Thorvg under the hood. As of the writing of this doc the headless export path is not stable: the published crate `dotlottie-rs@0.1.0-alpha.1` is library-only (we already noted this in `inventory/cli-tools.md`). The `examples/` directory in the repo contains a Node binding that renders one frame at a time to a BMP buffer.

When (and if) `dotlottie-rs` ships a `dotlottie render` subcommand that accepts `--out frames/%04d.png --fps 30` we will swap it in as the preferred renderer for **Workflow A** — it is roughly 5–10× faster than puppeteer-lottie because no Chromium boot. Until then we treat this as a future optimisation.

## 7. Tool inventory

| Tool | License | Notes |
|---|---|---|
| [`puppeteer-lottie`](https://github.com/transitive-bullshit/puppeteer-lottie) | MIT | Last release 2019, but the underlying lottie-web + Puppeteer surface still works. Renders PNG/JPG/MP4/GIF; transparency only on PNG output. |
| [`puppeteer-lottie-cli`](https://github.com/transitive-bullshit/puppeteer-lottie-cli) | MIT | Same author, thin CLI wrapper. v1.0.2 from May 2019; unmaintained but functional. |
| [`lottie-converter`](https://github.com/ed-asriyan/lottie-converter) | MIT | C++; outputs GIF/PNG/APNG/WEBP/WEBM. Ships Docker images. The most fully-featured open-source converter we found. |
| [`LottieConverter`](https://github.com/sot-tech/LottieConverter) | MIT | Smaller scope (PNG + GIF). Useful for reference; not a replacement for the above. |
| [`giftolottie`](https://github.com/bodqhrohro/giftolottie) | MIT | Lottie *encoder* — the reverse direction. See `video-to-lottie.md`. |
| [`skottie_tool` / Skia CanvasKit](https://skia.googlesource.com/skia/+/main/modules/skottie/) | BSD-3-Clause | No published binary; build from source or use the WASM `canvaskit-wasm` npm package. |
| [`dotlottie-rs`](https://github.com/LottieFiles/dotlottie-rs) | MIT | Rust + FFI bindings. CLI is not stable yet (alpha.1). |
| [Lottielab](https://www.lottielab.com/) | proprietary, paid | First-party "Lottie to MP4" online + desktop. Useful as a reference; we don't depend on it. |
| [LottieFiles "Lottie to MP4" tool](https://lottiefiles.com/tools/lottie-to-mp4) | proprietary, free with login | The mass-market converter. Output is flat MP4 only — no transparency. |
| [`html5animationtogif.com` Lottie tools](https://html5animationtogif.com/lottie-to-video) | proprietary, free (ads) | Has an explicit "transparent WebM" option. Useful sanity check for our output. |
| `inlottie` | MIT | Currently macOS GUI-only; not useful for headless rendering. Flagged honestly in `inventory/cli-tools.md`. |
| `ffmpeg` | LGPL-2.1 / GPL-2.0 | The encoder for everything except in-browser MediaRecorder. |

## 8. Recommended pipeline for open-lottie-ui

For M1, ship a single `Export to video` action on each library card:

1. UI: dropdown with three presets — `Pro tools (ProRes 4444 MOV)`, `Web (WebM VP9 alpha)`, `Flat MP4 (no alpha, for decks)`.
2. Server route `/api/export/video/[id]`:
   - Resolves the library item.
   - Calls `puppeteer-lottie` (or our internal `packages/lottie-tools` renderer) into a tmpdir as `frame_%04d.png`.
   - Spawns `ffmpeg` with the appropriate invocation from §3b.
   - Streams progress back over SSE the same way generate/approve already does (see `workflows/generate-approve.md`).
   - On success, writes the file to `library/{id}/exports/<preset>.<ext>` and returns the path.
3. The route is implemented as a plugin under `plugins/` — `plugins/video-export/plugin.json` with `requires: ["ffmpeg"]`. If ffmpeg is missing, the UI button renders disabled and points to `/settings`.

The "flat MP4" preset goes through the `color=…overlay` filter from §3b, taking the background colour from the user's preset (default white).

The "browser-side WebM via MediaRecorder" path stays as a Phase-2 stretch goal; it is faster for small clips (no server roundtrip) but the format coverage matrix is too inconsistent to make it the default.

Beyond M1, candidate add-ons:

- Picture-in-picture / chroma-keyed flat MP4 for runtimes that genuinely cannot do alpha (pre-2020 WhatsApp stickers, broadcast SDI cards). `chromakey=color=0x00FF00:similarity=0.1`.
- Per-frame OpenEXR for VFX pipelines. Requires Skottie or a custom renderer; out of scope for M1.
- Skottie-based renderer behind a flag (Workflow C) once we pin a version of `canvaskit-wasm` that passes our conformance suite.
- Once `dotlottie-rs` stabilises a CLI (Workflow D), make it the default renderer and keep puppeteer-lottie as the fallback.

## 9. Sources

- [puppeteer-lottie on GitHub](https://github.com/transitive-bullshit/puppeteer-lottie) — main reference for headless render-to-PNG/MP4 from Node.
- [puppeteer-lottie-cli on GitHub](https://github.com/transitive-bullshit/puppeteer-lottie-cli) — CLI flags + maintenance status.
- [Lottielab Lottie-to-Video tool](https://www.lottielab.com/lottie/lottie-to-video) — commercial reference; what a polished MP4 export looks like.
- [LottieFiles "Lottie to MP4"](https://lottiefiles.com/tools/lottie-to-mp4) — mass-market converter; flat MP4 only.
- [LottieFiles "Lottie to WebM"](https://lottiefiles.com/tools/lottie-to-webm) — same vendor, transparent variant.
- [LottieFiles forum: download with transparent background](https://forum.lottiefiles.com/t/download-with-transparent-background/4410) — confirms WebM-with-alpha is the official transparent-export path.
- [`html5animationtogif.com` — Lottie to WebM](https://html5animationtogif.com/lottie-to-webm) — third-party converter that exposes a transparent WebM toggle; useful for cross-checking our output.
- [`html5animationtogif.com` — Lottie to MP4](https://html5animationtogif.com/lottie-to-video) — flat MP4 reference.
- [hoop.dev — Handling transparency in FFmpeg](https://hoop.dev/blog/handling-transparency-in-ffmpeg) — concrete pixel format / codec recommendations: `yuva420p` for VP9, `qtrle/rgba` for QuickTime, the `format` and `alphamerge` filters.
- [Curio Salon — Alpha masking with FFMPEG](https://curiosalon.github.io/blog/ffmpeg-alpha-masking/) — alpha compositing reference for the chroma-key / flat-MP4 fallback.
- [Kit Cross — HEVC, H.265 and VP9 with alpha for the web](https://kitcross.net/hevc-web-video-alpha-channel/) — browser support matrix and exact ffmpeg incantations for HEVC alpha + VP9 alpha.
- [OTTVerse — Convert to Apple ProRes 422 / 4444 with ffmpeg](https://ottverse.com/ffmpeg-convert-to-apple-prores-422-4444-hq/) — canonical ProRes encode reference.
- [VHS-Decode wiki — ProRes: The Definitive FFmpeg Guide](https://github.com/oyvindln/vhs-decode/wiki/ProRes-The-Definitive-FFmpeg-Guide) — exhaustive ProRes encode flag matrix.
- [Hacker News thread — encoding ProRes 4444 with ffmpeg](https://news.ycombinator.com/item?id=16343591) — `prores_ks` + `yuva444p10le` confirmation.
- [WebM Project mailing list — Alpha channel support in VP9](https://groups.google.com/a/webmproject.org/g/codec-devel/c/BUJ2jEFPrBk) — historical reference for `-auto-alt-ref 0` requirement.
- [Skia Skottie module docs](https://skia.org/docs/user/modules/skottie/) — Skottie API; no shipped CLI, build from source.
- [Skottie Player demo](https://skottie.skia.org/) — reference implementation for sanity-checking renders.
- [`dotlottie-rs` on GitHub](https://github.com/LottieFiles/dotlottie-rs) — future-state Rust renderer; library-only as of alpha.1.
- [`dotlottie-rs` Node example](https://github.com/LottieFiles/dotlottie-rs/blob/main/node-example.mjs) — confirms BMP-frame-buffer output, no MP4 path yet.
- [`ed-asriyan/lottie-converter`](https://github.com/ed-asriyan/lottie-converter) — most complete OSS converter; GIF/PNG/APNG/WEBP/WEBM.
- [MDN — MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) — `MediaRecorder` reference for Workflow B.
- [Theodo — Saving canvas animations with MediaRecorder](https://blog.theodo.com/2023/03/saving-canvas-animations/) — practical canvas-capture recipe, including alpha caveats.
- [LottieFiles forum — uploaded animation from WebM "data retrieve failed"](https://forum.lottiefiles.com/t/uploaded-animation-from-webm-data-retrieve-failed/5450) — confirms WebM-with-alpha is *output* only; LottieFiles does not import it back.
