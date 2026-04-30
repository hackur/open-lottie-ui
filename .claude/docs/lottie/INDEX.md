# Lottie Reference Documentation

Authoritative reference material for the Lottie animation format, distilled from the canonical specs and lottie-web docs. Used by Claude Code sessions and the open-lottie-ui Tier-3 generation prompts.

Fetched: 2026-04-29.

## Layout

```
.claude/docs/lottie/
├── INDEX.md                # this file
├── cheatsheet.md           # ~250-line dense reference + 6 worked examples
├── dotlottie.md            # .lottie container format, manifest schema
├── bodymovin.md            # After Effects → Lottie mapping, lottie-web player
└── spec/
    ├── 00-spec-overview.md
    ├── 01-animation.md     # top-level animation/composition fields
    ├── 02-layers.md        # 6 layer types (ty: 0..5) + audio/camera/data
    ├── 03-shapes.md        # 19 shape items (gr/rc/el/sh/sr/fl/st/...)
    ├── 04-properties.md    # animatable {a, k}, keyframes, easing
    ├── 05-values.md        # vectors, colors, beziers, gradients
    ├── 06-keyframes-easing.md
    ├── 07-trim-paths.md    # tm modifier (draw-on)
    ├── 08-effects.md       # 15 effect types (drop shadow, blur, tint, ...)
    └── 09-expressions.md   # AE-style expressions ($bm_rt, time, wiggle)
```

## Quick links by task

| If you need to... | Read |
|-------------------|------|
| Generate a complete Lottie JSON | `cheatsheet.md` |
| Look up a layer `ty` number | `spec/02-layers.md` |
| Look up a shape `ty` string | `spec/03-shapes.md` |
| Understand `{a, k}` and keyframes | `spec/04-properties.md` + `spec/06-keyframes-easing.md` |
| Build a draw-on animation | `spec/07-trim-paths.md` + cheatsheet example (d) |
| Add a drop shadow / blur | `spec/08-effects.md` |
| Convert RGBA to Lottie color | `spec/05-values.md` |
| Author a `.lottie` bundle | `dotlottie.md` |
| Map an AE feature to Lottie | `bodymovin.md` |

## File summary

### cheatsheet.md (~22 KB)
Hand-curated dense reference. Top-level animation skeleton, all 6 layer types with their `ty` numbers and required fields, all common shape items with `ty` strings, animatable property structure with examples, easing tangent presets table, color/opacity conventions, validation gotchas, and 6 worked examples (fade-in, slide-in, pulse, draw-on, color cross-fade, rotate-spin).

### dotlottie.md
The `.lottie` ZIP container: how it's structured, what `manifest.json` contains, theme files, slot system, v1 vs v2 differences, JS reading example. Note: dotlottie-spec README returned 404 at fetch time — the structure documented is taken from dotlottie.io and known v1/v2 conventions; verify against the live repo before writing a parser.

### bodymovin.md
After Effects → Lottie mapping. lottie-web player API (`loadAnimation`, instance methods, renderers svg/canvas/html). Supported AE features list. Property mapping table. Performance recommendations.

### spec/00-spec-overview.md
The lottie-spec project (lottie.github.io/lottie-spec) — overview of the working group, scope, governance, and section list.

### spec/01-animation.md
Top-level Animation object: `v`, `fr`, `ip`, `op`, `w`, `h`, `layers`, `assets`, plus metadata, motion blur, slots.

### spec/02-layers.md
Layer types `ty: 0..6, 13, 15`. Core + visual + 3D properties. Parenting, masking/matting, auto-orient, render order.

### spec/03-shapes.md
All shape items: shapes (`el`, `rc`, `sr`, `sh`), styles (`fl`, `st`, `gf`, `gs`), grouping (`gr`, `tr`), modifiers (`rp`, `tm`, `rd`, `pb`, `tw`, `mm`, `op`, `zz`).

### spec/04-properties.md
The `{a, k}` animatable property pattern. Keyframe object fields. Bezier easing tangents. Vector / Scalar / Position / Bezier Shape / Color / Gradient property variants.

### spec/05-values.md
Vector arrays, RGBA 0-1 colors, hex colors, gradient flat-array packing, cubic bezier path schema (`v`, `i`, `o`, `c`).

### spec/06-keyframes-easing.md
Detailed keyframe object reference, common bezier easing presets table, hold (step) keyframes, spatial tangents (`ti`, `to`) for curved motion paths.

### spec/07-trim-paths.md
The Trim Path (`tm`) modifier — fields, placement inside groups, common patterns (draw-on, erase, snake), `m` parallel vs sequential, gotchas.

### spec/08-effects.md
15 layer effect types (`ty: 5, 20-34`), common effect properties, effect value sub-types, layer styles list, recommendation to prefer native shapes over effects.

### spec/09-expressions.md
After Effects expressions — `$bm_rt` output variable, globals (`time`, `value`, `thisLayer`, etc.), interpolation/math/utility functions, examples (rotation, oscillation, wiggle, loopOut). Caveat: not all renderers support expressions.

## Sources

| Source | Status |
|--------|--------|
| https://lottie.github.io/lottie-spec/latest/ | Captured (overview only — child pages unrouted at fetch time) |
| https://lottiefiles.github.io/lottie-docs/ | Captured (TOC) |
| https://lottiefiles.github.io/lottie-docs/composition/ | Captured (animation/composition) |
| https://lottiefiles.github.io/lottie-docs/layers/ | Captured |
| https://lottiefiles.github.io/lottie-docs/shapes/ | Captured |
| https://lottiefiles.github.io/lottie-docs/properties/ | Captured |
| https://lottiefiles.github.io/lottie-docs/values/ | Captured |
| https://lottiefiles.github.io/lottie-docs/effects/ | Captured |
| https://lottiefiles.github.io/lottie-docs/expressions/ | Captured |
| https://lottiefiles.github.io/lottie-docs/breakdown/bouncy_ball/ | Captured (cited in cheatsheet) |
| https://lottiefiles.github.io/lottie-docs/breakdown/lottie_from_scratch/ | Captured (cited in cheatsheet) |
| https://lottiefiles.github.io/lottie-docs/concepts/ | 404 — content folded into spec/05-values.md |
| https://dotlottie.io/ | Captured (overview) |
| https://github.com/dotlottie/dotlottie-spec | Captured (overview); README path 404 |
| https://github.com/airbnb/lottie-web/blob/master/README.md | Captured |
| https://github.com/lottie/lottie-spec/blob/main/README.md | Captured |
| https://airbnb.io/lottie/#/web | Redirected to https://lottie.airbnb.tech/ — destination empty |

## Maintenance

This is reference material — regenerate when bumping target Lottie schema versions or adding new generation prompts. Keep total size under ~500 KB.
