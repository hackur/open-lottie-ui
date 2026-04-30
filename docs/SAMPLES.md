# Sample data

`scripts/seed-samples.py` populates the local dev server with realistic data
exercising every M1 feature. Run it once after `pnpm dev` to get a fully-loaded
demo.

```
pnpm dev                     # one terminal
python3 scripts/seed-samples.py     # another
```

The script is safe to re-run — it always creates fresh generations rather than
overwriting existing ones.

## What gets created

### Tier-1 generations (11)

One per shipped template, with sensible defaults:

| Template | Status after seed |
|---|---|
| `color-pulse` | approved → library |
| `fade-in` | approved → library |
| `scale-bounce` | approved → library |
| `draw-on-path` | approved → library |
| `slide-in` | approved → library |
| `rotate-spin` | approved → library |
| `shake` | approved → library |
| `heartbeat` | approved → library |
| `confetti-burst` | rejected (codes: `wrong-color`, `looks-broken`) |
| `typing-dots` | left in `pending-review` |
| `progress-bar` | left in `pending-review` |

### Remix (1)

A `color-pulse` library entry → fresh red/red Tier-1 with `base_id` set.
Mounts the visual diff strip on `/review/<id>`.

### Imports (3)

- **SVG**: a hand-rolled red star → `/api/import/svg` → generation.
  Requires `enable_python_lottie` flag on (off by default — opt in via /settings).
- **Video**: 1-second `testsrc` GIF (10 frames) → `/api/import/video` → generation
  with 10 image-asset layers. Requires `enable_ffmpeg`.
- **URL scrape**: self-fetch of `/api/library/loader-pulse/animation.json` →
  promotes to library with `source: "import"`. Requires `enable_url_scrape`.

### Pre-exported video samples (3)

Saved in `samples/`:

- `<lib-id>.mov` — ProRes 4444, alpha channel, ~1 MB for a 2-second 200×200 clip
- `<lib-id>.webm` — VP9 with `yuva420p`, ~60 KB for the same clip
- `<lib-id>.gif` — palette-quantized, binary alpha, ~40 KB

Requires `enable_ffmpeg`.

### Post-seed state

After running you should see:

- `/library` — 8 seed entries + 8 approved generations + 1 from URL-scrape (= 17 cards)
- `/review` — 1 rejected, 2 pending, 1 remix (depending on flags)
- `/activity` — 30+ decision entries showing every action (created, validated, approve, reject, deleted_library, repair_started, …)
- `/settings` — same as before; flip a flag to expose the corresponding import / export feature.
- `samples/` — `*.mov`, `*.webm`, `*.gif` ready to drop into a CapCut / DaVinci timeline.

## Disabling / re-running

The script has a `--dry-run` flag that prints what it would do without
mutating anything:

```
python3 scripts/seed-samples.py --dry-run
```

To wipe and re-run cleanly:

```
rm -rf generations/* library/2026-* decisions.jsonl
python3 scripts/seed-samples.py
```

(`library/2026-*` only matches the script-created entries; seeds with
non-date ids are preserved.)

## Why this exists

- Manual smoke testing is tedious — this script is the canonical "did the
  whole stack just regress?" check.
- Demos / screenshots need realistic content. A single `loader-pulse` card
  doesn't show off the library.
- New contributors get a populated app on first run to navigate.

## Limitations

- Tier-3 (Claude) generations aren't seeded — they cost money and require
  the user's `claude` OAuth.  The script focuses on Tier-1 (deterministic).
- Visual diff renders sample frames lazily, so the first `/review/<remix>`
  page load takes ~1 second.
- All external-tool features (SVG / video / URL) require the corresponding
  flag to be enabled in `/settings` first.  The script gracefully skips
  steps whose flag is off.
