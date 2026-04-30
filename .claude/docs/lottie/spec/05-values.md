# Values

Source: https://lottiefiles.github.io/lottie-docs/values/

Core value types used across Lottie properties.

## Integer Boolean

Values represented as either JSON booleans (`true`/`false`) or integers (`0`/`1`) depending on context.

## Vector

"Vector data is represented by an array of numbers." Used for multi-component properties like positions, typically as `[X, Y]`.

## Color (RGBA 0-1)

"Colors are Vectors with values between 0 and 1 for the RGB components."

Examples:
- `[1, 0, 0]` — red
- `[1, 0.5, 0]` — orange
- `[1, 1, 1, 1]` — white with full alpha

Four-component arrays may include alpha, though many players ignore it. Treat alpha as opaque (1) by default.

## Hex Color

String format with `#` prefix and hexadecimal digits per RGB component:

```
#FF8000
```

## Gradients

### Without Transparency

Flat array following pattern: `[offset, red, green, blue, ...]` with all values 0-1.

```
[0,    0.16, 0.18, 0.46,
 0.5,  0.20, 0.31, 0.69,
 1,    0.77, 0.85, 0.96]
```

Three color stops at offsets 0, 0.5, 1.

### With Transparency

Append alpha pairs: `[..., offset, alpha, ...]` after the RGB stops.

## Bezier Paths

Cubic bezier path attributes:

| Attr | Description |
|------|-------------|
| `v` | Vertex coordinates (array of points) |
| `i` | In-tangent points relative to vertices |
| `o` | Out-tangent points relative to vertices |
| `c` | Boolean: closed path |

The _n_th bezier segment is defined as:
```
v[n], v[n] + o[n], v[n+1] + i[n+1], v[n+1]
```

Linear segments use `[0, 0]` for tangents; smooth points require `i = -o`.

```json
{
  "v": [[0, 0], [100, 0], [100, 100]],
  "i": [[0, 0], [0, 0], [0, 0]],
  "o": [[0, 0], [0, 0], [0, 0]],
  "c": false
}
```
