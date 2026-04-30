# Shapes

Source: https://lottiefiles.github.io/lottie-docs/shapes/

Lottie categorizes vector data into:
- **Shapes**: provide shape information without styling
- **Style**: provide styling (fill, stroke)
- **Group**: contains other shapes
- **Modifier**: alter paths defined by shapes
- **Transform**: define transforms within groups

## Graphic Element (common base)

| Attribute | Type | Description |
|---|---|---|
| `nm` | string | Human-readable name |
| `mn` | string | Match name for expressions |
| `hd` | boolean | Hidden flag |
| `ty` | string | Type identifier |
| `bm` | Blend Mode | Blend mode |
| `ix` | integer | Property index for expressions |
| `cl` | string | CSS class |
| `ln` | string | SVG id |

## `ty` (Shape Type) Values

| Code | Type |
|------|------|
| `'el'` | Ellipse |
| `'fl'` | Fill |
| `'gf'` | Gradient Fill |
| `'gs'` | Gradient Stroke |
| `'gr'` | Group |
| `'mm'` | Merge |
| `'no'` | No Style |
| `'op'` | Offset Path |
| `'sh'` | Path |
| `'sr'` | PolyStar |
| `'pb'` | Pucker / Bloat |
| `'rc'` | Rectangle |
| `'rp'` | Repeater |
| `'rd'` | Rounded Corners |
| `'st'` | Stroke |
| `'tr'` | Transform |
| `'tm'` | Trim Path |
| `'tw'` | Twist |
| `'zz'` | Zig Zag |

---

## Shape Primitives

### Ellipse (`ty: 'el'`)

| Field | Type | Description |
|---|---|---|
| `d` | Shape Direction | Drawing direction |
| `p` | Position | Center position |
| `s` | Vector | Size (x, y) |

```json
{ "ty": "el", "p": {"x": 256, "y": 256}, "s": {"x": 256, "y": 256} }
```

### Rectangle (`ty: 'rc'`)

| Field | Type | Description |
|---|---|---|
| `d` | Shape Direction | Drawing direction |
| `p` | Position | Center position |
| `s` | Vector | Size |
| `r` | Scalar | Corner radius |

```json
{ "ty": "rc", "p": {"x": 256, "y": 256}, "s": {"x": 256, "y": 256}, "r": 0 }
```

### PolyStar (`ty: 'sr'`)

| Field | Type | Description |
|---|---|---|
| `p` | Position | Center |
| `or` | Scalar | Outer radius |
| `os` | Scalar | Outer roundness (%) |
| `r` | Scalar | Rotation (deg, clockwise) |
| `pt` | Scalar | Number of points |
| `sy` | Star Type | "Star" or "Polygon" |
| `ir` | Scalar | Inner radius |
| `is` | Scalar | Inner roundness (%) |

```json
{ "ty": "sr", "p": {"x": 256, "y": 256}, "pt": 5, "r": 0, "or": 200, "ir": 100, "os": 0, "is": 0, "sy": "Star" }
```

### Path (`ty: 'sh'`)

Custom Bezier shape.

| Field | Type | Description |
|---|---|---|
| `d` | Shape Direction | Direction |
| `ks` | Bezier | Bezier path data |

```json
{ "ty": "sh", "ks": {"a": 0, "k": {"i": [...], "o": [...], "v": [...], "c": true}} }
```

---

## Style Elements

### Fill (`ty: 'fl'`)

| Field | Type | Description |
|---|---|---|
| `o` | Scalar | Opacity (100 = opaque) |
| `c` | Color | Fill color (RGBA 0–1) |
| `r` | Fill Rule | "Non Zero" or "Even Odd" |

```json
{ "ty": "fl", "c": {"a": 0, "k": [1, 0.98, 0.28, 1]}, "o": {"a": 0, "k": 100}, "r": 1 }
```

### Stroke (`ty: 'st'`)

| Field | Type | Description |
|---|---|---|
| `o` | Scalar | Opacity |
| `lc` | Line Cap | Butt, Round, Square |
| `lj` | Line Join | Miter, Round, Bevel |
| `ml` | number | Miter Limit |
| `ml2` | Scalar | Miter Limit (animatable) |
| `w` | Scalar | Width |
| `d` | array | Dashes |
| `c` | Color | Stroke color |

Stroke dashes: alternating dash/gap entries, optional offset.

```json
[ {"n": "d", "v": 30}, {"n": "g", "v": 50} ]
```

```json
{ "ty": "st", "c": {"a": 0, "k": [0,0,0,1]}, "w": {"a":0,"k":4}, "o": {"a":0,"k":100}, "lc": 2, "lj": 1, "ml": 3 }
```

### Gradient Fill (`ty: 'gf'`)

| Field | Description |
|---|---|
| `o` | Opacity |
| `g` | Gradient (color stops) |
| `s` | Start Point |
| `e` | End Point |
| `t` | Type: 1=Linear, 2=Radial |
| `h` | Highlight Length (%) |
| `a` | Highlight Angle (deg) |
| `r` | Fill Rule |

### Gradient Stroke (`ty: 'gs'`)

Combines stroke and gradient fields.

### No Style (`ty: 'no'`)

Empty style; only `o` opacity.

---

## Grouping

### Group (`ty: 'gr'`)

Container for shapes, styles, transforms.

| Field | Description |
|---|---|
| `np` | Number of properties |
| `it` | Array of child shape elements |
| `cix` | Property index |

A group **must always end** with a Transform shape (`ty: 'tr'`).

```json
{ "ty": "gr", "nm": "Group",
  "it": [
    {"ty": "rc", ...},
    {"ty": "fl", ...},
    {"ty": "st", ...},
    {"ty": "tr", ...}
  ]
}
```

### Transform (`ty: 'tr'`)

| Field | Description |
|---|---|
| `a` | Anchor point |
| `p` | Position (translation) |
| `r` | Rotation (deg, clockwise) |
| `s` | Scale (vector) |
| `o` | Opacity |
| `sk` | Skew (deg) |
| `sa` | Skew Axis (deg) |
| `rx` `ry` `rz` | Split rotations |
| `or` | Orientation vector |

Transform shapes **must be the last item in the `it` array**.

---

## Modifiers

### Repeater (`ty: 'rp'`)

| Field | Description |
|---|---|
| `c` | Number of copies |
| `o` | Offset |
| `m` | Composite stacking ("Above"/"Below") |
| `tr` | Per-copy transform with `so` (start opacity) and `eo` (end opacity) |

### Trim Path (`ty: 'tm'`)

| Field | Description |
|---|---|
| `s` | Segment start (0–100) |
| `e` | Segment end (0–100) |
| `o` | Offset (0–360) |
| `m` | Multiple shapes: 1=Parallel, 2=Sequential |

### Rounded Corners (`ty: 'rd'`)

| Field | Description |
|---|---|
| `r` | Corner radius |

### Pucker / Bloat (`ty: 'pb'`)

| Field | Description |
|---|---|
| `a` | Amount (%). 0=no change, >0 pulls vertices toward center, <0 pushes them away |

### Twist (`ty: 'tw'`)

| Field | Description |
|---|---|
| `a` | Angle |
| `c` | Center vector |

### Merge (`ty: 'mm'`)

| Field | Description |
|---|---|
| `mm` | Mode: 1=Merge, 2=Add, 3=Subtract, 4=Intersect, 5=Exclude |

### Offset Path (`ty: 'op'`)

| Field | Description |
|---|---|
| `a` | Amount |
| `lj` | Line Join |
| `ml` | Miter Limit |

### Zig Zag (`ty: 'zz'`)

| Field | Description |
|---|---|
| `r` | Frequency (ridges per segment) |
| `s` | Amplitude |
| `pt` | 1=corner, 2=smooth |
