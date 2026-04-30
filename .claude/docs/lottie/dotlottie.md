# dotLottie (.lottie) Container Format

Sources:
- https://dotlottie.io/
- https://github.com/dotlottie/dotlottie-spec (README/spec page returned 404 at fetch time; the structure below is taken from the dotlottie.io overview and widely-known v1/v2 conventions; verify against the live repo before writing a parser)

## Overview

dotLottie is "an open-source file format that aggregates one or more Lottie files and their associated resources into a single file with theming and interactivity capabilities." It uses a ZIP archive (Deflate) with the `.lottie` extension.

## Why dotLottie over plain .json

- **Bundles** multiple animations + their image/font resources in one file
- **Smaller transfer size** thanks to Deflate compression
- **Theming**: swap palettes without rewriting animations
- **Slots**: replaceable content (e.g., logos)
- **Interactivity** state machines (v2)

## Spec versions

| Version | Status | Highlights |
|---------|--------|-----------|
| 1.0 | Released | Single or multi animation, themes, basic manifest |
| 2.0 | Released | State machines for interactivity, refined theme model |

## Container layout (typical)

```
my-animation.lottie         (ZIP archive, Deflate)
├── manifest.json           # required
├── animations/
│   ├── pulse.json          # Lottie JSON files
│   └── spinner.json
├── images/                 # optional, referenced by animations as assets
│   ├── img_0.png
│   └── img_1.jpg
├── themes/                 # optional theme overlays
│   ├── dark.json
│   └── brand.json
└── states/                 # optional (v2 state machines)
    └── default.json
```

## manifest.json (canonical fields)

```json
{
  "version": "1.0",
  "generator": "open-lottie-ui",
  "author": "Nora",
  "revision": 1,
  "keywords": ["loader", "spinner"],
  "animations": [
    {
      "id": "pulse",
      "speed": 1,
      "loop": true,
      "playMode": "Normal",
      "autoplay": true,
      "direction": 1,
      "themeColor": "#ff6600"
    }
  ],
  "themes": [
    { "id": "dark", "animations": ["pulse", "spinner"] }
  ],
  "states": []
}
```

### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | dotLottie spec version |
| `generator` | string | Tool that produced the file |
| `author` | string | Author name |
| `revision` | integer | Monotonic revision counter |
| `keywords` | string[] | Tags for discovery |
| `animations` | object[] | Per-animation playback config (see below) |
| `themes` | object[] | Theme definitions |
| `states` | object[] | State-machine definitions (v2) |

### Animation entry

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Filename stem in animations/ (without `.json`) |
| `speed` | number | Playback speed multiplier |
| `loop` | boolean / number | Looping (true/false or count) |
| `playMode` | string | "Normal" or "Bounce" |
| `autoplay` | boolean | Start automatically |
| `direction` | 1 / -1 | Forward or reverse |
| `themeColor` | string | Optional accent for thumbnails |

## Theme files

A theme file is a JSON document overriding specific property `sid` (slot ID) values in the underlying animations. Properties opt in to theming by carrying a `sid` field.

```json
{
  "rules": [
    { "id": "primary", "type": "Color", "value": [1, 0.4, 0, 1] }
  ]
}
```

## Tools

- **dotlottie-rs** CLI — convert, inspect, validate
- **@lottiefiles/dotlottie-web** — JS player
- **@lottiefiles/dotlottie-react** — React component

## Reading a .lottie programmatically

It's a regular ZIP — any ZIP library works. Read `manifest.json` first, then load referenced animations from `animations/<id>.json`.

```js
import JSZip from "jszip";
const buf = await fetch("anim.lottie").then(r => r.arrayBuffer());
const zip = await JSZip.loadAsync(buf);
const manifest = JSON.parse(await zip.file("manifest.json").async("string"));
const anim = JSON.parse(await zip.file(`animations/${manifest.animations[0].id}.json`).async("string"));
```
