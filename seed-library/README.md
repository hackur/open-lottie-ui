# Seed library

A handful of small CC0 / MIT-licensed Lottie files shipped with the repo so the admin shows something on first run. Copied into `library/` by the first-run wizard (M1) — never modified in place.

## Inventory

| id | License | Origin | Notes |
|----|---------|--------|-------|
| `loader-pulse` | CC0-1.0 | Hand-rolled by us | A pulsing circle. Validates against lottie-spec; renders identically in lottie-web and dotlottie-web. |
| `checkmark-success` | CC0-1.0 | Hand-rolled by us | A green checkmark that draws on via Trim Paths over 45 frames, then a small scale bounce. |
| `spinner-arc` | CC0-1.0 | Hand-rolled by us | A teal 3/4-circle arc rotating 360° over 60 frames; seamlessly loopable. |
| `heart-beat` | CC0-1.0 | Hand-rolled by us | A rose-red heart double-beating (100 → 120 → 100 → 115 → 100) over 36 frames. Filled `sh` path. |
| `success-burst` | CC0-1.0 | Hand-rolled by us | Green circle pops in with overshoot, white check draws on, then both gently breathe. 60 frames, 2 layers. |
| `typing-dots` | CC0-1.0 | Hand-rolled by us | Three grey dots pulsing opacity in sequence with a 10-frame phase offset. Loops. 3 layers. |
| `error-shake` | CC0-1.0 | Hand-rolled by us | A red X icon shaking ±12° four times then settling, cubic ease per step. 30 frames. |
| `progress-bar` | CC0-1.0 | Hand-rolled by us | A teal rounded-rect fill growing 0 → 360 px on a dim track, ease-out cubic. 400×80 canvas. |

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
