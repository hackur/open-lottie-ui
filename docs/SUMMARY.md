# Documentation index

Index for `docs/`. The whole research → planning loop lives here. Read top to bottom for the full story; jump in via the "If you only read three" list at the bottom.

## Vision

- [`00-vision.md`](00-vision.md) — problem, proposed solution, success criteria, non-goals.

## Research notes

- [`research/01-lottie-format.md`](research/01-lottie-format.md) — Bodymovin JSON schema fundamentals.
- [`research/02-players.md`](research/02-players.md) — Lottie runtime libraries (lottie-web, dotlottie-web, Skottie, …).
- [`research/03-libraries.md`](research/03-libraries.md) — free animation libraries / marketplaces.
- [`research/04-dotlottie.md`](research/04-dotlottie.md) — `.lottie` container format (manifest, themes, state machines).
- [`research/05-conversions.md`](research/05-conversions.md) — SVG ↔ Lottie tooling.
- [`research/06-programmatic-generation.md`](research/06-programmatic-generation.md) — code-based generation (python-lottie, bodymovin-python).
- [`research/07-optimize-validate.md`](research/07-optimize-validate.md) — optimization, linting, validation.
- [`research/08-editors.md`](research/08-editors.md) — open-source editors (Glaxnimate).
- [`research/09-claude-cli.md`](research/09-claude-cli.md) — Claude CLI invocation & stream-json.
- [`research/10-prompting-lottie.md`](research/10-prompting-lottie.md) — three-tier prompting strategy.
- [`research/11-nextjs-admin.md`](research/11-nextjs-admin.md) — Next.js 15 patterns for local admin tools.
- [`research/12-process-management.md`](research/12-process-management.md) — long-lived child processes from Next.
- [`research/13-hitl-ux.md`](research/13-hitl-ux.md) — human-in-the-loop approval UX.
- [`research/14-headless-render.md`](research/14-headless-render.md) — headless rendering for thumbnails.
- [`research/15-visual-diff.md`](research/15-visual-diff.md) — visual diffing for animations.
- [`research/16-licenses.md`](research/16-licenses.md) — license compatibility (MIT-vs-AGPL/GPL plugins).
- [`research/17-risks.md`](research/17-risks.md) — open risks & how we de-risk.
- [`research/18-prior-art.md`](research/18-prior-art.md) — Lottielab, Jitter, Rive, Haiku, etc.
- [`research/19-community.md`](research/19-community.md) — orgs, hubs, conformance suite.

## Inventory

- [`inventory/npm-packages.md`](inventory/npm-packages.md) — candidate npm dependencies with licenses.
- [`inventory/cli-tools.md`](inventory/cli-tools.md) — non-npm CLIs (claude, ffmpeg, glaxnimate, …).
- [`inventory/asset-sources.md`](inventory/asset-sources.md) — free / open Lottie sources.

## Architecture

- [`architecture/personas.md`](architecture/personas.md) — Devon, Mira, Sam, Aria.
- [`architecture/features.md`](architecture/features.md) — feature list (M1 → Later).
- [`architecture/system.md`](architecture/system.md) — system diagram & data flow.
- [`architecture/data-model.md`](architecture/data-model.md) — on-disk data model.
- [`architecture/claude-integration.md`](architecture/claude-integration.md) — Claude CLI integration design.
- [`architecture/plugins.md`](architecture/plugins.md) — plugin/extension system.
- [`architecture/mvp.md`](architecture/mvp.md) — MVP scope.
- [`architecture/roadmap.md`](architecture/roadmap.md) — milestones M0 → M5.

## Workflows

- [`workflows/generate-approve.md`](workflows/generate-approve.md) — generate-and-approve cycle.
- [`workflows/remix.md`](workflows/remix.md) — remix existing animation.
- [`workflows/import.md`](workflows/import.md) — import & catalog.

## Decisions (ADRs)

- [`decisions/`](decisions/README.md) — index of architecture decisions.

---

## If you only read three

1. [`00-vision.md`](00-vision.md) — what we're building and why.
2. [`architecture/mvp.md`](architecture/mvp.md) — what week-1 looks like concretely.
3. [`architecture/system.md`](architecture/system.md) — the system diagram.

## Top open questions to bring to the brainstorming session

(Pulled from `research/17-risks.md` and design choices needing the user's input.)

1. **Claude reliability for raw Lottie JSON.** Are we OK starting with Tier 3 only and falling back to templates if it doesn't work, or do we want to invest in templates *first* before any LLM call lands?
2. **Single-user vs team.** v1 is single-user / localhost. Confirm the "Sam → CI integration" persona is M3+, not earlier.
3. **Bundled seed library.** Are we OK shipping ~5–10 small CC0/MIT animations in the repo for first-run experience, or do we want a separate `seed-library` repo?
4. **Plugin manifest format.** Is the v1 manifest in `architecture/plugins.md` flexible enough? Anything missing for the user's intended community-tool integrations?
5. **`.lottie` vs `.json` default export.** ADR-005 says `.lottie`. Confirm or flip.

---

*Last updated: 2026-04-27. Each entry above corresponds to a file under `docs/`. Commits are intentionally small (one or two docs per commit) so history doubles as a research log.*
