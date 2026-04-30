# Layer Effects

Source: https://lottiefiles.github.io/lottie-docs/effects/

Layer effects are post-processing effects applied to layers. Not all renderers (especially lottie-web with SVG renderer) support every effect — use sparingly.

## Effect Types

| `ty` | Effect Name | Purpose |
|------|-------------|---------|
| 5 | Custom Effect | User-defined, often used with expressions |
| 20 | Tint | Converts to grayscale, then black→white maps to given color |
| 21 | Fill | Fills opaque areas with solid color |
| 22 | Stroke | Adds stroke outline |
| 23 | Tritone | Gradient based on brightness levels (bright/mid/dark) |
| 24 | Pro Levels | Color correction levels (After Effects-compatible) |
| 25 | Drop Shadow | Shadow with color, angle, distance, blur |
| 26 | Radial Wipe | Radial reveal/wipe animation |
| 27 | Displacement Map | Uses layer to displace content |
| 28 | Set Matte (Matte3) | Uses layer as mask |
| 29 | Gaussian Blur | Blur with sigma, direction, wrap options |
| 30 | Twirl | Rotational distortion |
| 31 | Mesh Warp | Grid-based deformation |
| 32 | Wavy | Wave distortion |
| 33 | Spherize | Spherical distortion |
| 34 | Puppet | Mesh-based puppet animation |

## Common Effect Properties

| Field | Description |
|-------|-------------|
| `nm` | Human-readable name |
| `mn` | Match name (for expressions) |
| `ef` | Array of effect values |
| `ty` | Effect type number |
| `en` | Enabled flag (0 or 1) |

## Effect Value Types (inside `ef` array)

| `ty` | Value Type | Use |
|------|------------|-----|
| 0 | Slider | Numeric scalar |
| 1 | Angle | Rotation degrees |
| 2 | Color | RGB color |
| 3 | Point | 2D vector |
| 4 | Checkbox | Boolean toggle |
| 6 | Ignored | Unused |
| 7 | Drop Down | Enum selection |
| 10 | Layer | Reference to layer |

## Layer Styles (alternate to effects)

Layers also support 9 style types under `sy` (`ty` 0-8):
- Stroke, Drop Shadow, Inner Shadow
- Outer Glow, Inner Glow, Bevel/Emboss
- Satin, Color Overlay, Gradient Overlay

## Example: Drop Shadow

```json
{
  "ty": 25, "nm": "Drop Shadow", "en": 1,
  "ef": [
    { "ty": 2, "nm": "Shadow Color", "v": {"a":0,"k":[0,0,0,1]} },
    { "ty": 0, "nm": "Opacity",      "v": {"a":0,"k":127} },
    { "ty": 1, "nm": "Direction",    "v": {"a":0,"k":135} },
    { "ty": 0, "nm": "Distance",     "v": {"a":0,"k":10} },
    { "ty": 0, "nm": "Softness",     "v": {"a":0,"k":20} }
  ]
}
```

## Recommendation

For maximum cross-renderer compatibility, prefer:
- Native shape strokes/fills over Stroke/Fill effects
- Layer transforms over Twirl/Spherize
- Multi-layer composition over Drop Shadow effects (a duplicated layer below with offset + opacity often works)
