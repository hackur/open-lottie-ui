# Research 17 — Open risks & unknowns

The biggest reasons this project might not work, and how we de-risk in week one.

## R1 — "Can Claude actually produce valid Lottie JSON?"

- **Severity**: high. This is the central bet.
- **What we know**: Lottie JSON is large and interdependent. Naive prompting fails. The spec is now machine-readable, which helps.
- **De-risk plan**:
  1. Hand-build 5 prompt → expected-Lottie pairs at 3 difficulty levels.
  2. Try Tier 1 (template), Tier 2 (bodymovin-python script), Tier 3 (raw JSON) for each.
  3. Score: validation pass rate, render success rate, perceived quality.
  4. **Decision gate**: if Tier 1+2 combined cover ≥ 70% of common asks, project ships. If only Tier 3 works and it's < 50%, the LLM angle is too fragile and we pivot to *editing* assistance only.

## R2 — "Will users actually use a local-only tool?"

- **Severity**: medium.
- **What we know**: Local-first tools (Obsidian, Logseq, Cursor, Claude Code itself) have proven adoption among developers. Designers-only audiences are more cloud-trained.
- **De-risk plan**: target devs first; designer outreach is a stretch goal. Validate by sharing the MVP in two design + dev communities and counting installs vs feedback.

## R3 — "python-lottie is barely maintained — does it still work?"

- **Severity**: medium.
- **What we know**: Last release on PyPI was ~2024 by Mattia Basaglia (author). Active issues but slow merges.
- **De-risk plan**:
  - Treat it as **optional**. Default plugin set works without it.
  - If python-lottie breaks for our integrations, fall back to `bodymovin-python` (smaller, MIT, simpler API).
  - Pin a known-good version in our plugin manifest.

## R4 — "ThorVG / dotlottie-rs renders some files differently from lottie-web"

- **Severity**: low-medium.
- **What we know**: ThorVG is mature but not pixel-identical to lottie-web on every Bodymovin feature (text, complex expressions, certain mattes).
- **De-risk plan**:
  - Default our **review preview** to `lottie-web` (the reference renderer). Users see what 95 % of the world will see.
  - Surface a "Compare in dotlottie-web" toggle so devs targeting that runtime can spot differences.
  - Add a "renderer compatibility report" plugin that flags features at risk.

## R5 — "Headless rendering is too slow"

- **Severity**: medium.
- **What we know**: puppeteer-lottie is ~30–50 ms per frame; library-grid thumbnails for hundreds of files is painful. SVG renderer + sharp is faster but doesn't handle image layers.
- **De-risk plan**:
  - Lazy thumbnails: render on first view, cache forever, invalidate on file hash change.
  - Batch import limits: prompt the user when importing > 50 files at once ("This will generate thumbnails in the background; OK?").
  - Skia/canvaskit fallback if pup is too slow.

## R6 — "License contamination from python-lottie / Glaxnimate"

- **Severity**: low.
- **What we know**: Both are GPL/AGPL. Linking would force the whole project into copyleft.
- **De-risk plan**: invoke as separate processes, never bundle, document clearly. Standard FSF "aggregation" reading. Confirmed in `16-licenses.md`.

## R7 — "Claude CLI changes its output format"

- **Severity**: medium.
- **What we know**: stream-json schema is documented but evolving. The team has shipped breaking-ish changes before (e.g., field renames).
- **De-risk plan**:
  - Pin minimum CLI version in `package.json` (`engines`-style check at boot).
  - Wrap the parse in a single function with strong types so a schema change is one diff.
  - Vendor a snapshot of the documented schema in `docs/research/09-claude-cli.md` for reference.

## R8 — "Process management leaks across HMR / restarts"

- **Severity**: low.
- **What we know**: Next.js HMR can leave orphaned children if the registry isn't `globalThis`-pinned. Restarts kill children mid-flight.
- **De-risk plan**:
  - `globalThis.__openLottieUiRegistry__` pattern.
  - On graceful shutdown, kill all running children.
  - Mark in-flight generations as `cancelled` on next boot if the corresponding child PID is gone.

## R9 — "The plugin manifest format gets locked in too early and we regret it"

- **Severity**: low-medium.
- **De-risk plan**:
  - v1 ship `manifest.v1` with explicit `version` field.
  - 2 plugins in-tree at v1 (`svg-import`, `dotlottie-export`); design accommodates them.
  - Plugin loader rejects unknown versions with a clear error.

## R10 — "Bundling official Lottie samples runs afoul of LottieFiles ToS"

- **Severity**: low.
- **What we know**: Lottie Simple License forbids using LottieFiles content to "develop a similar or competing service." We're orchestration, not a marketplace, but bulk-mirroring would be in the gray zone.
- **De-risk plan**: ship only files we authored or that are CC0/CC-BY from LAC. Per-file import for LottieFiles content stays user-initiated.

## R11 — "Cost of LLM calls makes this expensive to use"

- **Severity**: low (per-user) / medium (visibility).
- **What we know**: Opus is the most expensive; sonnet/haiku are cheap.
- **De-risk plan**:
  - Default to opus for generation, sonnet for tweaks/repair.
  - Surface per-call cost in the UI; aggregate per-day.
  - Document "estimated cost" in the README.

## R12 — "Designers won't grok the prompt → review pattern"

- **Severity**: medium.
- **De-risk plan**: ship 5 worked-example "starter prompts" in the UI. The user's first action is "Try this template" rather than facing a blank box.

## Items we are explicitly *not* worried about

- Browser compatibility — local app, modern browser only.
- Accessibility — important but not a launch blocker.
- Mobile — not in scope.
- Multi-user collaboration — not in scope.

## What we'll measure in the prototype

| Metric | Target |
|--------|--------|
| Tier-1+2 generation success rate (validates AND renders) | ≥ 70 % |
| Median time from prompt to reviewable preview | ≤ 30 s |
| User can approve/reject in ≤ 3 keystrokes | yes |
| Library scan + thumbs for 50 files | ≤ 60 s |
| Cold-start to first render | ≤ 10 s |

These are the gating numbers for "is this a viable v1."
