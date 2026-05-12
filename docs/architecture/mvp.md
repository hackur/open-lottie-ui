# MVP scope (M1 — week 1)

The minimum to prove "human-in-the-loop, Claude-driven Lottie generation, in a local Next.js app, is real."

> **Status (2026-05-11):** M1 is substantially shipped. Items struck through below are live. The remaining work (Tier-2 Python scripts, real plugin loader) is M2.

## The user story we're solving

> "I open the admin, see my existing animations, type a prompt, watch Claude generate a new one, compare it side-by-side with whatever I had, approve it with a keystroke, and export it."

## Concrete features in scope

1. ~~**Project scaffold**~~ — done. `apps/admin/`, `packages/lottie-tools/`, `packages/claude-driver/`, pnpm workspace.

2. ~~**Library scan + grid**~~ — done. `packages/lottie-tools/src/data/library.ts` scans `library/`; `/library` renders a paginated grid (`library-grid.tsx`) with filter + sort + source.

3. ~~**Library item detail**~~ — done. `/library/[id]` plays via `lottie-player.tsx`, with tag/license editors, duplicate, optimize, glaxnimate-edit, and export buttons.

4. ~~**Thumbnail generation**~~ — done. `apps/admin/lib/thumbnail.ts` does lottie-web → SVG → `@resvg/resvg-js` → PNG, cached under `.cache/thumbs/`. No puppeteer fallback shipped (none has been needed).

5. ~~**Validator**~~ — done. `packages/lottie-tools/src/validator/` with vendored `lottie-spec` schema + ajv.

6. **Claude driver** — Tier 3 (raw JSON) shipped via `packages/claude-driver/src/generate.ts` + `apps/admin/lib/generation.ts` (repair loop, transcript diagnosis). Tier 1 templates shipped (parameter substitution, no model call). Tier 2 (Python script) **deferred to M2.**

7. ~~**SSE streaming**~~ — done. `/api/generate/[id]/stream/route.ts`, registry in `packages/claude-driver/src/registry.ts`.

8. ~~**Generate form**~~ — done. `/generate` with tier selector + template params or freeform prompt.

9. ~~**Review queue + detail**~~ — done. `/review` and `/review/[id]` with side-by-side + approve/reject + keyboard shortcuts in `review-client.tsx`.

10. ~~**Approve flow**~~ — done. `promote.ts` copies `generations/{id}/final.json` to `library/{newId}/`, writes meta, appends decisions.

11. ~~**Reject flow**~~ — done. Decision logged with `kind` classification (`rate_limited` / `tool_narration` / `empty` / `no_tag` for driver failures).

12. ~~**Export**~~ — done. `/api/library/[id]/animation.lottie` packs via `@dotlottie/dotlottie-js`; `.json` also available; video export (MOV/WebM/GIF) via `/api/library/[id]/export/video` (flag-gated).

13. ~~**Settings**~~ — done. `/settings` shows feature flags, default model/tier/renderer, tool detection (claude/ffmpeg/python3/inlottie/glaxnimate, cached 60s).

## What we explicitly defer (still deferred after M1)

- Plugin loader (manifest-driven) — actions remain hardcoded in route handlers per ADR-008. M2.
- Visual diff (heatmap) — `visual-diff.tsx` exists for two-frame compare; full heatmap deferred. M2.
- Remix workflow as a first-class flow — partial via "edit prompt and retry" + Tier-1 duplicate. M2.
- Variant batching — single generation per submit. M2.
- External source plugins (LottieFiles browse, etc.) — URL-paste import shipped (flag-gated); browse is M3.
- Tier 2 (Python script generation tier). M2.

## What landed beyond the original MVP

- **Import surfaces:** SVG import, URL paste, URL scan, video import (all flag-gated).
- **Tag editor:** inline on library detail (`library-tag-editor.tsx`).
- **License editor + badge** on every library item.
- **Theming:** dark mode default; theme setting in `/settings`.
- **Glaxnimate edit-in-place** with save-back watcher (`apps/admin/lib/glaxnimate.ts`).
- **Activity log** at `/activity` (tails `decisions.jsonl`).
- **Debug surface** at `/debug` with server snapshot and error log.
- **First-run welcome ack** at `/welcome`.

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
