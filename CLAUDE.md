# CLAUDE.md

Project memory for Claude Code sessions. Read this first.

## What this project is

`open-lottie-ui` — a local-first Next.js admin for browsing, generating, remixing, and exporting Lottie animations. Claude CLI is the LLM driver; humans approve every change.

Currently in **M1 (admin runs locally)**. The Next.js app is in `apps/admin`, packages live under `packages/{lottie-tools,claude-driver}`. Run with `pnpm dev` → http://127.0.0.1:3000. M0 docs under `docs/` are still authoritative for design.

## Where to look

- **Read first:** `README.md` (Run it locally), `docs/00-vision.md`, `docs/SUMMARY.md`.
- **Architecture:** `docs/architecture/system.md` (data flow), `docs/architecture/data-model.md` (on-disk layout), `docs/architecture/claude-integration.md` (how we drive the CLI).
- **MVP plan:** `docs/architecture/mvp.md`.
- **Decisions made:** `docs/decisions/` (8 ADRs; ADR-008 covers the M1 defaults committed without the brainstorm).
- **Risks:** `docs/research/17-risks.md`.
- **App entry points:** `apps/admin/app/{library,generate,review,settings}/`. API routes under `apps/admin/app/api/`. Server-only data layer at `packages/lottie-tools/src/data/`. Claude driver at `packages/claude-driver/src/`.

## Conventions in this repo

- Markdown docs live under `docs/` only. Source code lives under `apps/` and `packages/`.
- ESM throughout. Use `.ts` in import paths (Node 22+ + Next 15 both support it).
- Tailwind v4 with CSS-variable theme tokens (see `apps/admin/app/globals.css`).
- File-system is the database (ADR-002). All writes go through `packages/lottie-tools/src/data/atomic.ts`.
- Server actions and API routes must `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
- ADRs are short (Context → Decision → Consequences → Status). Don't bloat them.
- Each commit is small and themed; the git log doubles as a research log.
- The default branch is `main`. No CI yet.
- License is MIT (see `LICENSE`); see `docs/research/16-licenses.md` before adding GPL/AGPL deps.

## How to add a new doc

1. Drop it in the right `docs/<bucket>/` directory.
2. Add a one-line entry in `docs/SUMMARY.md`.
3. Commit with `docs: <short summary>`.

## How to add a new ADR

1. Copy ADR-001 as a template.
2. Numbered next-available; e.g. `ADR-008-<slug>.md`.
3. Add to the table in `docs/decisions/README.md`.

## How to update an existing decision

Don't edit the existing ADR. Create a new ADR that supersedes it; mark the old one **Superseded by ADR-NNN** in its Status section.

## Tools the project assumes (when implementation lands)

Required for v1: Node ≥ 20, pnpm, the Claude CLI.
Recommended: ffmpeg, Headless Chrome (auto via puppeteer).
Optional plugins: dotlottie-rs CLI, glaxnimate, python (with bodymovin / lottie packages).

See `docs/inventory/cli-tools.md` for installation hints.

## What NOT to do

- Don't start vendoring the LottieFiles asset library — license forbids bulk-mirroring.
- Don't add API-key dependencies for the LLM driver — Claude CLI uses OAuth; that's intentional (ADR-003).
- Don't add a database — file-system is canonical (ADR-002).
- Don't bypass `data/atomic.ts` for writes; that's where atomic-write + jsonl-append live.
- Don't import `lottie-web` or `@lottiefiles/dotlottie-web` server-side — they're listed in `serverExternalPackages` and must be dynamic-imported on the client (see `components/lottie-player.tsx`).
- Don't reach for the real plugin loader yet — M1 ships a hardcoded registry per ADR-008. The manifest format (ADR-007) is real but the loader is M2.

## When in doubt

Ask the user before adding new top-level dependencies, new product surfaces, or anything that overlaps with an open ADR question.
