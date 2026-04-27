# On-disk data model

All persistent state is files. The shape:

```
<project root>/
├── library/                              # canonical, approved animations
│   ├── 01-loader-spinner/
│   │   ├── animation.json                # the Lottie file
│   │   ├── animation.lottie              # optional packed form
│   │   ├── meta.json                     # title, source, license, tags, hash
│   │   └── thumb.png                     # cached thumbnail
│   ├── 02-success-burst/
│   │   └── ...
│   └── _index.json                       # optional aggregated index for fast listing
│
├── generations/                          # in-flight + reviewed generations
│   ├── 2026-04-27_a1b2c3/
│   │   ├── prompt.md                     # full prompt + system + params
│   │   ├── claude-stream.ndjson          # raw CLI output
│   │   ├── v1.json                       # first attempt
│   │   ├── v2.json                       # repair attempt (if any)
│   │   ├── final.json                    # the version we surfaced for review
│   │   ├── thumb.png
│   │   ├── frames/                       # sampled frames for visual diff
│   │   │   ├── 0.png
│   │   │   ├── 15.png
│   │   │   └── ...
│   │   └── meta.json                     # status, base_id, model, cost, validation
│   └── ...
│
├── decisions.jsonl                       # append-only audit log
│
├── prompts/                              # reusable prompts
│   ├── system/
│   │   ├── default.md
│   │   ├── full-schema.md
│   │   └── conservative.md
│   ├── few-shot/
│   │   └── *.json                        # (input, output) pairs
│   └── templates/                        # parameterized JSON templates (Tier 1)
│       ├── color-pulse.json
│       └── ...
│
├── plugins/                              # plugin packages (or symlinks)
│   ├── svg-import/
│   │   ├── plugin.json
│   │   └── src/index.ts (or bin script)
│   └── dotlottie-pack/
│       └── plugin.json
│
├── .cache/                               # disposable caches
│   ├── thumbs/
│   │   └── <contentHash>.png
│   ├── frames/
│   │   └── <contentHash>/<n>.png
│   ├── streams/
│   │   └── <id>.ndjson                   # large stream spillover
│   └── puppeteer/                        # browser cache
│
└── .config/
    └── settings.json                     # user prefs (theme, default model, paths)
```

## Schemas

### `library/<id>/meta.json`

```jsonc
{
  "id": "01-loader-spinner",              // matches directory name
  "title": "Loader Spinner",
  "tags": ["loader", "spinner", "ui"],
  "source": "seed",                       // "seed" | "lottiefiles" | "lordicon" | "useanimations" | "iconscout" | "generation" | "import" | ...
  "source_url": null,
  "license_id": "CC0-1.0",                // see packages/lottie-tools/licenses.json
  "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
  "attribution_required": false,
  "attribution_text": null,
  "imported_at": "2026-04-27T14:00:00Z",
  "imported_by": "local-user",
  "content_hash": "sha256:...",
  "intrinsic": {
    "fr": 30,
    "ip": 0,
    "op": 60,
    "w": 200,
    "h": 200,
    "layer_count": 3,
    "size_bytes": 4218
  },
  "from_generation": "2026-04-27_a1b2c3"  // null if imported, populated if it came from a generation
}
```

### `generations/<id>/meta.json`

```jsonc
{
  "id": "2026-04-27_a1b2c3",
  "status": "pending-review",             // "running" | "pending-review" | "approved" | "rejected" | "failed-validation" | "failed-render" | "cancelled"
  "base_id": null,                        // "<library id>" if this is a remix
  "prompt_summary": "Pulsing teal loader, 60 frames",
  "tier": 1,                              // 1 = template, 2 = python script, 3 = raw JSON
  "template_id": "color-pulse",           // null if not Tier 1
  "model": "claude-opus-4-7",
  "session_id": "...",                    // Claude CLI session id
  "started_at": "2026-04-27T14:21:11Z",
  "ended_at": "2026-04-27T14:21:23Z",
  "duration_ms": 12031,
  "cost_usd": 0.014,
  "num_turns": 1,
  "validation": { "ok": true, "errors": [] },
  "render": { "ok": true, "blank_frames": 0, "total_frames": 6 },
  "versions": [
    { "v": 1, "validated": false, "errors_count": 2 },
    { "v": 2, "validated": true, "errors_count": 0 }
  ],
  "final_version": 2
}
```

### `generations/<id>/prompt.md`

A markdown file that captures the full prompt for reproducibility:

```markdown
# Prompt — 2026-04-27_a1b2c3

**Tier**: 1 (template `color-pulse`)
**Model**: claude-opus-4-7
**Base**: (none)

## User text
> Pulsing teal loader, 60 frames

## System prompt (effective)
<system file="prompts/system/default.md">

## Template params
<inferred>
{
  "color_a": [0.13, 0.74, 0.91, 1],
  "color_b": [0.13, 0.74, 0.91, 0.2],
  "duration_frames": 60,
  "easing": "easeInOutSine"
}
</inferred>
```

### `decisions.jsonl`

One JSON object per line. Append-only. Never edited.

```jsonl
{"ts":"2026-04-27T14:21:23Z","gen":"2026-04-27_a1b2c3","action":"created","model":"claude-opus-4-7","cost_usd":0.014}
{"ts":"2026-04-27T14:21:24Z","gen":"2026-04-27_a1b2c3","action":"validated","ok":true}
{"ts":"2026-04-27T14:21:26Z","gen":"2026-04-27_a1b2c3","action":"rendered","frames":6,"duration_ms":1820}
{"ts":"2026-04-27T14:22:01Z","gen":"2026-04-27_a1b2c3","action":"approve","by":"local-user"}
{"ts":"2026-04-27T14:22:01Z","gen":"2026-04-27_a1b2c3","action":"committed","library_id":"03-pulsing-teal-loader"}
{"ts":"2026-04-27T14:23:14Z","gen":"2026-04-27_d4e5f6","action":"reject","by":"local-user","codes":["too-fast","wrong-color"],"note":"slow it 2x and use brand teal"}
```

### `plugins/<id>/plugin.json`

See `plugins.md` for the full schema.

### `.config/settings.json`

```jsonc
{
  "default_model": "claude-opus-4-7",
  "default_tier": 1,
  "max_repair_attempts": 3,
  "concurrent_generations": 3,
  "library_path": "./library",
  "puppeteer_pool_size": 2,
  "tool_paths": { /* overrides for which() lookups */ },
  "theme": "system"
}
```

## Read paths

- **List library**: `glob library/*/meta.json`, parse each. Cache in memory; invalidate via chokidar.
- **Show item**: read `library/{id}/animation.json` + `meta.json` + `thumb.png`.
- **Show generation review**: read `generations/{id}/final.json` + base library item if `base_id`.
- **Recent decisions**: tail `decisions.jsonl` (last N lines).

## Write paths

- All writes go through `lib/store/`. Helpers:
  - `writeFileAtomic(path, data)` — write to tmp then rename.
  - `appendJsonl(path, obj)` — open-append-close.
  - `commitGenerationToLibrary(genId, opts)` — copies generation files into a new `library/<id>/`.
- No two writers contend (single-process app); no locking needed.

## Git friendliness

- The default `.gitignore` excludes `library/`, `generations/`, `.cache/` because users may have private/proprietary content.
- Teams that *want* git-tracked libraries simply remove those lines and commit. The format is human-diffable for `meta.json` and decisions; raw `animation.json` will be a noisy diff (Lottie JSON) — that's a known tradeoff.

## Migration / versioning

- Every meta file has an implicit `meta_version: 1`. Loader rejects unknown versions.
- Adding a field is non-breaking. Renaming requires a migrate script in `scripts/migrations/`.
