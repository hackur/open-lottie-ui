# Feature list — MVP vs later

Features are bucketed M1 (week-1 MVP), M2 (~month 1), M3 (~quarter 1), and Later. The MVP cut is the test of "is this project alive?" — everything else can slip without killing it.

## M1 — MVP (week 1) — **shipped**

**Goal**: a single user can browse a local library, generate a new animation from a prompt, review it side-by-side, approve or reject.

- [x] **Local library scan**: `packages/lottie-tools/src/data/library.ts`; thumbnail per item lazily via `apps/admin/lib/thumbnail.ts`.
- [x] **Library grid view** with search, tag filter, source filter, sort, and pagination (`library-grid.tsx`).
- [x] **Item detail view**: lottie-web preview, tag/license editors, duplicate, optimize, export.
- [x] **Prompt-driven generation** (Tier 1 templates + Tier 3 raw JSON):
  - [x] Prompt form with model + tier selector.
  - [x] Server action spawns Claude CLI with stream-json output.
  - [x] Live token stream surfaced in UI via SSE (`/api/generate/[id]/stream`).
  - [x] Output validated against `lottie-spec` JSON Schema.
  - [x] Auto-render thumbnail of generated file.
- [x] **Review queue** at `/review`.
- [x] **Side-by-side review** at `/review/{id}` with synced scrub + keyboard shortcuts.
- [x] **Approve / reject** with reason codes; appended to `decisions.jsonl` (with `kind` classification on failures).
- [x] **Approved → library** via `data/promote.ts`.
- [x] **Export to `.lottie`** (and `.json`, and video via `/api/library/[id]/export/video`).
- [x] **Settings**: feature flags, default model/tier/renderer, tool detection.

Out-of-scope explicitly (still deferred):

- ~~Plugin loader~~ (M2; actions are hardcoded in route handlers)
- ~~Visual diff heatmap~~ (M2; `visual-diff.tsx` exists for two-frame compare only)
- ~~Remix workflow as a first-class flow~~ (M2)
- ~~Variant batch generation~~ (M2)
- ~~Multi-user~~ (Later)

## M2 — Plugins, diff, remix (~month 1)

- [ ] **Plugin manifest format** (`plugin.json`).
- [ ] **Plugin loader** discovers `plugins/*/plugin.json`; surfaces buttons in detail view.
- [ ] **2 first-party plugins**:
  - `svg-import` (drop an SVG → scaffold Lottie).
  - `dotlottie-pack` (bundle multiple selected items as one `.lottie`).
- [ ] **Visual diff** in review (heatmap toggle).
- [ ] **Remix workflow**: pick library item → describe change → generate → diff → approve.
- [ ] **Variant batch**: "give me N variants of this prompt"; review screen shows them all in a strip.
- [ ] **Frame thumbnails carousel** in library detail.
- [ ] **Tag editor** (rename, merge, color).

## M3 — Power-user features (~quarter 1)

- [x] **`glaxnimate-roundtrip` pulled forward** — shipped in M1 behind `enable_glaxnimate` (`apps/admin/lib/glaxnimate.ts` save-back watcher).
- [x] **`lottie-optimize` pulled forward** — shipped in M1 behind `enable_python_lottie` (`/api/library/[id]/optimize`).
- [x] **`gif-export` / `mp4-export` pulled forward** — shipped in M1 as a unified MOV/WebM/GIF export behind `enable_ffmpeg`.
- [ ] **`dotlottie-render`** — blocked: `dotlottie-rs` doesn't ship a CLI binary; track upstream.
- [ ] **`python-lottie-helpers`** (draw-on / IK presets beyond SVG import + optimize).
- [ ] **External source plugins** (browse-and-import for LottieFiles, Lordicon, useAnimations).
- [ ] **State machine editor** (visual, on top of dotLottie state machine spec).
- [ ] **Theme editor** (build LSS themes against a chosen animation).
- [ ] **Compatibility report**: lottie-web vs dotlottie-web rendering deltas.
- [ ] **CI integration**: a CLI subcommand that validates Lottie changes in a PR, posts a comment with diffs.

## Later

- Multi-user with auth & roles (Sam's CI need).
- Hosted "team" mode (server-deployable).
- Editing UI (property tweaking inline; today we lean on Glaxnimate for this).
- Video / AI-image source: "generate a logo, animate it."
- Desktop app packaging via Tauri.
- Cloud sync (BYO storage).
- Telemetry (opt-in only).

## What constitutes "MVP done"

| Criterion | Threshold |
|---|---|
| Scan a 50-file library | < 60 s including thumbs |
| Generate, validate, render a Tier-1 prompt | < 30 s wall |
| Approve a generation | 1 keystroke |
| Reject with reason | ≤ 3 keystrokes |
| Export selected to `.lottie` | < 5 s |
| Cold install → first useful screen | ≤ 5 commands, ≤ 5 minutes |

These are the numbers we use to call M1 done.
