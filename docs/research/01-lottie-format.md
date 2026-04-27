# Research 01 — Lottie / Bodymovin format fundamentals

## What Lottie is

Lottie is a JSON-based vector animation format originally created by Hernan Torrisi as the **Bodymovin** export plugin for Adobe After Effects. Airbnb open-sourced runtimes (`lottie-web`, `lottie-ios`, `lottie-android`) and the format went on to win as the cross-platform format for vector motion on the web, mobile, and (via WASM) desktop.

In 2024 stewardship moved to the **Lottie Animation Community (LAC)**, a Linux Foundation non-profit. The format is now formally specified as a published JSON Schema at [lottie.github.io/lottie-spec](https://lottie.github.io/lottie-spec/). LottieFiles maintains a more tutorial-style spec at [lottiefiles.github.io/lottie-docs](https://lottiefiles.github.io/lottie-docs/schema/).

This is significant for us: **a published, machine-readable JSON Schema is exactly what an LLM needs to be grounded against.** This was not really true 2 years ago.

## Top-level animation object

A Lottie file's root has these key fields:

| field | type | meaning |
|-------|------|---------|
| `v` | string | Bodymovin version (e.g. `"5.12.2"`). Players gate features on this. |
| `fr` | number | Frame rate (frames per second). |
| `ip` | number | In-point — the first frame of the animation. |
| `op` | number | Out-point — the frame after the last visible frame. |
| `w`, `h` | number | Composition width/height in px. |
| `nm` | string | Human-readable name. |
| `assets` | array | Reusable assets: precomps, images, audio. |
| `layers` | array | The layer stack (rendered bottom-up by index). |
| `markers` | array | Named time markers (used for cue points, segments). |
| `meta` | object | Author/metadata. |

## Layer types (`ty`)

The spec defines five core layer types, identified by an integer `ty`:

| `ty` | Layer type | Use |
|------|------------|-----|
| 0 | **Precomposition** | Embeds another composition referenced by `refId` from `assets`. |
| 1 | **Solid** | A flat-colored rectangle. |
| 2 | **Image** | A bitmap image referenced from `assets`. |
| 3 | **Null** | An invisible layer used as a parent (rigging / groups). |
| 4 | **Shape** | Vector shapes (paths, rectangles, ellipses, fills, strokes, gradients, …). |

Player-specific extensions add Text (`ty: 5`), Audio (`ty: 6`), Video, Camera (`ty: 13`), and others, but these are *not in the lottie-spec* and round-tripping them is risky.

Common fields on every layer:

- `nm` — human name
- `ind` — layer index (used as the target of `parent` for rigging, and in expressions)
- `parent` — `ind` of the parent layer
- `ip`, `op` — when this layer enters/leaves
- `hd` — hidden
- `ks` — **transform** (anchor point, position, scale, rotation, opacity, skew)
- `ao` — auto-orient along motion path
- `tt`, `tp` — track-matte mode and parent
- `masksProperties` — clip masks

## Animated properties (the `k` field)

Every animatable value is an object with a `k` field. `k` can be:

- A **scalar or array** for a static value (e.g., `{ "k": [255, 0, 0, 1] }` for a solid red).
- An **array of keyframes**, each with:
  - `t` — frame time
  - `s` — start value (array)
  - `i`, `o` — bezier in/out tangents for easing
  - `h` — `1` for hold (no interpolation)

Plus an optional `x` field for an **expression** (a JavaScript-like string evaluated at render time — this is where things get hairy across renderers).

The lottie-spec is conservative about expressions; many renderers (Skottie, ThorVG/dotlottie-rs) only partially support them.

## Shapes (`ty: 4`)

Shape layers contain a tree of shape items, each with its own `ty` (string here, not int):

- `gr` — group
- `rc` — rectangle
- `el` — ellipse
- `sr` — star/polygon
- `sh` — bezier path
- `fl` — fill
- `st` — stroke
- `gf`, `gs` — gradient fill/stroke
- `tr` — transform (per shape)
- `tm` — trim path (the "draw-on" effect)
- `rp` — repeater
- `mm` — merge paths
- `op` — offset paths

Trim paths (`tm`) are the building block for almost every "drawing" or "checkmark animating in" effect.

## Why this matters for `open-lottie-ui`

1. **Schema-grounded prompting.** We can include the lottie-spec JSON Schema (or a compressed subset) in every Claude system prompt. This dramatically improves the chance of valid JSON output.
2. **Validation as a hard gate.** The same schema is the validator. Every LLM-generated file must pass before it's allowed into the review queue.
3. **Renderer compatibility matrix.** We need to track which features (expressions, text-as-text, gradients, masks, mattes) work in which player. The MVP target is **the intersection that lottie-web AND dotlottie-web both render correctly**, because that's what 95 % of users will deploy.
4. **The `markers` field is gold for plugins.** A plugin like "split this animation into segments by marker" is trivial to write and useful immediately.

## Sources

- [Lottie Specs official](https://lottie.github.io/lottie-spec/1.0.1/) — the formal JSON Schema spec.
- [Lottie Specs — Layers](https://lottie.github.io/lottie-spec/dev/specs/layers/) — layer-type details.
- [LottieFiles — Lottie Docs](https://lottiefiles.github.io/lottie-docs/schema/) — tutorial-style JSON schema with examples.
- [LottieFiles blog — Documenting the Lottie JSON object](https://lottiefiles.com/blog/engineering/kicking-off-the-documentation-of-lottie-json-object).
- [airbnb/lottie-web issue #575 — Is the JSON format specified anywhere?](https://github.com/airbnb/lottie-web/issues/575) — historical context for why the spec took so long.
- [Lottie Animation Community](https://lottie.github.io/) — the LAC site.
