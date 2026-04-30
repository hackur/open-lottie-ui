# Changelog

All notable changes to this project. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semver from 0.1.0 onward.

## [Unreleased] — M1 polish round 3 (current)

### Added

- **Feature flags** (`apps/admin/lib/feature-flags.ts`): 5 toggles for external tools (`enable_inlottie`, `enable_glaxnimate`, `enable_python_lottie`, `enable_ffmpeg`, `enable_url_scrape`) all default OFF. M1 ships only the web UI + Tier-1 templates + Tier-3 Claude as the baseline; opt in to external tools from /settings → Features. APIs return 503 when the gating flag is off.
- **Sample seeder** (`scripts/seed-samples.py`) — populates the dev server with 11 Tier-1 generations across all templates, a remix for visual diff, an SVG/video/URL import (per flags), pre-exported MOV/WebM/GIF samples. See `docs/SAMPLES.md`.
- **Workflow docs**: `docs/workflows/lottie-to-video.md` (279 lines, 7 ffmpeg invocations, 23 sources) and `docs/workflows/video-to-lottie.md` (306 lines, 4 ffmpeg invocations, 20 sources). Honest framing of the raster/vector tradeoff for video → Lottie.
- **Lottie → transparent video export** (`/api/library/[id]/export/video?format=mov-prores|webm-vp9|gif`) — alpha-channel ProRes 4444 / VP9 yuva420p / GIF via ffmpeg + a pure-JS fallback rasterizer. Cached. Gated by `enable_ffmpeg`.
- **Video / GIF / WebP → Lottie import** (`/api/import/video`) — ffmpeg extracts frames, embeds each as a base64 image asset (`ty: 2` layer). Honest UI warning that this is a raster slideshow, not vector. Gated by `enable_ffmpeg`.
- **URL scrape import** (`/api/import/url/scan` + `fetch`) — paste a URL, server walks HTML for Lottie refs (`<lottie-player>`, `<dotlottie-player>`, anchor links, data-attrs, `loadAnimation()`, inline `<script>`), validates, presents a picker. Per-asset license picker (defaults to `unknown`). Gated by `enable_url_scrape`.
- **Glaxnimate edit-in plugin** (`/api/library/[id]/glaxnimate`) — spawns Glaxnimate detached, watches for save-back, creates a generation when the file changes. Gated by `enable_glaxnimate`.
- **python-lottie plugins** — SVG → Lottie import (`/api/import/svg`) and library optimize (`/api/library/[id]/optimize`). AGPL-3.0 boundary preserved by spawning subprocesses. Gated by `enable_python_lottie`.
- **Visual diff** for remix generations — pixelmatch over inlottie OR pure-JS fallback rasterizer. Verified non-zero diff on red→blue test (27.7% peak). Gated only when both renderers off.
- **Live Tier-1 preview** on `/generate` — split-pane: params left, render right. POST `/api/templates/[id]/render` (300ms debounce). Submit button labeled "Save to review queue".
- **Tier-3 hardening**: silence watchdog (60s default — kills hung claude); tool_use events surface in the live stream; multi-strategy Lottie extraction (`<lottie-json>` → ```json fences → JSON heuristic); graceful kill (SIGTERM + 5s grace + SIGKILL).
- **Repair loop**: on validation failure, re-asks Claude with `<validator-errors>` and writes v2.json. Configurable max_repair_attempts.
- **Debug visibility**: `/api/debug` snapshot endpoint, `/__debug` page, server-side error ring buffer, error.tsx boundaries on every page, loading.tsx skeletons, per-event `events.ndjson` written per generation.
- **11 Tier-1 templates** (was 5): + rotate-spin, shake, heartbeat, confetti-burst, typing-dots, progress-bar.
- **8 seed library entries** (was 3): + heart-beat, success-burst, typing-dots, error-shake, progress-bar.
- **8 few-shot examples** for the LLM (`prompts/few-shot/*.json`), all validated.
- **25 categorized starter prompts** (was 8 flat).
- **`prompts/system/full-schema.md`** — comprehensive Bodymovin reference (~683 lines), 6 worked examples, easing tangent presets.
- **`.claude/`** project resources: 14 vendored Lottie spec docs (`docs/lottie/`), `skills/lottie-authoring/`, `agents/lottie-author.md`, `commands/{new-template,seed-from-prompt}.md`.
- `/welcome` first-run page + dismissable flag.
- `/activity` decisions viewer with action filters.
- `/healthz` ops endpoint.
- **Settings**: editable form persisting to `.config/settings.json`. Plugin manifest registry surfaces all 8 stubs with status badges. Cost summary tile.
- **Library**: search input + tag-chip filter (URL-synced). Renderer toggle (lottie-web ↔ dotlottie-web) on detail. Lazy-load thumbs with hover-to-live-player. Tag editor + license editor + duplicate + bulk select. Delete blocks seeds.
- **Review**: live transcript with auto-scroll + tool_use surfacing. Edit-and-retry. Cancel. Delete for terminal generations. Reject reason codes + free-text note.
- **Decisions log** writes for every action (created/validated/approve/reject/committed/cancelled/deleted_*/repair_started/etc).

### Fixed

- **Hydration warning** caused by browser extensions injecting `cz-shortcut-listen` etc — added `suppressHydrationWarning` on `<html>` and `<body>`.
- **Registry duplicate-event race** — subscribers used to receive each event twice (buffer replay + per-subscriber queue). Replaced with cursor-only buffer access.
- **Claude exploring the project** — was running with `cwd = repo root`, which leaked CLAUDE.md / docs / package.json visibility. Now runs in an empty `mkdtempSync()`. System prompt also explicitly forbids tool use.
- **inlottie GUI hang** — every `--version` / `--help` invocation popped a femtovg window. detect-tools now uses file-existence check for known-GUI binaries (`fileOnly: true` + `whichSync()` fallback).
- **Sharp / dotlottie webpack warnings** silenced via `serverExternalPackages` + `webpack.externals` for `@img/sharp-libvips-*`, `@img/sharp-wasm32`.
- **`@lottiefiles/dotlottie-js` → `@dotlottie/dotlottie-js`** package rename. The original API guess was wrong (fluent setters); rewritten to the v1.6 options-in-constructor API.
- **`model: model as never`** sloppy cast removed by widening driver's `GenerateOptions.model` to `(string & {})`.
- **next.config.ts webpack types** — replaced `import type { Configuration } from "webpack"` (not a project dep) with a structural shape.
- **6 ESLint warnings** cleaned. Lint exits 0.
- **Duplicate `useEffect` deps comment** removed from settings-form.tsx.
- **Hash mismatch on seed verify**: my Python check was wrong (default `ensure_ascii=True` escapes non-ASCII; Node's `JSON.stringify` doesn't). Verified all 8 seed hashes are correct via `node scripts/seed-hash.ts`.
- **`car-driving.json` misplaced** in `prompts/templates/` (raw Lottie, not a template wrapper). Rescued into `library/car-driving/` with proper meta; deleted from templates.
- **Form's "Not Found" error** during dev-server reload — non-JSON server response now surfaces a useful message instead of `Unexpected token N`.

### Decided

- ADR-008 — M1 defaults committed without the brainstorm: Tier 1 templates + Tier 3 Claude in M1, in-repo seeds, `.lottie` canonical export, no variants in M1, hardcoded plugins for M1 (manifest format real, loader is M2).

### Verified

- 27/27 unit tests pass.
- Typecheck clean across all 3 packages.
- 0 ESLint errors / 0 warnings.
- 14+ HTTP routes return 200 (or 307/404 as appropriate).
- Lottie → MOV exports as `yuva444p12le` (verified via ffprobe).
- Tier-1 generation E2E for all 11 templates: render → validate → review → approve → library promotion → decisions.jsonl entry.

### Blocked / not done

- **animatedicons.co bulk import** — license verification (`docs/inventory/animatedicons-license.md`) found two clauses in their EULA that forbid automated download and redistribution despite the "no attribution required" wording. Not proceeding without express consent.
- **inlottie headless rendering** — bundled v0.1.9-g is GUI-only on macOS. Server-side rasterization defers to the pure-JS fallback (handles ellipse/rect+fill subset) until a headless build appears or we wire `canvaskit-wasm`.

## [Unreleased] — M1 (initial)

### Added

- pnpm workspace with `apps/admin` (Next.js 15) + `packages/{lottie-tools,claude-driver}`.
- `packages/lottie-tools`:
  - `data/` — readers/writers for `library/`, `generations/`, `decisions.jsonl`; atomic writes; promote-to-library.
  - `validator/` — ajv against a vendored pragmatic lottie-spec subset; smoke check + full validate.
  - `hash/` — content-hash (SHA-256 over canonicalized JSON) + intrinsics extractor.
  - `templates/` — Tier-1 engine (load + param validation + placeholder substitution).
  - 5 Tier-1 templates filled in: `color-pulse`, `fade-in`, `scale-bounce`, `draw-on-path`, `slide-in`.
  - `pack/` — `.lottie` ZIP packer + unpacker via `@dotlottie/dotlottie-js`.
  - `plugins/` — hardcoded M1 registry (`lottie-validate`, `dotlottie-pack`).
- `packages/claude-driver`:
  - `claude --print --output-format stream-json …` spawner with line buffering.
  - Typed `DriverEvent` union (init, text, tool_use, result, error, raw).
  - `globalThis`-pinned `processRegistry` survives Next HMR; multi-consumer event replay.
- `apps/admin`:
  - Tailwind v4 + custom dark theme + sidebar/topbar shell.
  - `/library` grid + `/library/[id]` detail with side-by-side metadata, license badge, .json + .lottie download.
  - `/generate` with two tiers: Tier 1 (deterministic template render) and Tier 3 (Claude prompt streaming).
  - `/review` queue grouped by status + `/review/[id]` with synced side-by-side player, validation panel, approve/reject (a/r keyboard shortcuts), reject reason codes.
  - `/settings` showing paths, defaults, host capabilities, active plugins.
  - First-run wizard copies `seed-library/` into `library/` on empty start.
  - Lottie player component supports both `lottie-web` and `dotlottie-web`, with controlled-frame sync for review.
  - API routes: `/api/generate` (POST), `/api/generate/[id]/{stream,approve,reject}`, `/api/library/[id]/{animation.json,animation.lottie,preview}`.
- `seed-library/`: 2 new CC0 entries (`checkmark-success`, `spinner-arc`) alongside `loader-pulse`.
- `docs/decisions/ADR-008-m1-defaults.md` — committed defaults for the 5 Tier-1 brainstorm questions.
- Brainstorm doc updated with M1-defaults status header.

### Polish round (post-initial M1)

- **Routes:** `/welcome` (first-run dismissable), `/activity` (last 200 decisions table), `/import` (SVG import via python-lottie), `/healthz` (ops endpoint).
- **Library:** search input + frequency-sorted tag chips with URL sync; renderer toggle (lottie-web ↔ dotlottie-web) on detail page; tag click-through; danger-zone delete (blocks seeds); lazy-load thumbs with hover-to-live-player.
- **Review:** edit-and-retry button (recovers params/prompt from generation history); cancel button for in-progress generations; delete for terminal generations; live transcript pulse + auto-scroll; visual diff strip for remix generations.
- **Generate:** Tier-3 model selector (Opus 4.7 / Sonnet 4.6 / Haiku 4.5); robust non-JSON error handling for dev-server reload glitches; auto-fills from `?retry=<id>`.
- **Settings:** editable form (model, tier, renderer, export format, max repair attempts, concurrent generations, theme); persists to `.config/settings.json`; surfaces all 8 plugin manifests with status badges.
- **Plugins:**
  - Glaxnimate edit-in (`/api/library/[id]/glaxnimate`) — spawns Glaxnimate.app detached; globalThis-pinned save-back watcher creates a new generation when the file mtime changes.
  - python-lottie SVG import (`/api/import/svg`) and library optimization (`/api/library/[id]/optimize`) via separate-process subprocess calls (AGPL-3.0 boundary preserved).
  - Plugin manifest registry — reads all 8 `plugins/*/plugin.json` and surfaces them on /settings with `m1-enabled` / `m1-stub` / `m1-stub-needs-tool` status.
- **Generation pipeline:** Tier-3 captures session_id on the `init` event; one-shot repair loop on validation failure (resends `<validator-errors>` to Claude, writes v2.json, picks final by validity).
- **Quality:** ESLint flat config (0 errors / 0 warnings); 17 data-layer tests + 10 driver tests passing; sharp/libvips webpack warnings silenced; 27 unit tests pass.
- **Dev experience:** detect-tools resolves Glaxnimate via `/Applications/glaxnimate.app/Contents/MacOS/glaxnimate` macOS fallback; install hints for `inlottie` and `python-lottie`.
- **ADR-008:** committed defaults for the 5 Tier-1 brainstorm questions (Tier 1 + 3 in M1, in-repo seeds, .lottie canonical, no variants in M1, hardcoded plugins for M1).

### Smoke-tested

- `pnpm install` + `pnpm dev` boots in <1.5s; all 9 main routes return 200.
- Tier-1 generation E2E: pick template + params → render → review → approve → promote to library → decisions.jsonl entry.
- `.lottie` download produces a valid ZIP (PK signature, manifest.json + animations/<id>.json).
- All 5 Tier-1 templates render valid Lottie passing validation: color-pulse, fade-in, scale-bounce, draw-on-path, slide-in.
- Reject + delete + cancel flows confirmed.
- Glaxnimate launch + save-back watcher creates a new generation within 3s of file mtime change.

### Known limitations

- `inlottie` is a GUI-only viewer (femtovg backend) on macOS — server-side thumbnail generation via inlottie isn't usable. Library cards fall back to client-side lottie-web rendering, which is fine for M1-sized libraries. Server-side rasterization (`canvaskit-wasm` or puppeteer) is a future-work item.

## [Unreleased] — M0 research & planning

### Added

- Initial repo scaffold: README, MIT LICENSE, .gitignore, docs/ tree.
- Vision (`docs/00-vision.md`): problem, solution, success criteria, non-goals.
- 19 research notes covering Lottie format, players, dotLottie, conversions, programmatic generation, optimization, editors, Claude CLI, prompting, Next.js patterns, process management, HITL UX, headless rendering, visual diff, licenses, risks, prior art, community.
- Inventories: npm packages, CLI tools, asset sources.
- Architecture: personas, feature list, system diagram, data model, Claude integration design, plugin system, MVP scope, roadmap.
- Workflows: generate-and-approve, remix, import.
- Decisions: ADR-001 through ADR-007 (Next.js App Router, FS-as-DB, Claude CLI over SDK, lottie-web default preview, .lottie canonical export, no auth in v1, manifest-driven plugins).
- Concrete artifact stubs: system prompts (`prompts/system/`), template scaffolds (`prompts/templates/`), example plugin manifests (`plugins/`), license registry (`packages/lottie-tools/licenses.json`).
- Wireframes (`docs/wireframes.md`), glossary (`docs/glossary.md`), FAQ (`docs/faq.md`).
- Brainstorm prep (`docs/brainstorm.md`).
- `CLAUDE.md`, `CONTRIBUTING.md`, this `CHANGELOG.md`.

### Notes

- No application code yet. The Next.js scaffold begins at M1.
- License is MIT for application code. AGPL/GPL plugins are invoked as separate processes (see ADR-002 / `docs/research/16-licenses.md`).
