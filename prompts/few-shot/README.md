# Few-shot prompt corpus

Hand-validated `(prompt, output)` pairs injected into the system prompt. The driver picks 1–3 most similar to the user's prompt at call time (cosine similarity over a tiny embedding, or simple keyword match in v1).

## File format

```jsonc
// fade-in-30f.json
{
  "id": "fade-in-30f",
  "tags": ["fade", "opacity", "ease", "loop"],
  "prompt": "A circle that fades in over 30 frames",
  "system_addendum": null,
  "output_tier": 3,
  "output": {
    "v": "5.12",
    "fr": 30,
    "ip": 0,
    "op": 30,
    "w": 200,
    "h": 200,
    "nm": "fade-in-30f",
    "assets": [],
    "layers": [ /* ... validated lottie ... */ ]
  }
}
```

`output_tier: 1|2|3` matches the prompt-tier system. For Tier 1 examples, `output` is the `params` object; for Tier 2 it's the Python source.

## Curation rules

- Each example must validate against the lottie-spec.
- Each must render non-blank in lottie-web *and* dotlottie-web.
- Keep small (≤ 5 KB JSON) so we can include several in context.
- Diverse: cover fade, slide, scale, draw-on, color cross-fade, rotate, repeater pattern.

## Initial corpus (planned)

- `fade-in-30f.json`
- `slide-in-from-left-30f.json`
- `scale-bounce-48f.json`
- `draw-on-circle-60f.json`
- `color-pulse-teal-60f.json`
- `rotate-loop-90f.json`
- `repeater-radial-12-spokes.json`

(Stubs only at M0; concrete files land in M1 alongside the driver.)
