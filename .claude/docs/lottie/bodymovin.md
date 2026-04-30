# Bodymovin / After Effects → Lottie Mapping

Sources:
- https://github.com/airbnb/lottie-web (README + docs/wiki)
- https://lottie.airbnb.tech/ (project site)

## What is Bodymovin?

Bodymovin is the After Effects extension that exports compositions to Lottie JSON. lottie-web is the JavaScript player that consumes that JSON. Together they define the de-facto Lottie format that every other player implements.

## Workflow

1. Designer animates in After Effects
2. Bodymovin extension exports composition → JSON (+ optional images folder)
3. Player (lottie-web, lottie-android, lottie-ios, etc.) renders JSON

## Installation

Bodymovin extension via:
- **aescripts + aeplugins** (recommended)
- Adobe Creative Cloud Store
- Manual ZXP install

After install: enable script permissions in After Effects Preferences (allows file write).

Web player:
```bash
npm install lottie-web
```

## Loading an animation (lottie-web)

```javascript
const anim = lottie.loadAnimation({
  container: document.getElementById("lottie"),
  renderer: "svg",   // or "canvas" or "html"
  loop: true,
  autoplay: true,
  path: "data.json"  // OR animationData: jsonObject
});
```

## Instance methods

`play()`, `stop()`, `pause()`, `setSpeed(n)`, `goToAndStop(frame, isFrame)`, `goToAndPlay(...)`, `setDirection(1|-1)`, `playSegments([from, to], force)`, `setSubframe(bool)`, `destroy()`, `getDuration(inFrames)`.

## Renderer trade-offs

| Renderer | Pros | Cons |
|----------|------|------|
| svg | Crisp, accessible, smaller DOM for simple anims | Slow with many shapes; effects limited |
| canvas | Fast for complex anims | No DOM accessibility; pixelated when scaled up |
| html | CSS transforms; some layouts | Limited shape support |

## After Effects features supported

Yes:
- Precomps, shapes, solids, images, text layers
- Masks and inverted masks
- Time remapping
- Expressions (subset)
- Rectangle, Ellipse, Star, Polygon, Path
- Trim Paths, Repeater, Merge Paths
- Stroke / Fill / Gradient Fill / Gradient Stroke
- Position spatial tangents (curved motion)
- Layer parenting
- Track mattes (alpha, alpha-inverted, luma, luma-inverted)

No (or partial):
- Image sequences, video, audio (audio in newer dotLottie only)
- 3D transforms in many renderers (canvas/html only)
- Negative layer time stretching
- Many AE effects (use only the supported list above)
- Particle systems
- Camera depth-of-field

## Property mapping summary

| After Effects | Lottie field | Notes |
|---------------|--------------|-------|
| Position | `ks.p` | Vector or split position |
| Anchor Point | `ks.a` | Center of rotation/scale |
| Scale | `ks.s` | Percent (100 = 1x) |
| Rotation | `ks.r` | Degrees, clockwise |
| Opacity | `ks.o` | 0-100 |
| Skew | `ks.sk` | Degrees |
| Skew Axis | `ks.sa` | Degrees |
| Time Remap | `tm` | On precomp layers |
| Trim Paths Start | shape `tm.s` | 0-100 |
| Trim Paths End | shape `tm.e` | 0-100 |
| Trim Paths Offset | shape `tm.o` | 0-360 |
| Repeater Copies | shape `rp.c` | Integer count |
| Layer Parent | `parent` | Layer `ind` reference |
| Auto-Orient | `ao` | 0 or 1 |

## Color values

Bodymovin always exports colors as RGBA floats `0..1`. Hex colors `#FF8000` are NOT used in core animation properties (only in metadata + dotLottie themes).

## Performance recommendations (from lottie-web docs)

- Keep AE projects minimal and focused
- Convert Illustrator layers to shapes (Right-click → Create Shapes from Vector Layer)
- Limit node count
- Gzip JSON files in production
- Adjust quality from "high" to a numeric value (>= 2) when needed

## Events

`onComplete`, `onLoopComplete`, `onEnterFrame`, `onSegmentStart`. Plus `addEventListener` for: `complete`, `data_ready`, `loaded_images`, `DOMLoaded`.

## Versioning

The animation top-level `v` field is the bodymovin exporter version that produced the file. Renderers use it for backward-compat heuristics. Modern files use `v: "5.x.x"`.
