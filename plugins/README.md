# Plugins

Each subdirectory is a plugin. The contract is in [`docs/architecture/plugins.md`](../docs/architecture/plugins.md).

## In this directory

| Plugin | Status | License of plugin | External tool license |
|--------|--------|-------------------|------------------------|
| `svg-import` | M2 | MIT | — |
| `dotlottie-pack` | M2 | MIT | — |
| `lottie-validate` | M2 | MIT | — |
| `lottie-optimize` | M2 | MIT | — |
| `gif-export` | M2 | MIT | — (LGPL ffmpeg invoked) |
| `glaxnimate-roundtrip` | M3 | MIT | GPL-3.0 (glaxnimate) |
| `dotlottie-render` | M3 | MIT | MIT (dotlottie-rs) |
| `python-lottie-helpers` | M3 | MIT | AGPL-3.0 (python-lottie) |

These are **manifest stubs** at M0. The `src/` implementations land in M2/M3 per the roadmap.

## Adding a plugin

1. Make a directory: `plugins/your-plugin-id/`.
2. Write `plugin.json` per the schema in `docs/architecture/plugins.md`.
3. Implement the entry per `run.type`:
   - `node`: a TS/JS module exporting a default `async (input, params) => output`.
   - `python`: a script reading a single argv path / stdin, writing stdout.
   - `shell`: nothing else needed; just the manifest's `args_template`.
   - `executable`: same as `shell` but the binary is bundled in the plugin dir.
4. Add a row to the table above.
5. PR.

## Why the AGPL/GPL plugins live here

We invoke them as separate processes (FSF "aggregation"). The plugin manifests are MIT (ours), the binaries are GPL/AGPL (theirs). No linking. Documented in [`docs/research/16-licenses.md`](../docs/research/16-licenses.md).
