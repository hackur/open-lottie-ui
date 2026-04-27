# Changelog

All notable changes to this project. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/), and the project adheres to semver from 0.1.0 onward.

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
