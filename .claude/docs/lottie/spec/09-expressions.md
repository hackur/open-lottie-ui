# Expressions

Source: https://lottiefiles.github.io/lottie-docs/expressions/

Lottie expressions allow modifying property values using JavaScript/ECMAScript, based on After Effects expressions. They enable dynamic animations without keyframes.

## Required Output Variable

Every expression must declare and assign `$bm_rt`, which determines the expression's output:

```javascript
var $bm_rt = 60;          // scalar (e.g. rotation)
var $bm_rt = [256, 256];  // vector (e.g. position)
```

## Global Objects

| Symbol | Description |
|--------|-------------|
| `time` | Current time in seconds (read-only) |
| `value` | The property's value without expressions applied (read-only) |
| `thisProperty` | The property the expression operates on |
| `thisComp` | The composition containing the property |
| `thisLayer` | The layer containing the property |

## Essential Functions

### Interpolation
- `linear(t, tMin, tMax, value1, value2)` — linear interpolation
- `ease(t, tMin, tMax, value1, value2)` — smooth cubic
- `easeIn(...)` — slow start, linear end
- `easeOut(...)` — linear start, slow end

### Math Operations
Vector and scalar math: `add()`, `sub()`, `mul()`, `div()`, `mod()`, `clamp()`.

### Utility Functions
- `random()` — random numbers (optionally seeded)
- `length(v)` — vector magnitude / distance
- `normalize(v)` — scale vector to unit length
- `degreesToRadians(d)`, `radiansToDegrees(r)`
- `wiggle(freq, amp)` — pseudo-random oscillation
- `loopOut("cycle"|"pingpong"|"offset"|"continue")` — loop after last keyframe

## Examples

### Time-based rotation
```javascript
var $bm_rt = time * 360;
```

### Oscillating position
```javascript
var $bm_rt = [];
$bm_rt[0] = value[0] + Math.cos(2 * Math.PI * time) * 100;
$bm_rt[1] = value[1];
```

### Loop forever
```javascript
var $bm_rt = loopOut("cycle");
```

### Wiggle (camera shake)
```javascript
var $bm_rt = wiggle(5, 20);  // 5 wiggles/sec, ±20 px
```

## Renderer support caveat

Expressions are **not universally supported**. lottie-web supports a subset; Telegram stickers and many native renderers ignore expressions entirely. For maximum portability, **bake expressions into keyframes** before shipping.
