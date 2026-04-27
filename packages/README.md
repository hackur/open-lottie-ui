# packages/

Reusable libraries that aren't tied to the Next.js app. Each is a small TypeScript package, importable from the app and (eventually) publishable to npm under a `@open-lottie-ui/*` scope.

## Planned packages

| Package | Role | Public API surface |
|---------|------|--------------------|
| `lottie-tools` | Validation, optimization, render helpers, license registry. | `validate(json)`, `optimize(json, opts)`, `renderFrame(json, n, opts)`, `licenseFor(id)`. |
| `claude-driver` | Claude CLI invocation + ndjson parsing + repair loop. | `generate(opts) → { id, events, cancel }`. |

## Layout (planned)

```
packages/
├── lottie-tools/
│   ├── package.json
│   ├── src/
│   │   ├── validate.ts
│   │   ├── optimize/
│   │   ├── render.ts
│   │   └── lints/
│   ├── schema/                     # vendored JSON Schemas (lottie-spec, dotLottie manifest)
│   ├── licenses.json               # license registry (already in M0)
│   └── tsconfig.json
└── claude-driver/
    ├── package.json
    ├── src/
    │   ├── driver.ts
    │   ├── parse-stream.ts
    │   ├── repair-loop.ts
    │   └── types.ts
    └── tsconfig.json
```

## Why split into packages

- **Reusable from a CLI / CI tool later.** Validation and the Claude driver should be importable without the Next.js app.
- **Test-friendly.** Each package is a unit-test target; the app gets to be a thin orchestration layer.
- **Publishable.** When public, anyone can `pnpm add @open-lottie-ui/claude-driver` and build their own admin-flavored tool.

## Why not workspaces yet?

A `pnpm-workspace.yaml` lands when the M1 scaffold is created. At M0 we only ship the static artifacts (`licenses.json`, `schema/README.md`).

## License-registry contract

`packages/lottie-tools/licenses.json` is the canonical map of license ids → records. The import pipeline writes `license_id` into each library item's `meta.json`; the export bundle reads this registry to generate `LICENSES.md` and to enforce share-alike / no-redistribute-collection constraints.

To add a license: append an entry to `licenses.json` with the same shape as existing rows. Update `docs/research/16-licenses.md` if it's a license we're consuming on import.
