# Schema sources

## `lottie.schema.json`

**Status:** Pragmatic subset — **not** the full upstream schema.

**Loosely based on:** [`lottie/lottie-spec`](https://github.com/lottie/lottie-spec) `schema/` directory.

- Repo: https://github.com/lottie/lottie-spec
- Commit referenced: `54e831b47bab74b280c810eb767937be4f23c679` (2026-04-28)
- Upstream root: https://raw.githubusercontent.com/lottie/lottie-spec/main/schema/root.json

### Why a subset?

The upstream `lottie-spec` schema is split across ~50+ files under
`schema/{composition,layers,shapes,properties,helpers,values,assets,constants}/`,
glued together with relative `$ref`s. Bundling them into a single Ajv-friendly
JSON document requires the upstream's own build tooling (`tools/`, Makefile),
which is non-trivial to mirror in this repo.

Until we vendor the upstream cleanly (planned for M1.x), this file validates
the **commonly required Bodymovin top-level fields**:

- `v` (version string)
- `fr` (frame rate)
- `ip`, `op` (in/out point)
- `w`, `h` (composition dimensions)
- `layers[]` (with basic per-layer requirements: every layer has `ty`; shape
  layers `ty: 4` must additionally carry `ks` and `shapes`)

Everything else is permissive (`additionalProperties: true`). This means we
catch the egregious "this isn't a Lottie at all" cases without false-failing
real-world animations that exercise corners of the spec we haven't modeled.

### How to refresh

When the upstream becomes easier to bundle, or when we're ready to invest in
our own bundling step:

1. Clone `lottie/lottie-spec` and run their build (`make` in the repo root)
   to produce a single bundled JSON Schema, or use a tool like
   [`json-schema-ref-parser`](https://github.com/APIDevTools/json-schema-ref-parser)
   to inline all `$ref`s starting from `schema/root.json`.
2. Replace `lottie.schema.json` with the bundled output. Keep the same file
   name and `$id` so consumers don't need code changes.
3. Update this file with the new commit SHA and the date of the refresh.
4. Drop the `"$comment": "Pragmatic subset, ..."` annotation at the top of the
   schema once it really is the full upstream.
5. Run `pnpm --filter @open-lottie/lottie-tools test` and the seed-library
   round-trip in `scripts/seed-hash.ts` to make sure nothing regressed.

### Versioning policy

When we vendor multiple upstream versions, follow the policy in this
directory's `README.md`: keep older versions next to newer ones
(`lottie-spec-X.Y.Z.json`), prefer the newest, fall back gracefully.
