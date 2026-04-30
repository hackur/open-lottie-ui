# Changelog

All notable changes to this project. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semver from 0.1.0 onward.

## [Unreleased] — M1 (in progress)

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
