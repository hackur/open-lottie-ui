# Research 10 — Prompting strategies for Lottie generation

The hardest part of this project. Asking an LLM "give me a Lottie JSON of a bouncing ball" historically produces malformed output. We need a layered strategy.

## Why raw "produce JSON" fails

- Lottie JSON is **dense** — a non-trivial animation is 5–20 KB, much of it repeated boilerplate.
- Many fields are interdependent (`ip`/`op` of layers vs root, `parent` references, `refId` lookup into `assets`).
- Bezier path data is encoded as compact tuples that are easy to miscount.
- The model has limited context budget and tends to truncate large outputs.

The result of a naive "give me a Lottie of X" prompt is usually a near-miss that fails validation in subtle ways.

## Layered strategy — three tiers from cheap to expensive

### Tier 1 — Templated parameter substitution (fastest, most reliable)

For the 80 % of common patterns (fade-in, draw-on, color-pulse, slide, scale-bounce, rotate-loop, …) we maintain a **template library** under `packages/lottie-tools/templates/`. Each template is a JSON file with `{{placeholders}}`.

The LLM's job is just to fill in parameters:

```jsonc
// prompt schema sent to Claude
{
  "template": "color-pulse",
  "params": {
    "color_a": [0.13, 0.74, 0.91, 1],
    "color_b": [0.93, 0.44, 0.13, 1],
    "duration_frames": 60,
    "easing": "easeInOutSine"
  }
}
```

We post-process the template with the values and validate. This is essentially a constrained decoding pattern executed in our app code rather than at the model level.

### Tier 2 — Generate a `bodymovin-python` script (medium reliability, high expressiveness)

For "novel but expressible" requests, ask Claude to write a Python script using `bodymovin-python` (MIT-licensed dataclass model). The script imports our prompt's helpers and prints the JSON. We run it in a sandboxed Python venv, capture stdout, validate.

```python
# generated script (example shape)
from bodymovin import Animation, layers, shapes, properties

anim = Animation(width=200, height=200, frame_rate=30, in_point=0, out_point=60, name="ball-bounce")
ball = layers.Shape(name="ball")
ball.shapes.append(shapes.Ellipse(size=[80,80]))
ball.transform.position.add_keyframe(0, [100, 50])
ball.transform.position.add_keyframe(60, [100, 150])
anim.layers.append(ball)
print(anim.to_json())
```

Why this works better than raw JSON: Python is in-distribution for Claude, the dataclass API is small, and any error (bad import, wrong field name) surfaces as a Python traceback we can feed back into the next iteration.

### Tier 3 — Schema-grounded raw JSON with validate-and-repair loop (slow, expensive, last resort)

For genuinely novel asks (or when the user explicitly chose "raw mode"):

1. Inject a **compressed schema**: not the full lottie-spec JSON Schema (too long), but a bullet-point summary listing the layer types, the `ks` transform shape, and 3 worked examples.
2. Ask for **just the JSON, no prose**. Use `--output-format text` and instruct: `Return only the Lottie JSON, no markdown fences, no commentary.`
3. **Validate** with our `lottie-spec` ajv validator.
4. If invalid, **repair loop**: send the original prompt + the broken JSON + the validator errors with a `Fix the following errors. Return only the corrected JSON.` prompt. Cap at 3 iterations.
5. **Render headlessly** — file might validate but be visually empty / black. Reject if all-frame pixel diff vs blank is < threshold.

## Schema injection budget

Claude's context handles the full `lottie-spec` schema fine, but it bloats every call's cost. Strategy:

- Keep a **minimal subset** as the default system prompt (~2 KB): root fields + 5 layer types + transform shape + animatable-property shape + a "trim path" example because that's how 50 % of effects are built.
- Offer a **`--full-schema`** prompt option for complex asks — adds the full schema to the system prompt for that one call.

## Few-shot examples in the prompt

We curate a `prompts/few-shot/` directory of (prompt, output) pairs that have been hand-validated. These are injected into the system prompt as worked examples. Examples we want at minimum:

- Fade-in over 30 frames.
- Draw-on of an SVG path using `tm` (trim path).
- Two-color cross-fade.
- Scale-bounce with overshoot easing.
- Loop with hold at start + end.

Few-shot beats schema injection for "make it look right" — the model picks up our preferred conventions (frame rates, naming, opacity ranges).

## Feedback from rejection reasons

When a human rejects a generation, they pick a reason from a small list (or write free-form): `wrong-color`, `too-fast`, `not-smooth`, `missing-element`, `wrong-style`, …

The next iteration's prompt includes:

```
Previous attempt was rejected by the user with reason: "too-fast — slow it 2x"
Previous JSON: <attached>
Generate a corrected version.
```

This is where the project compounds: every rejection improves the next try.

## Per-prompt configuration we expose

| Knob | Default | When to change |
|------|---------|----------------|
| Template (Tier 1) | auto-detect | force a template for predictability |
| Tier (1/2/3) | 1 → fall through on miss | force tier 3 for raw mode |
| Schema mode | minimal | full for complex asks |
| Model | `claude-opus-4-7` | sonnet/haiku for simple tweaks to save $ |
| Max repair attempts | 3 | 0 to disable, fail fast |
| Render on output | yes | no to skip preview gen |

## Sources

- [Structured output generation in LLMs — Karatas / Medium](https://medium.com/@emrekaratas-ai/structured-output-generation-in-llms-json-schema-and-grammar-based-decoding-6a5c58b698a6)
- [The guide to structured outputs and function calling with LLMs — agenta.ai](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms)
- [Schema reinforcement learning paper (arXiv 2502.18878)](https://arxiv.org/html/2502.18878v1)
- [imaurer/awesome-llm-json](https://github.com/imaurer/awesome-llm-json)
- [Configure structured output for LLMs (Anyscale)](https://docs.anyscale.com/llm/serving/structured-output)
- [Claude CLI reference](https://code.claude.com/docs/en/cli-reference)
