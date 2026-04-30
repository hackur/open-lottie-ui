---
name: lottie-authoring
description: Author, validate, and remix Bodymovin / Lottie JSON animations. Use when the user asks to create a Lottie animation by hand, debug existing Lottie JSON, optimize an animation, or convert SVG to Lottie. Knows the lottie-spec subset, Bodymovin v5.12 conventions, and the project's Tier-1 template engine.
---

# Lottie authoring skill

Use this skill any time the conversation drifts into Lottie / Bodymovin territory: hand-authoring JSON, debugging a broken file, tweaking easing, building a Tier-1 template, optimizing for size, or remixing an existing animation in `seed-library/`.

## When to invoke

Trigger on requests like:

- "Make a Lottie that ..."
- "Why does this animation render blank?"
- "Convert this SVG into a Lottie"
- "Add a draw-on effect to ..."
- "Add a new Tier-1 template called ..."
- "Why does the validator reject ..."
- "Remix `loader-pulse` to be slower"

If the request is for a *non-trivial multi-layer composition* (anything past a single-shape transform), delegate the actual JSON authoring to the `lottie-author` subagent rather than authoring inline. Use the subagent for: draw-on effects, multi-layer compositions, complex easing curves, anything where you'd need to type out more than ~50 lines of Lottie JSON. The subagent has read-only tools (`Read`, `Glob`, `Grep`) and a system prompt loaded with the schema.

For trivial edits to an existing file, work inline.

## Key references

Always consult these before authoring or debugging — do not infer the schema from memory:

- **Cheatsheet:** `.claude/docs/lottie/cheatsheet.md` — compressed schema, common patterns, project conventions. Start here.
- **Spec slices:** `.claude/docs/lottie/spec/` — vendored lottie-spec markdown for properties, layers, shapes, animated values. Drill in when the cheatsheet is not enough.
- **Examples:** `.claude/docs/lottie/examples/` — small reference animations the parallel docs agent extracts from the spec.

(Those paths are populated by a separate `.claude/docs/lottie/` agent. If they are missing, alert the user before proceeding — do not attempt to fetch them yourself.)

## Project-specific gotchas

The project uses a **pragmatic subset** of Bodymovin v5.12. Read these before producing JSON:

1. **No text layers** (`ty: 5`). The validator rejects them; we do not ship a font pipeline in M1.
2. **No expressions** (`x` field on properties). Use keyframes only. Repair attempts that introduce expressions will be rejected.
3. **No precomps in v1** (`ty: 0`). All animations are flat; layers reference no nested compositions.
4. **No image assets** (`ty: 2`). Shape layers (`ty: 4`) only. SVG-to-Lottie conversion happens via the python-lottie plugin, not by hand.
5. **Opacity is 0–100 in transforms** (`ks.o.k`), not 0–1. Easy to flip if you've been writing CSS.
6. **Color is 0–1 normalized** in fills/strokes (`fl.c.k`, `st.c.k`). Four-element RGBA. `[0.078, 0.722, 0.651, 1]` not `[20, 184, 166, 255]`.
7. **`v` is `"5.12.0"` as a string**, not a number. Bodymovin spells the version as a semver string.
8. **`op` (out-point)** is the last frame index, exclusive. A 60-frame loop at 30fps has `ip: 0, op: 60`. Last keyframe `t` should equal `op` for a clean loop.
9. **Always emit a `meta` object** with `g` (generator), `a` (author), `k` (keywords). The library importer reads it.
10. **Layer name (`nm`) is required** in our subset, even though Bodymovin allows omitting it. The validator's `additionalProperties: true` is permissive but `required` is strict.

## Validator subset

The validator lives at `packages/lottie-tools/src/validator/validate.ts`. It compiles `packages/lottie-tools/schema/lottie.schema.json` (a hand-curated subset of lottie-spec's JSON schema). When validation fails, the driver triggers a repair attempt up to 3 times — see `docs/architecture/claude-integration.md` § "Repair loop".

Ways to make the validator happy on the first pass:

- Always include the seven root keys: `v`, `fr`, `ip`, `op`, `w`, `h`, `nm`, plus `assets: []`, `layers: [...]`, `meta: {...}`.
- Every layer needs: `ddd`, `ind`, `ty`, `nm`, `sr`, `ks`, `ao`, `ip`, `op`, `st`. Shape layers also need `shapes`.
- Every `ks` needs all six transform sub-properties: `o`, `r`, `p`, `a`, `s` (and optionally `sk`, `sa`).
- Every animatable property is `{ "a": 0, "k": <static> }` or `{ "a": 1, "k": [<keyframes>] }`.
- Keyframes need `t` (frame index) and `s` (start value). The interpolation `i`/`o` go on the *outgoing* keyframe (all but the last). The final keyframe needs only `t` and `s`.

If a validation error mentions `additionalProperties`, you've named a key that the schema does not know — re-check the cheatsheet.

## Tier-1 template engine

The project ships a template-substitution engine at `packages/lottie-tools/src/templates/`. Tier 1 is the cheap, fast, deterministic path: the LLM emits `<template-params>{...}</template-params>`, the driver substitutes into a static JSON body.

Templates live at `prompts/templates/<id>.json` and have this shape:

```json
{
  "id": "<kebab-case-id>",
  "name": "Display Name",
  "description": "One-line summary.",
  "params_schema": { "type": "object", "required": [...], "properties": { ... } },
  "body": { "v": "5.12.0", "fr": 30, ... }
}
```

The `body` is a Lottie animation with `{{paramName}}` placeholders. Substitution is plain string replace before JSON parse, so:

- Numbers and strings substitute as-is (`"op": "{{duration_frames}}"` becomes `"op": 60`).
- Arrays substitute literally (`"s": "{{color_a}}"` with `[0.1, 0.2, 0.3, 1]` becomes `"s": [0.1, 0.2, 0.3, 1]`).
- The placeholder *must* be the entire JSON value, including its surrounding quotes — never `"op": {{duration_frames}}` (that produces invalid JSON if the param is missing).

`params_schema` is JSON Schema (Draft 2020-12). The driver validates the LLM's emitted params against it before substitution. Use `required`, `minimum`/`maximum`, `enum` to constrain — every constraint shrinks the LLM's failure modes.

When asked to author a new Tier-1 template:

1. Pick a kebab-case `id`. Check `prompts/templates/` for collisions.
2. Read `prompts/templates/color-pulse.json` as a model — it covers most patterns (animated property with two keyframes, parametric color, parametric duration).
3. Author the body with realistic defaults baked into `params_schema.properties.<name>.default`.
4. Run the validator on the body with all defaults substituted (you can do this mentally for trivial templates; otherwise use the validator script).
5. Add an entry to `CHANGELOG.md`.

The slash command `/new-template` automates the scaffolding.

## Data model touchpoints

When the user approves a generated animation, the driver writes:

- `library/<id>/animation.json` — the Lottie file
- `library/<id>/meta.json` — title, source, license, hash, intrinsic dimensions
- `library/<id>/thumb.png` — cached thumbnail

Seed animations live at `seed-library/<id>/` with the same shape (animation.json + meta.json). When the skill creates a new seed, it follows that layout. License must be CC0 or equivalent — the project does not bundle non-redistributable assets. See `docs/research/16-licenses.md`.

The `content_hash` field in `meta.json` is `sha256` over the canonicalized animation.json. The script at `scripts/seed-hash.ts` computes it.

## Workflow expectations

Every change goes through review. The skill must not write directly to `library/`. Allowed write targets:

- `seed-library/<new-id>/animation.json` and `meta.json` for new seed animations (with explicit user approval).
- `prompts/templates/<id>.json` for new Tier-1 templates.
- `packages/lottie-tools/...` for engine changes (rare).
- `CHANGELOG.md` to log additions.

Generations live under `generations/<timestamp_slug>/` and are written by the driver, not by hand. Approval moves them into `library/`. Do not bypass that flow.

When in doubt about a workflow boundary, defer to `CLAUDE.md` and the ADRs under `docs/decisions/`.

## Output discipline

When asked to *show* JSON, wrap it in `<lottie-json>...</lottie-json>` tags exactly as the production driver expects. This keeps the skill compatible with the repair loop and downstream tooling. When *discussing* JSON without producing a final answer, write normal prose with fenced code blocks.

If you cannot meet a request — e.g., the user wants a text layer — say so explicitly and propose the nearest legal alternative (e.g., a shape that approximates the glyph, or a path traced from the SVG outlines). Do not fabricate a partial answer.
