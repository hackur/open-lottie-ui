# Lottie Cheatsheet

Dense reference for generating valid Lottie JSON. Use this when authoring or repairing animations.

## 1. Top-level Animation

```json
{
  "v":   "5.7.0",        // bodymovin/exporter version (required)
  "fr":  30,             // framerate, fps (required)
  "ip":  0,              // in point, frame (required, usually 0)
  "op":  60,             // out point, frame (required; ip..op = duration in frames)
  "w":   512,            // width (required)
  "h":   512,            // height (required)
  "nm":  "MyAnim",       // optional human name
  "ddd": 0,              // 0 = 2D, 1 = 3D (optional)
  "assets": [],          // precomps + image refs (required, may be empty)
  "layers": [],          // top-level layers (required)
  "markers": [],         // optional named time markers
  "meta":   {}           // optional document metadata
}
```

Required: `v`, `fr`, `ip`, `op`, `w`, `h`, `assets`, `layers`.

## 2. Layer types (`ty`)

| ty | Type | Required fields |
|----|------|-----------------|
| 0 | Precomposition | `refId`, `ks` (transform), `w`, `h` |
| 1 | Solid | `sw`, `sh`, `sc`, `ks` |
| 2 | Image | `refId`, `ks` |
| 3 | Null | `ks` (no visible content) |
| 4 | Shape | `shapes[]`, `ks` |
| 5 | Text | `t` (text data), `ks` |

All layers also need: `ind` (unique index), `ip`, `op`, `st` (start time, default 0), `nm` (name).

### Minimal shape layer skeleton

```json
{
  "ty": 4, "ind": 1, "nm": "Shape", "ip": 0, "op": 60, "st": 0,
  "ks": {
    "p": {"a": 0, "k": [256, 256]},
    "a": {"a": 0, "k": [0, 0]},
    "s": {"a": 0, "k": [100, 100]},
    "r": {"a": 0, "k": 0},
    "o": {"a": 0, "k": 100}
  },
  "shapes": [ /* shape items */ ]
}
```

## 3. Shape items (`ty` strings)

| Code | Item | Required fields |
|------|------|-----------------|
| `gr` | Group | `it[]` (must end with `tr`) |
| `rc` | Rectangle | `p`, `s`, `r` (corner radius) |
| `el` | Ellipse | `p`, `s` |
| `sh` | Path (bezier) | `ks` (bezier path) |
| `sr` | Star/Polygon | `p`, `pt`, `or`, `r`, `sy` (1=Star, 2=Polygon); stars also `ir`, `is`, `os` |
| `fl` | Fill | `c` (color), `o` (opacity), `r` (fill rule, 1 or 2) |
| `st` | Stroke | `c`, `o`, `w` (width), `lc`, `lj` |
| `gf` | Gradient Fill | `g`, `s`, `e`, `t` (1=Linear, 2=Radial), `o` |
| `gs` | Gradient Stroke | gradient + stroke fields |
| `tm` | Trim Path | `s`, `e`, `o` (offset), `m` (1=Parallel, 2=Sequential) |
| `tr` | Transform | `p`, `a`, `s`, `r`, `o`, optional `sk`, `sa` |
| `rp` | Repeater | `c` (copies), `o` (offset), `m`, `tr` |
| `mm` | Merge | `mm` (1-5: Merge/Add/Subtract/Intersect/Exclude) |
| `op` | Offset Path | `a` (amount), `lj`, `ml` |
| `rd` | Rounded Corners | `r` (radius) |

**Group rule**: every `gr` ends with a `tr` shape. Shape items inside `it` render bottom-up; place styles **after** shapes to apply to them.

## 4. Animatable properties — `{a, k}`

```json
// Static scalar
{ "a": 0, "k": 100 }

// Static vector
{ "a": 0, "k": [256, 256] }

// Static color (RGBA 0..1)
{ "a": 0, "k": [1, 0.5, 0, 1] }

// Animated scalar (single keyframe + ending kf)
{ "a": 1, "k": [
    {"t": 0,  "s": [0],   "i": {"x":[0.667],"y":[1]}, "o": {"x":[0.333],"y":[0]}},
    {"t": 30, "s": [100]}
  ]
}

// Animated vector
{ "a": 1, "k": [
    {"t": 0,  "s": [-100, 256], "i": {"x":[0.667],"y":[1]}, "o": {"x":[0.333],"y":[0]}},
    {"t": 30, "s": [256, 256]}
  ]
}
```

The **last** keyframe carries only `t` and `s` — it terminates the segment.

## 5. Keyframe timing tangents

| Curve | `o.x` | `o.y` | `i.x` | `i.y` |
|-------|-------|-------|-------|-------|
| Linear | 1 | 1 | 0 | 0 |
| Ease-out (decelerate) | 0 | 0 | 0.58 | 1 |
| Ease-in (accelerate) | 0.42 | 0 | 1 | 1 |
| Ease-in-out (smooth) | 0.42 | 0 | 0.58 | 1 |
| Strong out / soft in | 0.65 | 0 | 0.35 | 1 |
| Overshoot (back-out) | 0.34 | 1.56 | 0.64 | 1 |
| Hold (step) | — | — | — | — | use `"h": 1` on the keyframe instead |

For multi-component values, repeat per component: `"x": [0.42, 0.42]`.

## 6. Color & opacity conventions

- **Color**: RGBA floats 0..1, e.g. `[1, 0.392, 0.0, 1]` for orange
- **Opacity**: 0..100 (NOT 0..1) — `100` = fully opaque
- **Rotation**: degrees, clockwise positive
- **Scale**: percent, `100` = 1×
- **Position**: pixels in composition coordinates, origin at top-left

## 7. Common patterns

### a) Fade in (opacity 0 → 100)

```lottie-json
{
  "v": "5.7.0", "fr": 30, "ip": 0, "op": 30, "w": 256, "h": 256,
  "assets": [],
  "layers": [{
    "ty": 4, "ind": 1, "nm": "Fade", "ip": 0, "op": 30, "st": 0,
    "ks": {
      "p": {"a": 0, "k": [128, 128]},
      "a": {"a": 0, "k": [0, 0]},
      "s": {"a": 0, "k": [100, 100]},
      "r": {"a": 0, "k": 0},
      "o": {"a": 1, "k": [
        {"t": 0,  "s": [0],   "i": {"x":[0.667],"y":[1]}, "o": {"x":[0.333],"y":[0]}},
        {"t": 30, "s": [100]}
      ]}
    },
    "shapes": [{
      "ty": "gr", "nm": "g",
      "it": [
        {"ty": "el", "p": {"a":0,"k":[0,0]}, "s": {"a":0,"k":[120,120]}},
        {"ty": "fl", "c": {"a":0,"k":[0.2,0.6,1,1]}, "o": {"a":0,"k":100}, "r": 1},
        {"ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100}}
      ]
    }]
  }]
}
```

### b) Slide in from left (position keyframes)

```lottie-json
{
  "v": "5.7.0", "fr": 30, "ip": 0, "op": 45, "w": 512, "h": 256,
  "assets": [],
  "layers": [{
    "ty": 4, "ind": 1, "nm": "Slide", "ip": 0, "op": 45, "st": 0,
    "ks": {
      "p": {"a": 1, "k": [
        {"t": 0,  "s": [-100, 128], "i": {"x":[0.5],"y":[1]}, "o": {"x":[0.2],"y":[0]}},
        {"t": 30, "s": [256, 128]}
      ]},
      "a": {"a": 0, "k": [0, 0]},
      "s": {"a": 0, "k": [100, 100]},
      "r": {"a": 0, "k": 0},
      "o": {"a": 0, "k": 100}
    },
    "shapes": [{
      "ty": "gr", "nm": "g",
      "it": [
        {"ty": "rc", "p": {"a":0,"k":[0,0]}, "s": {"a":0,"k":[120,80]}, "r": {"a":0,"k":12}},
        {"ty": "fl", "c": {"a":0,"k":[1,0.4,0.2,1]}, "o": {"a":0,"k":100}, "r": 1},
        {"ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100}}
      ]
    }]
  }]
}
```

### c) Pulse (scale 100 → 110 → 100, looped)

```lottie-json
{
  "v": "5.7.0", "fr": 30, "ip": 0, "op": 60, "w": 256, "h": 256,
  "assets": [],
  "layers": [{
    "ty": 4, "ind": 1, "nm": "Pulse", "ip": 0, "op": 60, "st": 0,
    "ks": {
      "p": {"a": 0, "k": [128, 128]},
      "a": {"a": 0, "k": [0, 0]},
      "s": {"a": 1, "k": [
        {"t": 0,  "s": [100,100], "i": {"x":[0.42,0.42],"y":[1,1]}, "o": {"x":[0.58,0.58],"y":[0,0]}},
        {"t": 30, "s": [110,110], "i": {"x":[0.42,0.42],"y":[1,1]}, "o": {"x":[0.58,0.58],"y":[0,0]}},
        {"t": 60, "s": [100,100]}
      ]},
      "r": {"a": 0, "k": 0},
      "o": {"a": 0, "k": 100}
    },
    "shapes": [{
      "ty": "gr", "nm": "g",
      "it": [
        {"ty": "el", "p": {"a":0,"k":[0,0]}, "s": {"a":0,"k":[80,80]}},
        {"ty": "fl", "c": {"a":0,"k":[0.95,0.32,0.32,1]}, "o": {"a":0,"k":100}, "r": 1},
        {"ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100}}
      ]
    }]
  }]
}
```

### d) Draw-on with Trim Path (0 → 100)

```lottie-json
{
  "v": "5.7.0", "fr": 30, "ip": 0, "op": 45, "w": 256, "h": 256,
  "assets": [],
  "layers": [{
    "ty": 4, "ind": 1, "nm": "Draw", "ip": 0, "op": 45, "st": 0,
    "ks": {
      "p": {"a": 0, "k": [128, 128]},
      "a": {"a": 0, "k": [0, 0]},
      "s": {"a": 0, "k": [100, 100]},
      "r": {"a": 0, "k": 0},
      "o": {"a": 0, "k": 100}
    },
    "shapes": [{
      "ty": "gr", "nm": "g",
      "it": [
        {"ty": "el", "p": {"a":0,"k":[0,0]}, "s": {"a":0,"k":[160,160]}},
        {"ty": "tm",
         "s": {"a": 0, "k": 0},
         "e": {"a": 1, "k": [
           {"t": 0,  "s": [0],   "i": {"x":[0.667],"y":[1]}, "o": {"x":[0.333],"y":[0]}},
           {"t": 45, "s": [100]}
         ]},
         "o": {"a": 0, "k": 0}, "m": 1},
        {"ty": "st", "c": {"a":0,"k":[0.1,0.7,0.4,1]}, "w": {"a":0,"k":6}, "o": {"a":0,"k":100}, "lc": 2, "lj": 2},
        {"ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100}}
      ]
    }]
  }]
}
```

### e) Color cross-fade (mirror opacity on two fills)

```lottie-json
{
  "v": "5.7.0", "fr": 30, "ip": 0, "op": 60, "w": 256, "h": 256,
  "assets": [],
  "layers": [{
    "ty": 4, "ind": 1, "nm": "Crossfade", "ip": 0, "op": 60, "st": 0,
    "ks": {
      "p": {"a": 0, "k": [128, 128]}, "a": {"a": 0, "k": [0, 0]},
      "s": {"a": 0, "k": [100, 100]}, "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}
    },
    "shapes": [{
      "ty": "gr", "nm": "g",
      "it": [
        {"ty": "rc", "p": {"a":0,"k":[0,0]}, "s": {"a":0,"k":[160,160]}, "r": {"a":0,"k":24}},
        {"ty": "fl", "nm": "Blue",
         "c": {"a":0,"k":[0.13,0.52,0.94,1]},
         "o": {"a": 1, "k": [
           {"t": 0,  "s": [100], "i": {"x":[0.5],"y":[1]}, "o": {"x":[0.5],"y":[0]}},
           {"t": 60, "s": [0]}
         ]}, "r": 1},
        {"ty": "fl", "nm": "Pink",
         "c": {"a":0,"k":[0.96,0.28,0.55,1]},
         "o": {"a": 1, "k": [
           {"t": 0,  "s": [0],   "i": {"x":[0.5],"y":[1]}, "o": {"x":[0.5],"y":[0]}},
           {"t": 60, "s": [100]}
         ]}, "r": 1},
        {"ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100}}
      ]
    }]
  }]
}
```

### f) Rotate spin (linear 0° → 360°, looped)

```lottie-json
{
  "v": "5.7.0", "fr": 30, "ip": 0, "op": 60, "w": 256, "h": 256,
  "assets": [],
  "layers": [{
    "ty": 4, "ind": 1, "nm": "Spin", "ip": 0, "op": 60, "st": 0,
    "ks": {
      "p": {"a": 0, "k": [128, 128]}, "a": {"a": 0, "k": [0, 0]},
      "s": {"a": 0, "k": [100, 100]}, "o": {"a": 0, "k": 100},
      "r": {"a": 1, "k": [
        {"t": 0,  "s": [0],   "i": {"x":[1],"y":[1]}, "o": {"x":[0],"y":[0]}},
        {"t": 60, "s": [360]}
      ]}
    },
    "shapes": [{
      "ty": "gr", "nm": "g",
      "it": [
        {"ty": "sr", "p":{"a":0,"k":[0,0]}, "pt":{"a":0,"k":5}, "r":{"a":0,"k":0},
         "or":{"a":0,"k":80}, "ir":{"a":0,"k":40}, "os":{"a":0,"k":0}, "is":{"a":0,"k":0}, "sy":1},
        {"ty": "fl", "c": {"a":0,"k":[1,0.78,0.13,1]}, "o": {"a":0,"k":100}, "r": 1},
        {"ty": "tr", "p":{"a":0,"k":[0,0]}, "a":{"a":0,"k":[0,0]}, "s":{"a":0,"k":[100,100]}, "r":{"a":0,"k":0}, "o":{"a":0,"k":100}}
      ]
    }]
  }]
}
```

## 8. Validation gotchas

- Every group `gr` MUST end with a `tr` (Transform) item.
- The last keyframe in `k[]` carries only `t` + `s`, no `i`/`o`.
- Opacity is 0..100, never 0..1 — but Color is 0..1 floats.
- When animating a vector, `i.x` / `o.x` etc. should be arrays. Single-element arrays are accepted by most renderers as a shared bezier across all components.
- `assets: []` must exist (empty array) even with no precomps/images.
- `ind` of layers must be unique within a composition.
- Layers render TOP first → bottom last. First layer in `layers[]` is on top.
- `ip` and `op` on the Animation are in FRAMES (not seconds): duration_seconds = (op - ip) / fr.
