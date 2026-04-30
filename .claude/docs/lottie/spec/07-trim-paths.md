# Trim Paths (`ty: "tm"`)

Trim Path is a shape modifier that shows only a sub-segment of the path(s) it follows in a group's `it` array. Essential for "draw-on" animations.

## Fields

| Field | Type | Description |
|---|---|---|
| `ty` | `"tm"` | Shape type |
| `s` | Scalar (animatable) | Segment start, 0–100 |
| `e` | Scalar (animatable) | Segment end, 0–100 |
| `o` | Scalar (animatable) | Offset around the path, 0–360 |
| `m` | Trim Multiple Shapes | 1 = Parallel (each shape trimmed equally), 2 = Sequential (treated as one path) |

## Placement inside a Group

Trim Path must be placed **after** the path/shape it should affect, but **before** the Transform shape that closes the group.

```json
{
  "ty": "gr",
  "it": [
    { "ty": "sh", "ks": { ... } },
    { "ty": "tm", "s": {"a":0,"k":0}, "e": {"a":1,"k":[
        {"t":0,  "s":[0],   "i":{"x":[0.667],"y":[1]}, "o":{"x":[0.333],"y":[0]}},
        {"t":60, "s":[100]}
      ]},
      "o": {"a":0,"k":0}, "m": 1 },
    { "ty": "st", "c": {"a":0,"k":[0,0,0,1]}, "w": {"a":0,"k":4}, "o": {"a":0,"k":100}, "lc":2, "lj":2 },
    { "ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100} }
  ]
}
```

## Common patterns

### Draw-on (reveal from start to end)
- `s` static at 0
- `e` animated 0 → 100
- Stroke on top so the line traces.

### Erase (reveal disappears)
- `s` animated 0 → 100
- `e` static at 100

### Snake (a moving segment)
- `s` and `e` both animated, with `e - s = constant` (e.g., 30%)
- Or animate `o` (offset) with constant `s=0, e=30`

### Multiple sub-paths
Use `m: 1` (Parallel) for each sub-path to be trimmed independently — best for star-burst draw-ons. Use `m: 2` (Sequential) when you want one continuous trim across multiple sub-paths.

## Tip

Trim Paths only affect strokes by default (since fills don't have a path edge). To draw-on a filled shape, animate `e` on a stroked outline of the shape, then animate the fill's opacity once `e` reaches 100.
