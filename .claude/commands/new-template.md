---
description: Scaffold a new Tier-1 Lottie template (prompt + body + params schema)
---

You will scaffold a new Tier-1 template under `prompts/templates/`. Tier-1 templates are static Lottie JSON bodies with `{{paramName}}` placeholders that the driver substitutes from LLM-emitted `<template-params>` blocks.

## Steps

1. **Confirm the template `id`.** It must be kebab-case and unique. Run `Glob` over `prompts/templates/*.json` to confirm no collision. If the user did not specify an id, ask before proceeding.
2. **Read the canonical example.** Open `prompts/templates/color-pulse.json` end-to-end. It demonstrates the full shape: `id`, `name`, `description`, `params_schema` (JSON Schema Draft 2020-12), and `body` (a Lottie animation with `{{...}}` placeholders).
3. **Read a second example** that matches the new template's complexity — e.g. `fade-in.json` for single-property animations, `draw-on-path.json` for trim-path effects, `scale-bounce.json` for multi-keyframe transforms.
4. **Invoke the `lottie-author` subagent** for the body. Hand it the template's animation goal, the parameters you want to expose, and the placeholder syntax. Ask it to return the body in discussion mode (not as a final `<lottie-json>` block) so you can wrap it in the template envelope.
5. **Author `params_schema`.** Every parameter referenced by `{{name}}` in the body needs a schema entry with `type`, sensible `minimum`/`maximum` or `enum`, and a `default`. Mark structurally-required params (anything without a sane default) in `required`.
6. **Write the file** to `prompts/templates/<id>.json`. Pretty-print with 2-space indent.
7. **Validate.** Mentally substitute the defaults into the body and confirm the result is valid Lottie. If you have access to `pnpm`, run the project's validator (`pnpm --filter lottie-tools test` or the validate script) — but do not block on it; the user has CI elsewhere.
8. **Update `CHANGELOG.md`.** Add a one-line entry under the Unreleased section: `Added Tier-1 template \`<id>\` — <one-line description>.`

## Constraints

- Use the project's pragmatic subset (no text layers, no expressions, no precomps). See `.claude/skills/lottie-authoring/SKILL.md` for the gotcha list.
- The template's `body.meta` must include `g`, `a`, `k` and may include parametric fields like `easing`.
- Placeholders must be the entire JSON value: `"op": "{{duration_frames}}"` not `"op": {{duration_frames}}`. Substitution is plain string replace before parse.
- Defaults in `params_schema.properties.<name>.default` must produce a renderable animation when used as-is.

## Report

When done, list:

- The new file path.
- The parameter names and their types.
- Any open questions the user should resolve before committing.

Do not commit; the user reviews first.
