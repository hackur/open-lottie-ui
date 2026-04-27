# Research 04 — dotLottie format and tooling

## What `.lottie` is

A `.lottie` file is a **ZIP container** (Deflate-compressed) wrapping one or more Lottie JSON animations plus their assets and metadata. MIME type: `application/zip+dotlottie`. Spec: [dotlottie.io/spec/2.0/](https://dotlottie.io/spec/2.0/) (with a 1.0 spec at [/spec/1.0/](https://dotlottie.io/spec/1.0/) still in use).

The point is twofold:

1. **Compression.** A typical Lottie JSON is verbose; gzip/deflate gives 50–80 % shrinkage with zero quality loss. `.lottie` is the canonical compressed form, so a server can serve it directly with the right `Content-Type`.
2. **Multi-animation packaging.** A `.lottie` can hold multiple animations + shared images + themes + state machines as one drop-in asset.

## Container layout

```
my-pack.lottie/   (a zip file)
├── manifest.json           # required, root
├── a/                      # animations
│   ├── intro.json
│   ├── loop.json
│   └── outro.json
├── i/                      # images
│   └── logo.png
├── t/                      # themes
│   ├── light.json
│   └── dark.json
├── s/                      # state machines (v2)
│   └── onboarding.json
└── audio/                  # audio files (v2)
```

Conventions:

- Each animation has a unique `id` in the manifest.
- Themes are JSON files that override animated property values (color overrides being the headline use case).
- State machines describe transitions between animations driven by events (hover, click, custom).

## Manifest

`manifest.json` lists what's in the bundle and per-animation playback hints:

```jsonc
{
  "version": "2.0",
  "generator": "open-lottie-ui",
  "animations": [
    {
      "id": "intro",
      "loop": false,
      "autoplay": true,
      "speed": 1,
      "direction": 1,
      "playMode": "normal",
      "themeId": "light",
      "themes": ["light", "dark"]
    }
  ],
  "themes": [{ "id": "light" }, { "id": "dark" }],
  "stateMachines": [{ "id": "onboarding" }]
}
```

## Tooling

| Tool | Role | Notes |
|------|------|-------|
| `@lottiefiles/dotlottie-js` | Read/write `.lottie` from JS/TS. | Our packager of choice. |
| `dotlottie-rs` CLI | Native CLI for packing, unpacking, rendering, validating. | Rust-built, fast, distributed as platform binaries. |
| `dotlottie-tools` | Misc CLIs (validate, optimize). | Less polished than dotlottie-js. |
| `@lottiefiles/dotlottie-web` | Browser/Node player that consumes `.lottie` directly. | Wrapper around dotlottie-rs WASM. |

## Themes (Lottie-Styler / LSS)

Themes use a stylesheet-like format ([LottieFiles theming docs](https://developers.lottiefiles.com/docs/tools/dotlottie-js/theming/)). They override animated property values by selector — e.g., "all fills with this name → swap to teal". This is huge for our **remix** workflow: instead of asking Claude to rewrite the whole animation, ask it to produce a *theme* that re-skins it.

## State machines (v2)

A separate JSON describing event-driven transitions: `idle → hovered → loading → success`. Each state references an animation id. The dotlottie-web player consumes the state machine and dispatches events.

For `open-lottie-ui`, this opens a v2 feature: a UI to *visually author* state machines on top of existing animations.

## Why we make `.lottie` the canonical export

- It's smaller — better defaults are good UX.
- It bundles themes + state machines, so a "remix" can ship as a one-file delta.
- It future-proofs against Lottie features that only dotlottie-web supports.

We still keep the underlying `.json` in the library; `.lottie` is built on demand.

## Sources

- [dotLottie 2.0 spec](https://dotlottie.io/spec/2.0/)
- [dotLottie 1.0 spec](https://dotlottie.io/spec/1.0/)
- [dotLottie intro](https://dotlottie.io/intro/)
- [Manifest file structure (LottieFiles devs)](https://developers.lottiefiles.com/docs/tools/dotlottie-js/manifest-file-structure/)
- [Theming (Lottie-Styler / LSS)](https://developers.lottiefiles.com/docs/tools/dotlottie-js/theming/)
- [Multi-animation .lottie example (CodePen)](https://codepen.io/lottiefiles/pen/wvOxdRa)
