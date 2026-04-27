# Template library (Tier 1 prompting)

Each file in this directory is a **parameterized Lottie scaffold**. Claude's job for Tier 1 is to fill in `<template-params>` matching the template's `params_schema`; the tool substitutes values into the scaffold and validates.

## File structure

```jsonc
// color-pulse.json
{
  "id": "color-pulse",
  "name": "Color Pulse",
  "description": "A circle whose fill color cross-fades between A and B over N frames, looped.",
  "params_schema": {
    "type": "object",
    "required": ["color_a", "color_b", "duration_frames"],
    "properties": {
      "color_a":         { "type": "array", "minItems": 3, "maxItems": 4, "items": { "type": "number" } },
      "color_b":         { "type": "array", "minItems": 3, "maxItems": 4, "items": { "type": "number" } },
      "duration_frames": { "type": "integer", "minimum": 6, "maximum": 600, "default": 60 },
      "easing":          { "type": "string", "enum": ["linear", "easeInOutSine", "easeOutQuad"], "default": "easeInOutSine" },
      "size":            { "type": "integer", "minimum": 16, "maximum": 1024, "default": 200 }
    }
  },
  "scaffold": { /* a Lottie JSON with placeholders like "{{color_a}}", "{{duration_frames}}" */ }
}
```

## Substitution semantics

- `"{{name}}"` (string-only) → replaced verbatim with the param value.
- `{ "$ref": "{{name}}" }` → replaced *as a value* (so an array param like `color_a` can be inserted into a position array slot).
- Computed expressions: `"{{ duration_frames * 2 }}"` not supported in v1; if you need that, use a Tier 2 (Python) generator.

## Templates shipped at v1

| id | What it makes |
|----|---------------|
| `color-pulse` | A shape whose fill cross-fades between two colors, looped. |
| `fade-in` | A shape that fades from opacity 0 → 100 over N frames. |
| `scale-bounce` | A shape that scales 100 → 110 → 100 with overshoot. |
| `draw-on-path` | A path drawn on via animated trim. |
| `slide-in` | A shape that slides from off-canvas to a target position. |

(These are stubs at M0; the actual JSON is filled in during M1.)
