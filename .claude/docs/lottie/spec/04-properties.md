# Properties (Animatable Values)

Source: https://lottiefiles.github.io/lottie-docs/properties/

Lottie properties are animatable structures that define how values change over time. Each property contains metadata about whether it's animated and either a static value or an array of keyframes.

## Animated Property Structure

| Attribute | Type | Description |
|---|---|---|
| `ix` | integer | Property index identifier |
| `x` | string | Expression (optional) |
| `sid` | string | Slot ID reference |
| `a` | 0-1 integer | Animation flag (0 = static, 1 = animated) |
| `k` | any | Direct value when `a:0`, keyframe array when `a:1` |

## Static vs Animated

```json
// Static
{ "a": 0, "k": 100 }

// Static vector
{ "a": 0, "k": [256, 256] }

// Animated
{
  "a": 1,
  "k": [
    {"t": 0,  "s": [0],   "i": {"x":[0.667],"y":[1]}, "o": {"x":[0.333],"y":[0]}},
    {"t": 30, "s": [100]}
  ]
}
```

## Keyframes

| Attribute | Description |
|---|---|
| `t` | Frame number (time) |
| `h` | Hold flag (1 = hold value until next keyframe) |
| `i` | In tangent (easing into next keyframe) |
| `o` | Out tangent (easing from current keyframe) |
| `s` | Value at keyframe |
| `e` | End value (DEPRECATED — use next keyframe's `s`) |

## Bezier Easing Tangents

`x` controls time interpolation (0=current frame, 1=next frame); `y` controls value interpolation (0=current value, 1=next value).

Linear:
```json
{"o": {"x": [0, 0], "y": [0, 0]}, "i": {"x": [1, 1], "y": [1, 1]}}
```

Smooth ease-in-out:
```json
{"o": {"x": [0.333, 0.333], "y": [0, 0]}, "i": {"x": [0.667, 0.667], "y": [1, 1]}}
```

Hold:
```json
{"t": 0, "h": 1, "s": [value]}
```

## Property Types

### Vector Property
Animatable multi-component value with optional length spec.

| Attribute | Type | Description |
|---|---|---|
| `a` | 0-1 integer | Animated flag |
| `l` | integer | Component count (optional) |
| `k` | vector/array | Static value or keyframe array |

### Scalar Property
Single numeric value, stored as single-element arrays when animated (`"s": [100]`).

### Position Property
2D vector with optional spatial tangents (`ti`, `to`) for curved path animation.

Split Position variant — separate x/y animation:
```json
{
  "s": true,
  "x": {"a": 0, "k": 0},
  "y": {"a": 0, "k": 0}
}
```

### Bezier Shape Property
Animatable bezier path with keyframe values as bezier arrays:
```json
{ "a": 0, "k": { "i": [[0,0],[0,0]], "o": [[0,0],[0,0]], "v": [[0,0],[100,100]], "c": false } }
```

### Color Property
RGBA values stored as floats `0..1`:
```json
{ "a": 0, "k": [1, 0.5, 0.2, 1] }
```

### Gradient Property
Multiple color stops with a fixed count `p` and animatable keyframes. The `k` value packs alternating offsets and color components.

---

Note: The `e` attribute in keyframes is deprecated — reference the next keyframe's `s` value instead.
