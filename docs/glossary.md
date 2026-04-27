# Glossary

Quick definitions for terms used throughout `docs/`.

| Term | Definition |
|------|------------|
| **AE** | Adobe After Effects. The original authoring tool for Bodymovin / Lottie. |
| **AGPL** | Affero General Public License. Like GPL, with an extra "if you offer the software over a network, you must publish source." Strong copyleft. Reason `python-lottie` is plugin-only, not bundled. |
| **ajv** | The de-facto JSON Schema validator for Node. We use it for `lottie-spec` validation. |
| **App Router** | The Next.js 15 routing system based on file-system layout under `app/`. Successor to the old Pages Router. |
| **base64** | How Lottie embeds raster images inline in JSON. Bloats file size; we externalize them into `.lottie` `i/` directory on pack. |
| **bezier path** | Vector curve definition. Lottie shape paths (`sh`) and easing tangents (`i`/`o` on keyframes) are bezier. |
| **Bodymovin** | The After Effects plugin (by Hernan Torrisi) that exports animations as Lottie JSON. The format is sometimes called "Bodymovin JSON" interchangeably with "Lottie JSON". |
| **canvaskit-wasm** | Skia's WASM bundle. Hosts Skottie in Node. |
| **canvas renderer** | A Lottie player mode that draws to a `<canvas>` (not SVG). Faster, less DOM-y, fewer features. |
| **child_process** | Node's standard module for spawning OS processes. Our Claude CLI driver uses `spawn()`. |
| **chokidar** | Cross-platform fs-watcher. We use it to invalidate the library cache when files change. |
| **dotlottie** (`.lottie`) | A ZIP container holding one or more Lottie animations + manifest + themes + state machines. 50–80 % smaller than raw JSON. |
| **dotlottie-rs** | Rust core that powers all modern dotLottie players (web, mobile, desktop). Renders via ThorVG. |
| **expression** | A JavaScript-like string evaluated at render time, used in Lottie for property animation logic. Inconsistent across renderers; we discourage. |
| **few-shot** | Prompt engineering technique: include 1–3 worked examples in the system prompt to set the model's expectations. |
| **fr** | Frame rate. A Lottie root field. |
| **GIF** | Old animated image format. We export to it via ffmpeg. Fallback for `<noscript>` and email. |
| **GPL** | GNU General Public License. Strong copyleft. We invoke GPL CLIs (Glaxnimate) as subprocesses; we do not link. |
| **HMR** | Hot Module Reload. Next.js dev-time feature. Our process registry must `globalThis`-pin to survive HMR cycles. |
| **HITL** | Human In The Loop. The pattern at the heart of this project. |
| **ip / op** | "In point" / "out point". Lottie root and per-layer fields marking when a layer enters and leaves. |
| **k** | The "value" field on an animatable property. Either a static value or an array of keyframes. |
| **ks** | The transform object on a layer (anchor, position, scale, rotation, opacity, skew). |
| **LAC** | Lottie Animation Community. The Linux Foundation non-profit that now stewards the Lottie spec. |
| **LSS** | Lottie Style Sheets. A theming syntax that overrides animated property values by selector. Used inside `.lottie` themes. |
| **lottie-spec** | The formal JSON Schema spec at lottie.github.io/lottie-spec. Our canonical validator target. |
| **lottie-web** | Airbnb's reference Lottie player (SVG/canvas/HTML renderers). |
| **manifest_version** | Top-level field of `plugin.json`. Lets the loader reject incompatible future formats. |
| **MIT** | Permissive license. Default for our application code and most dependencies. |
| **ndjson** | Newline-delimited JSON. The Claude CLI's `stream-json` output format: one JSON object per line. |
| **odiff** | Native (Zig + SIMD) image diff tool. We use it for large-image visual diffs. |
| **pixelmatch** | Pure-JS pixel diff. Faster than odiff on small images. |
| **Plugin** | A directory under `plugins/` with a `plugin.json` manifest. Adds a new tool to the admin without code changes. See `architecture/plugins.md`. |
| **puppeteer** | Headless Chrome driver. Used for headless Lottie rendering. |
| **puppeteer-lottie** | Wrapper that uses Puppeteer to render Lottie animations to PNG/GIF/MP4. |
| **registry** (process) | Our in-memory `Map<id, runningChild>` that lets the SSE handler subscribe to a generation in flight. |
| **remix** | Pick an existing animation, describe a change, get a modified version. A first-class workflow. |
| **resvg-js** | Native (Rust) SVG → PNG renderer. Fast fallback for thumbnails. |
| **review queue** | The list of pending generations awaiting human approval. The product's central screen. |
| **server action** | Next.js 15 primitive: a function annotated `"use server"` callable from client components as if it were a function. We use them to kick off generations. |
| **shadcn/ui** | A library of copy-paste-into-your-project React components built on Radix. We use them for the UI kit. |
| **Skottie** | Skia's Lottie renderer. Used by Chrome internally; can run in Node via canvaskit-wasm. |
| **SSE** | Server-Sent Events. One-way HTTP streaming from server to client. We use it to forward live generation tokens. |
| **stream-json** | A Claude CLI `--output-format` value that emits ndjson with typed messages (system / assistant / user / result). |
| **system prompt** | The instructions sent on every Claude call before the user's prompt. Ours sets output format, schema, conventions. |
| **`tm`** | Trim path. A Lottie shape modifier that animates the visible portion of a path (the "draw-on" effect). |
| **template** (Tier 1) | A parameterized Lottie scaffold under `prompts/templates/`. The model fills in params; we substitute. |
| **ThorVG** | Samsung's vector graphics engine. Powers `dotlottie-rs` and the modern dotlottie players. |
| **transform** | The `ks` field — what makes a layer move/scale/rotate/fade. |
| **ty** | Layer type integer. `0` precomp / `1` solid / `2` image / `3` null / `4` shape. Also a string field on shape items (`gr`, `rc`, …). |
| **WASM** | WebAssembly. dotlottie-web ships ThorVG as a WASM blob (~600 KB) for in-browser rendering. |
