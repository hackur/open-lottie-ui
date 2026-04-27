# Seed library

A handful of small CC0 / MIT-licensed Lottie files shipped with the repo so the admin shows something on first run. Copied into `library/` by the first-run wizard (M1) — never modified in place.

## Inventory

| id | License | Origin | Notes |
|----|---------|--------|-------|
| `loader-pulse` | CC0-1.0 | Hand-rolled by us | A pulsing circle. Validates against lottie-spec; renders identically in lottie-web and dotlottie-web. |

## Adding a new seed

1. Create `seed-library/<id>/animation.json` with a valid Lottie file.
2. Create `seed-library/<id>/meta.json` matching the schema in `docs/architecture/data-model.md`.
3. Ensure license is **CC0-1.0**, **MIT**, or **CC-BY-4.0**.
4. Validate by hand against `lottie-spec` until the validator ships in M1.
5. Add a row to the table above. PR.

## Why CC0 / MIT only

The repo itself is MIT. We don't want the seed library to introduce any redistribution restrictions that would prevent forks / vendoring.

## Why so small

5–10 small files is enough to demonstrate "this thing works." Anything more risks the LottieFiles "compete with us" terms (we don't lift their content) and bloats the repo. Power users import / generate their own libraries.
