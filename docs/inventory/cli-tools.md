# Inventory — CLI tools (non-npm)

These are external binaries we shell out to. The app degrades gracefully when they're missing — a plugin manifest's `requires` field gates UI buttons.

## Required (must be present for the app to run usefully)

| Tool | What it's for | Install (mac) | License |
|---|---|---|---|
| **`claude`** (Claude CLI) | The generator. | `brew install --cask claude-code` or installer | proprietary (Claude Code app license) |
| **Node.js ≥ 20** | Runtime. | `brew install node` | MIT |
| **`pnpm`** | Package manager (npm/yarn also fine). | `corepack enable` | MIT |

## Recommended (most plugins assume these)

| Tool | What it's for | Install | License |
|---|---|---|---|
| **`ffmpeg`** | Frames → MP4/GIF/WebM. | `brew install ffmpeg` | LGPL-2.1 / GPL-2.0 (build dep.) |
| **Headless Chrome** (via `puppeteer`) | Rendering. | auto-installed by `npm i puppeteer` | BSD |

## Optional plugin dependencies

| Tool | What it's for | Install (mac, verified) | License |
|---|---|---|---|
| **`glaxnimate`** | Open-source Lottie editor. Powers the `glaxnimate-roundtrip` plugin. | macOS DMG from <https://glaxnimate.org/> (no homebrew cask). Detect resolves `/Applications/glaxnimate.app/Contents/MacOS/glaxnimate` automatically. | GPL-3.0 |
| **`python3` ≥ 3.10** + `pip` | For Python-based plugins. | `brew install python` (already there with system python on macOS 13+). | PSF |
| **`python-lottie`** | High-level Lottie helpers — SVG↔Lottie conversion, optimization passes. Powers the `svg-import` and `lottie-optimize` plugins. | `pip3 install --user --break-system-packages lottie` | AGPL-3.0 ⚠ — separate-process invocation only; never linked. See `research/16-licenses.md`. |
| `inlottie` | Rust Lottie renderer (femtovg/vello/blend2d). On macOS only ships a GUI viewer — not currently used for headless rendering. | `cargo install inlottie` | MIT |
| `imagemagick` | Image conversions / GIF assembly fallback. | `brew install imagemagick` | ImageMagick license |
| ~~`dotlottie-rs` CLI~~ | The crates.io `dotlottie-rs@0.1.0-alpha.1` is a library, not a CLI binary. Use `@dotlottie/dotlottie-js` (npm, MIT) for in-process pack/unpack — already wired into `packages/lottie-tools`. | n/a | n/a |
| ~~`bodymovin-python`~~ | Not on PyPI under that name; `python-lottie` (above) covers the same surface area. | n/a | n/a |

## Tool detection at startup

On boot, the app probes each known tool:

```ts
async function probeTools() {
  return {
    claude: await which("claude"),
    ffmpeg: await which("ffmpeg"),
    glaxnimate: await which("glaxnimate"),
    dotlottie: await which("dotlottie"),
    python: await which("python3"),
    bodymovinPython: await pythonImportable("bodymovin"),
    pythonLottie: await pythonImportable("lottie"),
  };
}
```

Results are surfaced on `/settings` as a checklist with install hints. Plugins that need a missing tool render disabled with a tooltip.

## Why each tool is here

- `claude` — without it the project is a static gallery. Required.
- `ffmpeg` — without it we can't export GIF/MP4. Render-as-frames still works.
- `glaxnimate` — power-user escape hatch. Optional.
- `dotlottie-rs` CLI — alternative to JS for fast `.lottie` packing and ThorVG rendering. Optional.
- `python-lottie` / `bodymovin-python` — Tier 2 prompting backends. Optional but high-value.

## Documentation we publish

A short "Install your power tools" page in the in-app settings, linking to:

- Brew taps / formulae.
- Each tool's homepage.
- A copy-paste shell snippet.

## Sources

- [Claude Code install docs](https://code.claude.com/docs/en/setup)
- [ffmpeg install](https://ffmpeg.org/download.html)
- [Glaxnimate install / KDE Apps](https://apps.kde.org/glaxnimate/)
- [dotlottie-rs (Rust + binaries)](https://github.com/LottieFiles/dotlottie-rs)
- [python-lottie on PyPI](https://pypi.org/project/lottie/)
- [bodymovin-python on GitHub](https://github.com/boringcactus/bodymovin-python)
