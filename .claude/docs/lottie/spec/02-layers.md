# Layers

Source: https://lottiefiles.github.io/lottie-docs/layers/

Layers are the fundamental building blocks of Lottie animations. Each layer has a specific type defined by the `ty` property, which determines its rendering behavior and properties.

## Layer Type Reference

| `ty` Value | Layer Type | Purpose |
|---|---|---|
| `0` | Precomposition | Renders nested animation compositions |
| `1` | Solid | Renders colored rectangles |
| `2` | Image | Renders static image assets |
| `3` | Null | Invisible container for parenting |
| `4` | Shape | Renders vector shapes |
| `5` | Text | Renders text content |
| `6` | Audio | Plays sound assets |
| `13` | Camera | Controls 3D perspective |
| `15` | Data | Links to data sources |

## Core Layer Properties (all layers)

| Property | Type | Description |
|---|---|---|
| `nm` | string | Human-readable name |
| `mn` | string | Match name for expressions |
| `ddd` | 0-1 integer | 3D layer flag |
| `hd` | boolean | Hidden state |
| `ty` | integer | Layer type identifier |
| `ind` | integer | Unique layer index |
| `parent` | integer | Parent layer index |
| `sr` | number | Time stretch factor |
| `ip` | number | In-point frame |
| `op` | number | Out-point frame |
| `st` | number | Start time |

## Visual Layer Properties

| Property | Type | Description |
|---|---|---|
| `ks` | Transform | Layer transformation matrix |
| `ao` | 0-1 integer | Auto-orient to path |
| `tt` | Matte Mode | Track matte mode |
| `tp` | integer | Matte parent index |
| `td` | 0-1 integer | Matte target flag |
| `hasMask` | boolean | Masks applied |
| `masksProperties` | Mask array | Layer masks |
| `ef` | Effect array | Layer effects |
| `mb` | boolean | Motion blur enabled |
| `sy` | Layer Style array | Styling effects |
| `bm` | Blend Mode | Blend mode constant |
| `cl` | string | CSS class |
| `ln` | string | SVG id attribute |
| `tg` | string | SVG tag name |
| `ct` | 0-1 integer | Collapse transform |

## Parenting

Layers establish hierarchical relationships through the `parent` property. "Layers having a `parent` attribute matching another layer will inherit their parent's transform (except for opacity)." Child transforms require multiplying by parent transform matrices. The flat structure enables flexible parenting where sibling children can interleave with unrelated layers.

## Shape Layer (`ty: 4`)

Renders vector graphics defined in a `shapes` array containing graphic elements.

Unique Properties:
- `shapes` — array of graphic elements (shapes, groups, fills, strokes)

## Precomposition Layer (`ty: 0`)

Renders nested animation compositions from assets.

Unique Properties:
- `refId` — asset reference identifier
- `w` — clipping rectangle width
- `h` — clipping rectangle height
- `tm` — time remapping scalar property

### Time Remapping

The `tm` property maps animation time. "You get the value of `tm` at the current frame, then assume that's a time in seconds since the start of the animation, and render the corresponding frame of the precomposition."

## Null Layer (`ty: 3`)

Used primarily as a parent container for organizing other layers. No special properties.

## Text Layer (`ty: 5`)

Unique Properties:
- `t` — Text Data structure

## Image Layer (`ty: 2`)

Unique Properties:
- `refId` — asset reference identifier

## Solid Layer (`ty: 1`)

Unique Properties:
- `sw` — width (integer)
- `sh` — height (integer)
- `sc` — color (hex color string)

Note: "Anything you can do with solid layers, you can do better with a shape layer and a rectangle shape since none of this layer's own properties can be animated."

## Audio Layer (`ty: 6`)

Unique Properties:
- `refId` — sound asset identifier
- `au` — Audio Settings object (`lv` audio level)

## 3D Layers

Enable 3D transforms by setting `ddd: 1` at layer and composition level.

3D Transform Properties:
- `a` — anchor point (3D vector)
- `p` — position (3D vector)
- `rx` — rotation X-axis
- `ry` — rotation Y-axis
- `rz` — rotation Z-axis
- `or` — orientation vector

## Camera Layer (`ty: 13`)

Unique Properties:
- `pe` — perspective scalar (distance from Z=0 plane). Small values yield stronger perspective.

## Data Layer (`ty: 15`)

Unique Properties:
- `refId` — data source identifier

## Masking & Matting

### Track Mattes

Track mattes use one layer to mask another. The masking layer sets the `tt` property; the masked layer references it via `tp` or uses the layer above by default (`td: 1`).

### Layer Masks

Layer masks clip content to animated Bezier curves. Differs from mattes: "with mattes, you use a layer to define the clipping area, while with masks you use an animated bezier curve."

Mask Properties:
- `hasMask` — boolean flag
- `masksProperties` — array of mask objects with path, mode, opacity, invert, and expand settings

## Layer Rendering Order

Items coming first will be rendered on top — render order proceeds from last to first element in layer arrays, affecting visual z-ordering.

## Auto-Orient

When `ao: 1`, layers rotate to match animated position path directions. "When true, if the transform position is animated, it rotates the layer along the path the position follows."
