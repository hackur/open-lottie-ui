# Workflow — Import & catalog

How animations get into the library that didn't come from a Claude generation.

## Sources of imports

1. **Drag-drop from desktop** — `.json` or `.lottie`.
2. **File picker** — same.
3. **URL paste** — fetch the URL, MIME-check, import.
4. **External-source plugin** (M3) — LottieFiles browse, Lordicon browse, useAnimations browse.
5. **Folder bulk-import** — point at a directory; recurse; import all valid Lottie files.
6. **SVG → import** (via the `svg-import` plugin) — drop an SVG, get a scaffolded Lottie.

## Per-file import pipeline

```
1. Receive bytes (drag, picker, URL fetch, or read from disk)

2. Sniff format
   └─ Starts with PK\x03\x04? → ZIP → likely .lottie
       └─ Unzip to tmp; expect manifest.json + a/*.json
       └─ Per animation: extract; pipeline below treats each as a separate item
       └─ (Opt-in) preserve the original .lottie alongside in library/{id}/source.lottie
   └─ Starts with `{`? → JSON → parse → check for v + layers → looks like Lottie? → continue
   └─ <svg…/> → SVG → run `svg-import` plugin → get JSON → continue
   └─ Anything else → reject with toast

3. Validate
   └─ ajv against lottie-spec
   └─ If invalid → toast with errors; offer "import anyway" (advanced) for repair-on-edit later

4. Compute intrinsic metadata
   └─ fr, ip, op, w, h, layer_count, byte_size, content_hash (sha256)

5. Generate thumbnail
   └─ lottie-web SVG render → resvg → PNG (fast path)
   └─ Fallback puppeteer for files with image layers

6. Detect duplicates
   └─ Hash collision against library: same sha256 → "this looks like a duplicate of '<name>'. Import anyway?"

7. Capture license & source
   └─ If from a known source plugin: stamp license_id, source, source_url, attribution
   └─ If from drag-drop / URL: prompt user once, with a quick license picker (Unknown / MIT / CC0 / Lottie Simple / paid-asset / other-paste-url)
   └─ "Skip this question — I'll set later" is allowed; defaults license_id: "unknown"

8. Suggest tags (LLM-light)
   └─ Use a cheap model (haiku) to suggest 3–5 tags from the prompt-style description "loader, success, error, micro-interaction, hero, …"
   └─ Costs ~$0.0002 per file; opt-in toggle in settings (default ON)
   └─ User can edit / accept

9. Write to library
   └─ Choose id: slug of title or fallback to nanoid
   └─ library/{id}/animation.json
   └─ library/{id}/meta.json
   └─ library/{id}/thumb.png (move from tmp)
   └─ revalidatePath('/library')

10. Toast: "Imported 'X'. View →"
```

## Bulk import

Same per-file pipeline, run with concurrency = 4. Progress shown in a sticky bottom drawer:

```
Importing 38 of 50  •  Skipped 2 (invalid)  •  3 duplicates  •  ETA 14s
```

Pauses on first license-question collision; user picks "apply to all" to skip the rest.

## URL paste

```
Paste a URL → fetch (with timeout) → check MIME → if json or zip+dotlottie, run pipeline.
Source URL stored in meta.json. License stays "unknown" unless the URL is from a known source.
```

For LottieFiles URLs we can detect the pattern and pre-fill `license_id: "lottie-simple"` and `source_url`. Same for Lordicon / useAnimations.

## Folder watch (M2)

User can mark a folder as "watched." Chokidar listens; new `.json`/`.lottie` files appear → auto-import (with `source: "watched"` and license `"unknown"` if not in a known source folder).

Useful for designers exporting from Bodymovin into a folder the admin watches.

## Per-source plugin shape (M3)

```jsonc
// plugins/lottiefiles-browse/plugin.json
{
  ...,
  "surfaces": [{ "type": "import_browse", "label": "Browse LottieFiles", "icon": "search" }],
  "io": { "input": "none", "output": "lottie", "params_schema": {...} },
  "run": {
    "type": "node",
    "entry": "src/index.ts"
  },
  "metadata": {
    "default_source": "lottiefiles",
    "default_license_id": "lottie-simple"
  }
}
```

The plugin returns a stream of `lottie` items + per-item `meta_overrides`. The pipeline imports each as if user-uploaded but with the plugin's defaults pre-filled.

## Decisions log entries

```jsonl
{"ts":"...","action":"import","src":"drag","title":"hero-bounce","license":"CC0-1.0","tags":["hero","bounce"]}
{"ts":"...","action":"import_dup_skip","sha":"...","existing":"loader-spinner"}
{"ts":"...","action":"import","src":"plugin:lottiefiles-browse","title":"...","license":"lottie-simple"}
```

## What we *don't* do at import

- We do not modify the file (no auto-optimize). Optimization is a deliberate user action later.
- We do not bulk-overwrite tags from the LLM tagger; suggestions are just suggestions.
- We do not de-duplicate destructively — we always ask.
- We do not attempt to fetch attribution metadata from the source URL beyond what the plugin provides.
