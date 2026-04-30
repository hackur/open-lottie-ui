# ADR-008 — M1 defaults committed without brainstorm

## Context

`docs/brainstorm.md` lists 5 Tier-1 must-answer questions (B-1 through B-5) plus 6 secondary questions. The brainstorm session with the user did not happen before M1 build began; the user's instruction was to proceed with sub-agents on the task list.

We need to make the defaults explicit so future contributors know which choices are *committed* vs which are *open and revisitable*.

## Decision

Adopt the recommendations from `docs/brainstorm.md` verbatim for M1:

| ID | Question | M1 default |
|----|----------|-----------|
| B-1 | Tier strategy | **Tier 1 templates + Tier 3 raw-JSON fallback** in M1. Tier 2 (Python) deferred to M2. |
| B-2 | Bundled seed library | **In-repo** under `seed-library/`. ~3 hand-rolled CC0 entries. |
| B-3 | `.lottie` vs `.json` default export | **`.lottie`** (per ADR-005). `.json` one click away. |
| B-4 | Variant generation in MVP | **No.** Single-shot in M1. Schema accommodates multi-version per request without rework. |
| B-5 | Plugin system in M1 or M2 | **Hardcoded for M1**. Plugin manifest format (ADR-007) shipped, but loader is M2. |
| B-6 | Default model | **`claude-opus-4-7`** for generation, `claude-sonnet-4-6` for repair-loop calls. |

## Consequences

**Pros**
- Unblocks M1 build immediately.
- Each decision is reversible: B-1, B-4, B-5 are additive (turn things on later); B-2 can be moved out of repo; B-3 is one config flip; B-6 is a settings.json default.
- All five align with the existing MVP scope in `docs/architecture/mvp.md`.

**Cons**
- We didn't observe whether raw-JSON Tier 3 reliability is acceptable on its own before building the template engine. If Tier 3 turns out to work great, the template engine is over-engineering.
- Users who want variant generation (Mira persona) will hit a wall in M1.

**Mitigations**
- Build Tier 1 templates as data, not code. Five template JSON files. Removing the engine if Tier 3 wins is mechanical.
- The generation directory layout (`generations/<id>/v1.json`, `v2.json`) already supports multiple versions per request — variant UI is an M2 paint job, not a refactor.

## Status

Accepted, M1.

## Sources

- [`docs/brainstorm.md`](../brainstorm.md) — original questions and recommendations.
- [`docs/architecture/mvp.md`](../architecture/mvp.md) — M1 scope.
- [ADR-005](ADR-005-dotlottie-canonical-export.md) — `.lottie` canonical export.
- [ADR-007](ADR-007-plugin-manifest-v1.md) — plugin manifest v1.
