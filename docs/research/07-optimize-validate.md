# Research 07 — Optimization, linting, validation

Two distinct concerns:

- **Validation** = "is this a structurally valid Lottie file?" Required before anything enters the library.
- **Optimization** = "can this be smaller without losing fidelity?" Optional but high-leverage.

## Validation

### The official path: `lottie-spec` JSON Schema

LAC publishes a JSON Schema for the format at [lottie.github.io/lottie-spec](https://lottie.github.io/lottie-spec/). Use a standard schema validator (`ajv` in Node, `jsonschema` in Python) to check any Lottie file against it.

Implementation in `open-lottie-ui`:

- Cache the schema locally under `packages/lottie-tools/schema/lottie-spec-1.0.1.json` (vendored).
- Expose `validate(lottieJson)` returning `{ valid: boolean, errors: AjvErrorObject[] }`.
- Run before any file is admitted to `library/` or `generations/`.

### Player-specific lints

Validation against the spec is necessary but not sufficient — a file can be valid spec-wise but rendered differently by lottie-web vs dotlottie-web. Useful lints:

- **Expressions present** → flag (Skottie / dotlottie-rs may not run them).
- **Text layers (`ty: 5`) present** → flag (text rendering varies; `python-lottie` even has a "convert text to shapes" pass).
- **External image refs** → check assets all resolve.
- **`ip > op`** → warn.
- **Frame rate mismatch** between layers and root — warn.
- **Unused assets** — flag for optimizer.

These are all hand-written passes, ~one function each.

## Optimization

### What "optimize" means

A typical Lottie JSON contains:

- **Verbose precision** (e.g., positions stored as `123.456789012345`).
- **Unused layers / assets** (especially after editor exports).
- **Duplicate keyframes** (same value repeated).
- **Large precomps** that could be flattened or referenced once.
- **Embedded base64 images** that could be externalized into a `.lottie` container.

### Available services & tools

| Tool | Type | Reduction | Notes |
|------|------|-----------|-------|
| LottieFiles Optimizer | Web service | up to 80% | + zipped layer (gzip). Free with account. |
| TinyLottie | Web service | up to 98% | Aggressive; same techniques. |
| Lottiemizer | Web service | varies | Browser-only. |
| Lottielab Optimize | Web service | varies | Built into Lottielab. |
| `dotlottie-rs` (`pack` mode) | CLI | n/a | Bundles into `.lottie`; not a JSON optimizer per se. |
| `python-lottie` | Library | n/a directly | Has `prettyprint=False` and you can roll your own pruning. |

There is **no widely-adopted open-source CLI optimizer** comparable to SVGO in the SVG world. This is an opportunity.

### Our default optimizer (planned)

A small TS module `packages/lottie-tools/optimize.ts` with composable passes:

1. **Round numerics** to N decimal places (default 3).
2. **Drop unused assets** (asset ids not referenced by any layer).
3. **Drop hidden layers** (`hd: true`).
4. **Merge duplicate keyframes** (consecutive identical `s` values, collapsed to a hold).
5. **Strip metadata** (optionally — preserve `meta.author` etc unless `--strip-meta`).
6. **Externalize base64 images** to `.lottie` `i/` directory (only when packaging).
7. **Pretty-print off** for output.

Each pass declares input/output guarantees and we re-validate after the chain.

## Decision for `open-lottie-ui`

- **Validation is mandatory and runs in two places**: (a) on import (file added to library); (b) on generation (Claude output before review queue).
- **Optimization is exposed as an explicit user action** (a "Optimize" button on a library item) with a checkbox per pass. Reason: people trust their files; auto-mutating them is bad UX. Show before/after size and a frame-by-frame visual diff (see `15-visual-diff.md`).
- **Round-tripping through external optimizers** (LottieFiles, TinyLottie) is documented but not automated — they're web services.

## Sources

- [Lottie Specs JSON Schema](https://lottie.github.io/lottie-spec/1.0.1/specs/schema/)
- [LottieFiles Optimize tool](https://lottiefiles.com/features/optimize-lottie)
- [TinyLottie](https://tiny-lottie.vercel.app/)
- [Lottielab Optimize](https://www.lottielab.com/optimise-lottie)
- [Lottiemizer](https://www.lottiemizer.com/)
- [LotifyAI JSON Optimizer](https://www.lotifyai.com/json-optimizer)
- [airbnb/lottie-web issue #2100 — optimization techniques](https://github.com/airbnb/lottie-web/issues/2100)
- [LottieFiles blog — Optimize for page load](https://lottiefiles.com/blog/working-with-lottie-animations/optimize-lottie-files-for-faster-page-load-speeds)
