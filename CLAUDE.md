# CLAUDE.md

Project memory for Claude Code sessions. Read this first.

## What this project is

`open-lottie-ui` — a local-first Next.js admin for browsing, generating, remixing, and exporting Lottie animations. Claude CLI is the LLM driver; humans approve every change.

Currently in **M0 (research & planning)**. No application code yet. All design lives under `docs/`.

## Where to look

- **Read first:** `README.md`, `docs/00-vision.md`, `docs/SUMMARY.md`.
- **Architecture:** `docs/architecture/system.md` (data flow), `docs/architecture/data-model.md` (on-disk layout), `docs/architecture/claude-integration.md` (how we drive the CLI).
- **MVP plan:** `docs/architecture/mvp.md`.
- **Decisions made:** `docs/decisions/` (7 ADRs).
- **Risks:** `docs/research/17-risks.md`.

## Conventions in this repo

- Markdown docs live under `docs/` only. Source code (when it lands) lives under `apps/` and `packages/`.
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

- Don't write the Next.js app yet — wait for the brainstorm with the user (open questions in `docs/SUMMARY.md` and `docs/brainstorm.md`).
- Don't start vendoring the LottieFiles asset library — license forbids bulk-mirroring.
- Don't add API-key dependencies for the LLM driver — Claude CLI uses OAuth; that's intentional (ADR-003).
- Don't add a database in v1 — file-system is canonical (ADR-002).

## When in doubt

Ask the user before adding new top-level dependencies, new product surfaces, or anything that overlaps with an open ADR question.
