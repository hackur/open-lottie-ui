# MVP scope (M1 — week 1)

The minimum to prove "human-in-the-loop, Claude-driven Lottie generation, in a local Next.js app, is real."

## The user story we're solving

> "I open the admin, see my existing animations, type a prompt, watch Claude generate a new one, compare it side-by-side with whatever I had, approve it with a keystroke, and export it."

## Concrete features in scope

1. **Project scaffold**
   - `pnpm create next-app` (App Router, TS, Tailwind).
   - `shadcn-ui init` and add `button`, `card`, `dialog`, `input`, `textarea`, `select`, `command`, `toast`, `sonner`, `tabs`, `tooltip`, `resizable`, `scroll-area`, `skeleton`, `dropdown-menu`.
   - Workspace layout: `apps/admin/`, `packages/lottie-tools/`, `packages/claude-driver/`.
   - `pnpm-workspace.yaml`, root scripts (`dev`, `build`, `lint`, `test`).

2. **Library scan + grid**
   - `lib/store/library.ts` — scan `library/`, parse `meta.json`s, compute `intrinsic` from animation data.
   - `/library` page — TanStack Table with thumbnails, name, fr/op, tags.
   - Search box, tag filter (single tag), source filter.
   - Click → detail.

3. **Library item detail**
   - `/library/[id]` — lottie-react preview with play/pause/scrub.
   - Sidebar: meta, license badge, "open in editor" → finder, "export to .lottie".

4. **Thumbnail generation**
   - On import / first view, render frame 0 via lottie-web → SVG → resvg → PNG.
   - Cache under `.cache/thumbs/{contentHash}.png`.
   - Fallback to puppeteer-lottie if SVG render fails (image layers).

5. **Validator**
   - `lib/lottie/validate.ts` with vendored `lottie-spec` schema + ajv.
   - Used at import (block invalid) and after Claude returns (gate review).

6. **Claude driver (single-process, single-tier first)**
   - `packages/claude-driver/` exports `generate()` per `claude-integration.md`.
   - v1 supports **Tier 3 (raw JSON) only** to start, with the repair loop. We add Tier 1 templates as we have time in week 1; if not, M2.
   - System prompt vendored as `prompts/system/default.md`.

7. **SSE streaming**
   - `app/api/stream/[id]/route.ts` per `research/12-process-management.md`.
   - Process registry in `globalThis`.

8. **Generate form**
   - `/generate` page — textarea + submit.
   - Submit → server action → spawn child → return `{ id }` → client navigates to `/review/{id}`.

9. **Review queue + detail**
   - `/review` lists generations with `status === "pending-review"`.
   - `/review/[id]` shows side-by-side: blank/base on left, generation on right; synced scrub. Buttons: Approve / Reject (with reason codes). Keyboard: a / r / j / k / space.

10. **Approve flow**
    - On approve: copy `generations/{id}/final.json` to `library/{newId}/animation.json`, write `meta.json`, update thumbnail, append `decisions.jsonl`.

11. **Reject flow**
    - On reject: just log decision; generation stays archived under `generations/{id}/` with `status === "rejected"`.

12. **Export**
    - "Export to .lottie" button uses `@lottiefiles/dotlottie-js` to pack a single animation. Single-file download.

13. **Settings**
    - `/settings` — tool detection (claude, ffmpeg, glaxnimate), version display, model selector, library path picker.

## What we explicitly defer

- Plugin system — for M1 the few plugins above are hardcoded.
- Visual diff (heatmap) — the human eye is enough for week 1.
- Remix workflow — partially covered by "edit prompt and retry" in the review screen.
- Variant batching — single generation per submit.
- External source plugins (LottieFiles browse, etc.) — drag-drop only.
- Tag editor — tags are manual JSON edit in v1.
- Theming.

## Success gate

| Test | Pass condition |
|---|---|
| Fresh checkout → first useful screen | ≤ 5 commands, ≤ 5 minutes |
| Scan a 50-file library, render thumbs | ≤ 60 s |
| Submit a templated prompt → reviewable preview | ≤ 30 s wall |
| Approve → file in library | < 2 s |
| Side-by-side scrub stays in sync | always |
| Cost per generation visible | always |
| Reject reason persists in `decisions.jsonl` | always |

## Demo script (proves it works)

1. Run `pnpm dev`. Open `http://localhost:3000`.
2. Library page shows 5 seed animations. Click one — preview plays.
3. Hit `/generate`. Type "pulsing teal loader, 60 frames, smooth ease in and out".
4. Watch the SSE stream of Claude's tokens.
5. Auto-redirect to `/review/{id}`. Side-by-side: blank on left, generated loader on right. Scrub.
6. Press `a` to approve. Toast "added to library."
7. `/library` now shows 6 items including the new loader.
8. Click it → "Export to .lottie" → file downloads. Open it in `dotlottie-web` to confirm.

If steps 1–8 all pass smoothly, M1 is done.
