---
description: Generate a Tier-1 animation from a prompt and add it to seed-library
---

You will generate a CC0-licensed Lottie animation from a natural-language prompt and add it to `seed-library/`. Seed library entries are hand-rolled, redistributable references that ship with the repo — distinct from `library/`, which is user content.

## Inputs

- **Prompt** — what the animation should do (e.g. "A heart that beats twice, slowly").
- **Optional id** — kebab-case slug. If not provided, derive from the prompt and confirm with the user.
- **Optional template hint** — if the user mentions a Tier-1 template (`color-pulse`, `fade-in`, etc.), favor that as the basis.

## Steps

1. **Pick or confirm an id.** Run `Glob` over `seed-library/*/` to confirm no collision. Ask the user if there is any ambiguity.
2. **Delegate authoring to the `lottie-author` subagent.** Provide the prompt, target dimensions (default 200×200), fps (default 30), and any template hint. Ask the subagent for the final answer in `<lottie-json>...</lottie-json>` form.
3. **Parse and validate.** Extract the JSON from the subagent's output. Confirm:
   - It parses as JSON.
   - `v` is `"5.12.0"`, `fr`/`ip`/`op`/`w`/`h`/`nm`/`assets`/`layers`/`meta` are all present.
   - No forbidden layer types (`ty: 5` text, `ty: 0` precomp, `ty: 2` image).
   - No `x` (expression) fields on any property.
   - Opacity values in `ks.o.k` are 0–100. Color values in `fl.c.k`/`st.c.k` are 0–1.
   - Last keyframe of every animated property has only `t` and `s` (no `i`/`o`).
   If anything fails, ask the subagent to repair and re-emit.
4. **Compute the content hash.** Use `scripts/seed-hash.ts` if it is callable; otherwise note the hash as `sha256:<TBD>` and tell the user to run the hashing script before committing.
5. **Write the two files:**
   - `seed-library/<id>/animation.json` — the validated Lottie JSON, pretty-printed with 2-space indent.
   - `seed-library/<id>/meta.json` — schema below.
6. **Update `seed-library/README.md`** if it has an index of seeds. Add the new entry alphabetically.
7. **Update `CHANGELOG.md`.** Add a one-line entry under Unreleased: `Added seed animation \`<id>\` — <one-line description>.`

## `meta.json` schema

Use this shape (cross-reference an existing file like `seed-library/loader-pulse/meta.json`):

```json
{
  "id": "<kebab-case-id>",
  "title": "<Title Case>",
  "tags": ["<one>", "<two>", "seed"],
  "source": "seed",
  "source_url": null,
  "license_id": "CC0-1.0",
  "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
  "attribution_required": false,
  "attribution_text": null,
  "imported_at": "<ISO 8601 UTC>",
  "imported_by": "open-lottie-ui",
  "content_hash": "sha256:<hash>",
  "intrinsic": {
    "fr": <number>,
    "ip": <number>,
    "op": <number>,
    "w": <number>,
    "h": <number>,
    "layer_count": <number>,
    "size_bytes": <number>
  },
  "from_generation": null
}
```

`license_id` must be `CC0-1.0` for seeds — the project does not ship non-redistributable assets. See `docs/research/16-licenses.md`.

## Constraints

- Write only under `seed-library/<id>/`. Do not touch `library/`, `generations/`, or `apps/`.
- If the prompt asks for something the schema cannot express (e.g. text), surface it and propose a tracing-based alternative or decline cleanly.
- If you reach for a third-party asset (LottieFiles, Lordicon, etc.), stop — those are not CC0 and cannot become seeds.

## Report

When done, list:

- The new file paths.
- The parameters used (size, fps, duration, colors).
- The content hash if you computed it, or a note that the user must run `scripts/seed-hash.ts`.
- Any validation warnings that did not block.

Do not commit; the user reviews first.
