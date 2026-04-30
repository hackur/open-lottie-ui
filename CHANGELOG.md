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

### Smoke-tested

- `pnpm install` + `pnpm dev` boots in <1.5s; all 6 main routes return 200.
- Tier-1 generation (`color-pulse`, default params) → renders valid Lottie → passes validation → approve promotes to library and appends to `decisions.jsonl`.
- `.lottie` download produces a 768-byte ZIP with `manifest.json` + `a/<id>.json`.

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
