# Keyframes & Easing

Bezier easing tangents are how Lottie expresses cubic-bezier interpolation between two keyframes.

## Keyframe object

```json
{
  "t":  10,                                  // frame number
  "s":  [value],                             // value at this keyframe
  "h":  0,                                   // 1 = hold (no interp until next kf)
  "i":  {"x": [0.667], "y": [1]},            // in-tangent of NEXT segment
  "o":  {"x": [0.333], "y": [0]}             // out-tangent of THIS segment
}
```

- `i` (in-tangent) controls how the curve enters the next keyframe.
- `o` (out-tangent) controls how the curve leaves this keyframe.
- For multi-component properties (e.g., position), `x`/`y` are arrays — one entry per component.

## Common bezier presets

| Curve | `o.x` | `o.y` | `i.x` | `i.y` |
|-------|-------|-------|-------|-------|
| Linear | 1 | 1 | 0 | 0 |
| Ease-out (slow end) | 0.58 | 1 | 0.42 | 1 |
| Ease-in (slow start) | 0.42 | 0 | 0.58 | 0 |
| Ease-in-out | 0.42 | 0 | 0.58 | 1 |
| Quick out / soft in | 0.65 | 0 | 0.35 | 1 |
| Overshoot (back-out) | 0.34 | 1.56 | 0.64 | 1 |

For default soft easing in tools like LottieFiles editor:
```json
{ "i": {"x": [0.667], "y": [1]}, "o": {"x": [0.333], "y": [0]} }
```

## Linear interpolation

```json
{ "i": {"x":[1],"y":[1]}, "o": {"x":[0],"y":[0]} }
```

## Hold (step) keyframes

```json
{ "t": 0, "h": 1, "s": [valueA] }
{ "t": 30, "s": [valueB] }
```
The value stays at `valueA` until frame 30 then snaps to `valueB`.

## Spatial tangents (position only)

For Position properties, `ti` (tangent in) and `to` (tangent out) on the keyframe define curved motion paths in 2D space — separate from the temporal easing in `i`/`o`.

```json
{
  "t": 0, "s": [100, 100],
  "to": [50, -25],
  "ti": [-50, 25],
  "i": {"x":[0.667],"y":[1]},
  "o": {"x":[0.333],"y":[0]}
}
```

## End values are deprecated

Old Lottie keyframes had an `e` field for the end value of the segment. Modern files derive the end value from the next keyframe's `s` field. Don't write `e` in new content.

## Per-component vs single bezier

`i.x` and `i.y` (and `o.x`, `o.y`) can be single-element arrays (one shared bezier for all components) or multi-element arrays (one bezier per component). Multi-component allows independent easing per axis.
