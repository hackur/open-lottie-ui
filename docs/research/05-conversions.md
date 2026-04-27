# Research 05 — SVG ↔ Lottie conversion tools

## SVG → Lottie

The good news: SVG is a static superset of what most Lottie shape layers express, so converting an SVG into a single-frame (or simple-tween) Lottie is mechanically tractable.

The bad news: an SVG has *no notion of time* — turning a static logo into a *good* animation requires creative decisions a converter can't make. SVG → Lottie tools therefore mostly produce a **scaffolded** Lottie (one shape layer per `<path>`, no keyframes) that you then animate by hand or with an LLM.

Open-source / self-hostable tools:

| Tool | Lang | Status | Notes |
|------|------|--------|-------|
| [`LottieFiles/svg-to-lottie-converter`](https://github.com/LottieFiles/svg-to-lottie-converter) | TS | Active | Powers the LottieFiles web converter. MIT. Importable as a library. |
| [`stepancar/svg-to-lottie`](https://github.com/stepancar/svg-to-lottie) | JS | Active | Independent JS port, browser + Node. Inspired by the LottieFiles tool. |
| [`marciogranzotto/lottie-tools`](https://github.com/marciogranzotto/lottie-tools) | TS | Active | Web editor that imports SVG and adds keyframes. |

For `open-lottie-ui` the playbook is:

1. User drops an SVG.
2. We run `svg-to-lottie` → static Lottie scaffold.
3. We invoke Claude with a prompt like *"animate this Lottie: draw the paths in stagger, then settle, then loop a subtle pulse"*.
4. Review queue.

This is much higher-success than asking the LLM to invent a Lottie from scratch.

## Lottie → SVG (static export)

Sometimes you want a single SVG frame for a poster image / social card / fallback `<noscript>`. Options:

- `lottie-web`'s SVG renderer **already produces SVG DOM** at runtime. Render off-screen, grab `outerHTML`, you have an SVG of the current frame.
- `puppeteer-lottie` can render any single frame to PNG; for SVG, the lottie-web outerHTML trick is simpler.
- `python-lottie` includes converters to SVG as well.

## Lottie → animated SVG / GIF / MP4 / WebM

- **Animated SVG**: `python-lottie` has an SMIL-based exporter. Quality is "okay" for simple animations; SMIL is deprecated.
- **GIF / MP4 / WebM**: route through `puppeteer-lottie` (renders frames, pipes to ffmpeg) or `dotlottie-rs render` (faster, fewer features).
- **Lordicon-style `.svg` with embedded JS**: not standard; ignore.

## After Effects ↔ Lottie

Bodymovin (the AE plugin) is the canonical "AE → Lottie" path; closed-source-ish (free but not OSS) and requires AE. Out of scope for our admin to invoke.

## Round-trip with editors

- **Glaxnimate** can import and export both SVG and Lottie — a useful "manual touch-up" round-trip if Claude output needs tweaking. We surface "Open in Glaxnimate" as a plugin.
- **Lottielab / Jitter** — proprietary web tools, can import SVG, export Lottie. We don't shell out to them but we can document them for users.

## Decision for `open-lottie-ui`

Ship two converters as plugins on day one:

1. **`svg-import`** → uses `stepancar/svg-to-lottie` (pure-JS, easy install).
2. **`lottie-to-svg-frame`** → renders any frame via lottie-web in a hidden iframe and captures `outerHTML`. Used for thumbnails and poster images.

GIF/MP4 export ships behind a "requires ffmpeg" plugin manifest.

## Sources

- [LottieFiles/svg-to-lottie-converter](https://github.com/LottieFiles/svg-to-lottie-converter)
- [stepancar/svg-to-lottie](https://github.com/stepancar/svg-to-lottie)
- [marciogranzotto/lottie-tools](https://github.com/marciogranzotto/lottie-tools)
- [LottieFiles SVG → Lottie web tool](https://lottiefiles.com/tools/svg-to-lottie)
- [Lottielab SVG to Lottie](https://www.lottielab.com/lottie/svg-to-lottie)
- [Hoffmann — Converting files from SVG to Lottie](https://evandro-hoffmann.medium.com/converting-files-from-svg-to-lottie-defbfb90a6da)
