# animatedicons.co — license & ToS verification

**Verified:** 2026-04-29
**Verdict:** **BULK-IMPORT BLOCKED.** Site license forbids automated scraping AND redistribution as a package. Both phase-2 prerequisites fail.

## Source pages reviewed

- https://animatedicons.co/ (homepage; footer + marketing copy)
- https://animatedicons.co/license (binding EULA)
- https://animatedicons.co/docs (integration docs)
- https://animatedicons.co/membership (paid tier marketing)

The footer (`© 2024 Pixel True Design Studios. Designed & Built by Flowspark`) only links to `/license`, `/docs`, `/membership`, and the two icon-style pages. There is no separate ToS or privacy page; `/license` is the single binding document.

## License grant (verbatim)

> "AnimatedIcons grants you a nonexclusive, worldwide copyright license. This license lets you download, copy, modify, display, and use the icons offered by AnimatedIcons at no cost, including for commercial activities, without needing permission from or attribution to the creator or AnimatedIcons."

## Prohibited uses (verbatim)

> "Yet, this license does not allow you: To use the icons to create, establish or promote a similar or competing service. To redistribute the icons as a standalone package or part of another package."

> "This restriction applies regardless of the method — be it automated or non-automated — of linking, embedding, scraping, searching, or downloading the icons available from AnimatedIcons without our express consent."

## Determination per question

| # | Question | Answer | Source |
|---|---|---|---|
| 1 | License type | Custom proprietary EULA (not CC, not OSI) | `/license` grant clause |
| 2 | Attribution required | **No** — "without needing permission from or attribution" | `/license` grant clause |
| 3 | Bulk download / scraping / vendoring | **FORBIDDEN** — automated scraping and redistribution as a package both explicitly disallowed without "express consent" | `/license` prohibited-uses clause |
| 4 | Modification / remixing | Allowed ("download, copy, modify, display, and use") | `/license` grant clause |
| 5 | Commercial use | Allowed ("including for commercial activities") | `/license` grant clause |
| 6 | Hot-link required vs vendor copy | Local copy of individual icons allowed for use; vendoring as a redistributable package is not | `/license` prohibited-uses clause |
| 7 | Public API / catalog / sitemap | **None documented.** `/docs` only describes the manual "Embed Icon" UI flow. No JSON catalog, no sitemap reference, no API endpoints | `/docs` |

## Why bulk-import is blocked

Two independent clauses each block phase 2:

1. **Method clause:** "regardless of the method — be it automated or non-automated — of … scraping, searching, or downloading the icons … without our express consent." A `scripts/import-animatedicons.ts` crawler is exactly the prohibited automated downloading.
2. **Redistribution clause:** "To redistribute the icons as a standalone package or part of another package." Storing 500+ animations under `library/animatedicons-*/animation.json` inside an open-source repo is redistribution as part of another package.

Even if open-lottie-ui stays a local-first private library, the import script itself violates the method clause, and any subsequent commit / share of the `library/` directory violates the redistribution clause.

The reddit summary that "no attribution required" was correct, but that's a permissive note inside an otherwise restrictive EULA — it does not override the no-scrape / no-redistribute clauses.

## Path forward (options for the user, not auto-actionable)

1. **Drop the bulk-import.** Treat animatedicons.co as a manual-import-only source — user downloads individual icons and drops them into the admin UI; per-icon license metadata records source + `license_id: animatedicons-eula`.
2. **Request "express consent."** Email the operator (Pixel True Design Studios / Flowspark) describing the project and ask for written permission for a bulk fetch into a local-first developer tool.
3. **Pick a different source.** LottieFiles "free" tier (Lottie Simple License) and the lottie/lottie-spec sample repo are both already on the integrate list (`docs/inventory/asset-sources.md`) and permit redistribution under stated terms.

## Action items recorded for the user

- Task #111 (bulk-import animatedicons): **blocked on license.** Do not run a bulk import. Add to `docs/inventory/asset-sources.md` under "Sources we link to but don't auto-import" with reason = proprietary EULA, no scrape, no redistribution.
- If pursuing option 2 above, file an ADR before starting any crawl, and store the consent email in `docs/legal/`.
