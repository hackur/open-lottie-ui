# Plugin / extension system

The point of the plugin system: **adding a community CLI to the admin should be a manifest, not a code change.** Anyone with a tool that "takes a Lottie in, does something useful, returns Lottie or an asset out" can wire it in.

> **As-shipped in M1:** the **manifest format below is real (ADR-007) but the loader is not yet built.** Per ADR-008, M1 hardcodes the plugin surfaces directly in API routes — see `apps/admin/app/api/library/[id]/{optimize,duplicate,export/video,glaxnimate}/route.ts` and the import routes for SVG/URL/video. The manifest files under `plugins/*/plugin.json` are stubs documenting intent. Real loader work lands in M2.

## Design constraints

- **Local CLIs only.** No remote URLs, no `eval`, no plugin code shipped from the internet.
- **Manifest-driven.** Each plugin is a directory with `plugin.json`; everything else is referenced from there.
- **Capability-scoped.** Plugins declare what they touch (input shape, output shape, files in the project they read/write). Loader enforces.
- **Discoverable.** Plugins live under `plugins/` (the project) or `~/.config/open-lottie-ui/plugins/` (the user). On boot we list both.
- **Versioned.** `manifest_version: 1` so we can evolve.
- **No runtime install ceremony.** A plugin's required CLI must be on PATH; the plugin manifest declares `requires`. We never auto-install.

## Manifest schema (v1)

```jsonc
// plugins/dotlottie-pack/plugin.json
{
  "manifest_version": 1,
  "id": "dotlottie-pack",
  "name": "Pack to .lottie",
  "description": "Bundle one or more animations into a single .lottie file.",
  "author": "open-lottie-ui",
  "homepage": "https://github.com/open-lottie-ui/open-lottie-ui",
  "license": "MIT",

  // What this plugin needs to be runnable.
  "requires": {
    "node_modules": ["@lottiefiles/dotlottie-js"],
    "binaries": [],                     // e.g. ["ffmpeg"], ["glaxnimate"]
    "python_packages": []
  },

  // Where in the UI this plugin shows up.
  "surfaces": [
    { "type": "library_item_action", "label": "Pack to .lottie", "icon": "package" },
    { "type": "library_multi_action", "label": "Pack selected to .lottie", "icon": "package" }
  ],

  // What the plugin consumes and produces.
  "io": {
    "input": "lottie[]",                // "lottie" | "lottie[]" | "svg" | "none"
    "output": "dotlottie",              // "lottie" | "dotlottie" | "png" | "gif" | "mp4" | "report"
    "params_schema": {
      "type": "object",
      "properties": {
        "filename": { "type": "string", "default": "bundle.lottie" }
      }
    }
  },

  // How to run it.
  "run": {
    "type": "node",                     // "node" | "python" | "shell" | "executable"
    "entry": "src/index.ts"             // resolved relative to the manifest directory
  }
}
```

`type: "shell"` plugins look like:

```jsonc
{
  ...,
  "run": {
    "type": "shell",
    "command": "ffmpeg",
    "args_template": ["-y", "-framerate", "{{fr}}", "-i", "{{frames_glob}}", "{{output}}"],
    "stdin": null,
    "stdout": "binary"
  }
}
```

`{{...}}` placeholders are bound at runtime from the input + params.

## Loader behavior

```ts
// lib/plugins/loader.ts
const ManifestSchema = z.object({ /* ...mirror of above... */ });

async function loadPlugins() {
  const manifestPaths = await glob([
    "plugins/*/plugin.json",
    `${os.homedir()}/.config/open-lottie-ui/plugins/*/plugin.json`,
  ]);
  const plugins = [];
  for (const p of manifestPaths) {
    const raw = JSON.parse(await fs.readFile(p, "utf8"));
    const parse = ManifestSchema.safeParse(raw);
    if (!parse.success) {
      log.warn(`plugin ${p} has invalid manifest`, parse.error);
      continue;
    }
    const probe = await probeRequires(parse.data.requires);
    plugins.push({ ...parse.data, dir: dirname(p), available: probe.ok, missing: probe.missing });
  }
  return plugins;
}
```

UI consumes `plugins` and renders surface buttons. Unavailable plugins render disabled with a tooltip listing missing requirements.

## Runner

```ts
// lib/plugins/runner.ts
export async function runPlugin(pluginId: string, input: PluginInput, params: unknown) {
  const plugin = registry.get(pluginId);
  validateInputAgainstIo(input, plugin.io.input);
  validateParams(params, plugin.io.params_schema);

  switch (plugin.run.type) {
    case "node":   return runNodeEntry(plugin, input, params);
    case "python": return runPythonEntry(plugin, input, params);
    case "shell":  return runShellTemplate(plugin, input, params);
    case "executable": return runBinary(plugin, input, params);
  }
}
```

- Inputs are streamed via stdin (for shell/executable) or passed as call args (for node/python entries we `import()` and call a default-export function).
- Outputs are captured by type: text → stdout string, binary → tmp file → returned as a Buffer.
- Cap memory + wall time per plugin run.

## First-party plugins shipped with the app

Manifest stubs live under `plugins/`. M1 implementations are hardcoded route handlers; the **Status** column tracks where each one is today.

| id | Surfaces | Input | Output | Status (2026-05-11) |
|---|---|---|---|---|
| `svg-import` | `library_action`, `import_drop` | `svg` | `lottie` | Shipped via `/api/import/svg` (uses python-lottie; gated by `enable_python_lottie`). |
| `dotlottie-pack` | `library_item_action`, `library_multi_action` | `lottie[]` | `dotlottie` | Shipped per-item via `/api/library/[id]/animation.lottie` (`@dotlottie/dotlottie-js`); multi-item batch is M2. |
| `lottie-validate` | `library_item_action`, `generation_action` | `lottie` | `report` | Shipped inline (ajv + `lottie-spec`) on generate + import. No dedicated button yet. |
| `lottie-optimize` | `library_item_action` | `lottie` | `lottie` | Shipped via `/api/library/[id]/optimize` (python-lottie; gated by `enable_python_lottie`). |
| `gif-export` / `mp4-export` (ffmpeg) | `library_item_action` | `lottie` | `gif`/`mp4` | Shipped together as MOV/WebM/GIF export via `/api/library/[id]/export/video` (gated by `enable_ffmpeg`). |
| `glaxnimate-roundtrip` | `library_item_action` | `lottie` | `lottie` | Shipped via `/api/library/[id]/glaxnimate` + `apps/admin/lib/glaxnimate.ts` save-back watcher (gated by `enable_glaxnimate`, on by default). |
| `dotlottie-render` (dotlottie-rs CLI) | `library_item_action`, `generation_action` | `lottie` | `png` | Deferred — `dotlottie-rs` doesn't ship a CLI binary today (see `inventory/cli-tools.md`). |
| `python-lottie-helpers` | `library_item_action` | `lottie` | `lottie` | Folded into `svg-import` + `lottie-optimize` above. |
| `url-scrape-import` | `import_drop` | `url` | `lottie` | Shipped via `/api/import/url/*` (gated by `enable_url_scrape`, default OFF). |
| `video-import` (ffmpeg) | `import_drop` | `video` | `lottie` | Shipped via `/api/import/video` (gated by `enable_ffmpeg`). |

## Surfaces (where buttons appear)

| Surface | Pages it appears on | Selection |
|---|---|---|
| `library_item_action` | `/library/[id]` | single item |
| `library_multi_action` | `/library` (with selection toolbar) | many items |
| `generation_action` | `/review/[id]` | single generation |
| `import_drop` | drag-drop overlay | per dropped file |
| `prompt_action` | `/generate` | none — user-initiated |

## Security model

- Plugins are local code from the user's machine. We don't pretend to sandbox malicious code.
- We *do*:
  - Refuse to load plugins from URLs.
  - Validate manifests strictly (zod) and refuse on bad schemas.
  - Limit wall-clock and memory.
  - Never pass network URLs or secrets into plugin invocation unless the plugin manifest declares it needs them (a `secrets` field — explicitly user-granted).
- Documented in the README: "treat plugins like the binaries they invoke — install them deliberately."

## Sources

- Patterns inspired by VS Code extensions, Penpot plugins, Obsidian community plugins.
