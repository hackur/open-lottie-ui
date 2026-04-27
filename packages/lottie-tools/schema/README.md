# Vendored schemas

This directory holds vendored copies of upstream JSON Schemas that we validate against. Vendoring keeps validation deterministic and offline-friendly.

## Files (planned)

- `lottie-spec-1.0.1.json` — copy of [lottie.github.io/lottie-spec/1.0.1/specs/schema/](https://lottie.github.io/lottie-spec/1.0.1/specs/schema/). The canonical Lottie schema. Drop in at M1.
- `dotlottie-manifest-2.0.json` — copy of the dotLottie 2.0 manifest schema from [dotlottie.io/spec/2.0/](https://dotlottie.io/spec/2.0/). For validating `manifest.json` inside `.lottie` containers.

## Update policy

- Track upstream releases. When a new spec version drops:
  1. Vendor the new schema as `lottie-spec-X.Y.Z.json` (do not overwrite).
  2. Add a code path that prefers the newer schema; fall back if errors.
  3. Add a regression test set against both old and new.
- Annotate each file's header with the upstream URL and SHA-256 we copied.

## Do not edit vendored schemas

Treat them as read-only. Custom lints belong in `packages/lottie-tools/lints/`, not in modifications to the vendored JSON Schema.
