# Feature list — MVP vs later

Features are bucketed M1 (week-1 MVP), M2 (~month 1), M3 (~quarter 1), and Later. The MVP cut is the test of "is this project alive?" — everything else can slip without killing it.

## M1 — MVP (week 1)

**Goal**: a single user can browse a local library, generate a new animation from a prompt, review it side-by-side, approve or reject.

- [ ] **Local library scan**: point at a directory; recursively load `.json` and `.lottie`; thumbnail per item.
- [ ] **Library grid view** with search and tag filter.
- [ ] **Item detail view**: full lottie-web preview with play/pause/scrub, JSON view, metadata.
- [ ] **Prompt-driven generation** (Tier 1 templates + Tier 3 raw JSON):
  - [ ] Prompt form with model + tier selector (advanced drawer).
  - [ ] Server action spawns Claude CLI with stream-json output.
  - [ ] Live token stream surfaced in UI via SSE.
  - [ ] Output validated against `lottie-spec` JSON Schema.
  - [ ] Auto-render thumbnail of generated file.
- [ ] **Review queue** at `/review`: list of pending generations.
- [ ] **Side-by-side review** at `/review/{id}`: original (or blank) on the left, generation on the right; synced scrub.
- [ ] **Approve / reject** with reason codes; appended to `decisions.jsonl`.
- [ ] **Approved → library**: file copied into `library/` with metadata sidecar.
- [ ] **Export to `.lottie`** button on any library item, using `dotlottie-js`.
- [ ] **Settings**: detect installed CLI tools (claude, ffmpeg, glaxnimate, …), show install hints.

Out-of-scope explicitly:

- ~~Plugin system~~ (M2)
- ~~Visual diff~~ (M2)
- ~~Remix workflow~~ (M2 — manual remix via "edit prompt and retry" is fine for M1)
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

- [ ] **More plugins**:
  - `glaxnimate-roundtrip` (open in Glaxnimate, watch on save, re-import).
  - `lottie-optimize` (configurable optimization passes).
  - `gif-export`, `mp4-export` (via ffmpeg).
  - `dotlottie-render` (use the Rust CLI for fast rendering).
  - `python-lottie-helpers` (draw-on / IK presets).
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
