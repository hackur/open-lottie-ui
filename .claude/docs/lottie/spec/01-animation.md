# Animation / Composition (top-level)

Source: https://lottiefiles.github.io/lottie-docs/composition/

The top-level JSON object describes the document, layers, assets, and other components. Canvas dimensions are set via `w` and `h`, duration is expressed in frames using `op`, framerate is specified in `fr`.

## Animation Object

| Attribute | Type | Title | Description |
|-----------|------|-------|-------------|
| `nm` | `string` | Name | Human-readable name, as seen from editors |
| `mn` | `string` | Match Name | Match name, used in expressions |
| `layers` | `array` of Layer | Layers | Layers |
| `v` | `string` | Bodymovin version | On very old versions some things might be slightly different |
| `ver` | `integer` | Specification Version | 6-digit number with version components as `MMmmpp` (major, minor, patch) |
| `fr` | `number` | Framerate | Framerate in frames per second |
| `ip` | `number` | In Point | Frame the animation starts at (usually 0) |
| `op` | `number` | Out Point | Frame the animation stops/loops at; duration in frames when `ip` is 0 |
| `w` | `integer` | Width | Width of the animation |
| `h` | `integer` | Height | Height of the animation |
| `ddd` | 0-1 `integer` | Threedimensional | Whether the animation has 3D layers |
| `assets` | `array` of Asset | Assets | List of assets that can be referenced by layers |
| `comps` | `array` of Precomposition | Extra Compositions | List of extra compositions not referenced by anything |
| `fonts` | Font List | Fonts | Fonts |
| `chars` | `array` of Character Data | Characters | Data defining text characters as lottie shapes |
| `meta` | Metadata | Metadata | Document metadata |
| `metadata` | User Metadata | User Metadata | User Metadata |
| `markers` | `array` of Marker | Markers | Markers defining named sections of the composition |
| `mb` | Motion Blur | Motion Blur | Motion Blur |
| `slots` | `object` | Slots | Dictionary of slot ids that will replace matching properties |

## Composition

An object containing a list of layers.

| Attribute | Type | Title | Description |
|-----------|------|-------|-------------|
| `layers` | `array` of Layer | Layers | Layers |

## Metadata

### Document Metadata

| Attribute | Type | Title | Description |
|-----------|------|-------|-------------|
| `a` | `string` | Author | Author |
| `d` | `string` | Description | Description |
| `tc` | `string` | Theme Color | Theme Color |
| `g` | `string` | Generator | Software used to generate the file |

### User Metadata

| Attribute | Type | Title | Description |
|-----------|------|-------|-------------|
| `filename` | `string` | Filename | Filename |
| `customProps` | `object` | Custom Properties | Custom Properties |

## Motion Blur

| Attribute | Type | Title | Description |
|-----------|------|-------|-------------|
| `sa` | `number` | Shutter Angle | Angle in degrees |
| `sp` | `number` | Shutter Phase | Angle in degrees |
| `spf` | `number` | Samples per Frame | Samples per Frame |
| `asl` | `number` | Adaptive Sample Limit | Adaptive Sample Limit |

## Minimal Animation Example

```json
{
  "v": "5.7.0",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 512,
  "h": 512,
  "nm": "Example",
  "ddd": 0,
  "assets": [],
  "layers": []
}
```
