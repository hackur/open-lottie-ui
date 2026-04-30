# Documentation index

Index for `docs/`. Read top to bottom for the full story; jump in via the "If you only read three" list at the bottom.

## Vision

- [`00-vision.md`](00-vision.md) — problem, proposed solution, success criteria, non-goals.

## Research notes

- [`research/01-lottie-format.md`](research/01-lottie-format.md) — Bodymovin JSON schema fundamentals.
- [`research/02-players.md`](research/02-players.md) — Lottie runtime libraries (lottie-web, dotlottie-web, Skottie, …).
- [`research/03-libraries.md`](research/03-libraries.md) — free animation libraries / marketplaces.
- [`research/04-dotlottie.md`](research/04-dotlottie.md) — `.lottie` container format.
- [`research/05-conversions.md`](research/05-conversions.md) — SVG ↔ Lottie tooling.
- [`research/06-programmatic-generation.md`](research/06-programmatic-generation.md) — code-based generation.
- [`research/07-optimize-validate.md`](research/07-optimize-validate.md) — optimization, linting, validation.
- [`research/08-editors.md`](research/08-editors.md) — open-source editors (Glaxnimate).
- [`research/09-claude-cli.md`](research/09-claude-cli.md) — Claude CLI invocation & stream-json.
- [`research/10-prompting-lottie.md`](research/10-prompting-lottie.md) — three-tier prompting strategy.
- [`research/11-nextjs-admin.md`](research/11-nextjs-admin.md) — Next.js 15 patterns for local admin tools.
- [`research/12-process-management.md`](research/12-process-management.md) — long-lived child processes from Next.
- [`research/13-hitl-ux.md`](research/13-hitl-ux.md) — human-in-the-loop approval UX.
- [`research/14-headless-render.md`](research/14-headless-render.md) — headless rendering for thumbnails.
- [`research/15-visual-diff.md`](research/15-visual-diff.md) — visual diffing for animations.
- [`research/16-licenses.md`](research/16-licenses.md) — license compatibility (MIT vs AGPL/GPL plugins).
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
- [`workflows/lottie-to-video.md`](workflows/lottie-to-video.md) — Lottie → video (ProRes/WebM/MP4) with alpha.
- [`workflows/video-to-lottie.md`](workflows/video-to-lottie.md) — Video/GIF/WebP → Lottie (slideshow vs vector trace).

## Decisions (ADRs)

- [`decisions/`](decisions/README.md) — 7 ADRs (Next.js, FS-as-DB, Claude CLI, lottie-web preview, .lottie export, no auth, manifest plugins).

## Reference

- [`wireframes.md`](wireframes.md) — ASCII sketches of the key screens.
- [`glossary.md`](glossary.md) — term definitions.
- [`faq.md`](faq.md) — quick answers.
- [`brainstorm.md`](brainstorm.md) — questions to bring to the next user session.

## Outside `docs/` — concrete artifacts the docs reference

- [`../prompts/system/`](../prompts/system/) — system prompts (`default.md`, `full-schema.md`).
- [`../prompts/templates/`](../prompts/templates/) — Tier 1 parameterized templates (5 stubs).
- [`../prompts/few-shot/`](../prompts/few-shot/) — few-shot corpus.
- [`../prompts/starter-prompts.json`](../prompts/starter-prompts.json) — UI seed prompts.
- [`../plugins/`](../plugins/) — 8 plugin manifest stubs.
- [`../packages/lottie-tools/licenses.json`](../packages/lottie-tools/licenses.json) — license registry.
- [`../seed-library/`](../seed-library/) — CC0 starter animations.
- [`../scripts/detect-tools.sh`](../scripts/detect-tools.sh) — host tool probe.
- [`../CLAUDE.md`](../CLAUDE.md) — project memory for Claude Code sessions.

---

## If you only read three

1. [`00-vision.md`](00-vision.md) — what we're building and why.
2. [`architecture/mvp.md`](architecture/mvp.md) — what week-1 looks like concretely.
3. [`brainstorm.md`](brainstorm.md) — what to decide next.

## Top open questions

See [`brainstorm.md`](brainstorm.md). The five must-answers for kicking off M1:

1. Tier strategy — templates first, raw JSON first, or both?
2. Bundled seed library — in-repo or separate?
3. `.lottie` vs `.json` default export.
4. Variant generation in MVP or M2?
5. Plugin system in M1 (real loader) or M2 (hardcoded for M1)?

---

*Last updated: 2026-04-27. Each entry above corresponds to a file under `docs/` (or, for "concrete artifacts", to a sibling directory).*
