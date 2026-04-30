# Brainstorm prep

> **Status (2026-04-29):** the brainstorm session did not happen before M1 build began. Defaults for B-1..B-6 are committed in [ADR-008](decisions/ADR-008-m1-defaults.md) — the recommendations below were adopted verbatim. Tier 2 questions (B-7..B-11) and Tier 3 (B-12..B-16) remain open. Reopen this doc when revisiting any committed default.

The research is done; the next call with the user is for **deciding scope and direction**. This doc catalogs the questions worth bringing.

## Tier 1 — must answer before M1 starts

These directly shape the MVP. Without them we cannot start coding without rework risk.

### B-1 Tier strategy for prompting

The three-tier strategy (template → python script → raw JSON) is described in `research/10-prompting-lottie.md` and `architecture/claude-integration.md`. **Question**: do we ship M1 with Tier 3 only and add Tier 1 templates after we measure raw-JSON reliability, or do we invest a few days *building 5 templates first* so the typical user's first prompt routes through a high-success path?

- Argument for "Tier 3 first": faster to ship; we learn how often Claude actually fails.
- Argument for "Tier 1 first": user's first impression; broken-on-arrival is fatal.

**Recommendation:** ship M1 with Tier 1 templates *and* a Tier 3 fallback. Skip Tier 2 (Python) until M2.

### B-2 Bundled seed library

Should the repo ship 5–10 small CC0/MIT animations under `apps/admin/seed-library/` so first-run shows something? Or keep the repo lean and ship as a separate `seed-library` repo / npm package?

- In-repo: zero-config first run. Adds maybe 200 KB to the repo.
- Separate: smaller repo, optional install.

**Recommendation:** in-repo. 200 KB of CC0 is fine.

### B-3 .lottie vs .json default export

ADR-005 says `.lottie` is canonical export. Confirm or flip. The case for flipping: `.json` is more familiar; `.lottie` is a ZIP that's harder to inspect.

**Recommendation:** keep `.lottie` as default; `.json` is one click away.

### B-4 Variant generation in MVP?

Mira's persona ("give me 5 versions and let me pick") is currently M2. Should we promote it to M1? Without it, the MVP loop is single-shot and feels less LLM-y.

**Recommendation:** keep variants for M2 to keep M1 small, but make the data model (each generation has an `id`, multiple ids per "request" is fine) accommodate it without rework.

### B-5 Plugin system in M1 or M2?

ADR-007 lands the plugin model in M2. Should the M1 SVG-import / dotLottie-pack functionality go through the plugin loader from day one, or be hardcoded?

- Hardcoded in M1: less plumbing.
- Pluginized in M1: shakes out the manifest format earlier.

**Recommendation:** hardcoded in M1. The two M1 features hit the plugin shape closely enough that we'll learn what the manifest needs from real usage by M2.

### B-6 Default model

Default to `claude-opus-4-7` (best Lottie output) or `claude-sonnet-4-6` (4× cheaper, often enough)?

**Recommendation:** opus default for *generation*; sonnet for *repair loops* (they're constrained "fix these errors" calls). Cap configurable.

## Tier 2 — should answer in M0/M1 transition

Less urgent but worth deciding before they bite.

### B-7 Where does the project live publicly?

GitHub org name? `open-lottie-ui` taken? Something else?

### B-8 Issue tracking strategy

GitHub issues alone? Linear? Project boards?

### B-9 First-party plugins set for M2

`docs/architecture/features.md` §M2 lists 5 plugins. Confirm priority order:

- `svg-import`
- `dotlottie-pack`
- `lottie-validate`
- `lottie-optimize`
- `gif-export`

Drop any? Add any?

### B-10 Telemetry?

We've said "no telemetry" everywhere. Confirm — even for opt-in error reporting?

**Recommendation:** confirm no in v1. Revisit at M5.

### B-11 Public release timing

M4 roadmap target is ~10 weeks. Sooner / later? Soft launch (small communities) or HN-day-one?

## Tier 3 — bigger questions, shape v2+

Worth raising once but probably defer.

### B-12 Audience: developer-first or designer-first?

Personas span both. Mira-the-designer wants drag-drop UI; Devon-the-dev wants keyboard. We've said "developer first, designer second." Is that still right? It affects M3+ priorities (state-machine editor vs CI integration).

### B-13 Hosting / team mode?

The "Sam" persona wants multi-user team mode. Currently M5+. Should we sketch that arch now to avoid painting into a corner?

### B-14 Editor integration

VS Code extension that surfaces this admin? Cursor extension? Or stay framework-agnostic?

### B-15 Mobile?

Just confirming "no mobile" for v1.

### B-16 Naming

`open-lottie-ui` is descriptive. Better names? (`Animatic`? `Looper`? `Bodymover`? `Lottiekit`?)

## Tier 4 — known knowns to surface

Decisions already made in ADRs that the user might still want to challenge:

- ADR-001 Next.js (vs Vite + Express)
- ADR-002 FS-as-DB (vs SQLite)
- ADR-003 Claude CLI (vs SDK)
- ADR-004 lottie-web default (vs dotlottie-web)
- ADR-005 .lottie canonical export (vs .json)
- ADR-006 No auth (vs basic LAN auth)
- ADR-007 Manifest plugins (vs code plugins)

If any of these are wrong for the user's intent, now is the time.

## Suggested 30-minute brainstorm agenda

1. **5 min**: walk the user through `00-vision.md` and `architecture/mvp.md` to confirm shared mental model.
2. **10 min**: tear through B-1..B-6 (the must-answers).
3. **10 min**: hit B-7..B-11 if time.
4. **5 min**: any of Tier 4 ADRs the user wants to challenge.
5. **End**: lock M1 task list, schedule kickoff.
