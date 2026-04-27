# Contributing to open-lottie-ui

Thanks for poking around. The project is in **research & planning** (M0). Most contributions right now are docs, not code.

## Ways to help (M0)

1. **Read `docs/` and open issues with questions.** If something is unclear or wrong, that's a real signal.
2. **Pick a topic in `docs/SUMMARY.md` §"Top open questions"** and add a comment / PR with your take.
3. **Test the install plan.** Try the steps in `docs/inventory/cli-tools.md` on your machine and report frictions.
4. **Add a research note.** Anything missing? `docs/research/` is open for additions; numbered files are easier to cross-link, but a `research/free-form-<slug>.md` is fine for one-offs.

## Ways to help (after M1)

- Build a plugin — see `docs/architecture/plugins.md`. Manifest format is stable from M2 onward.
- File a use-case — describe a real Lottie workflow you want and we'll see if it fits the roadmap.
- Submit a PR — see "Code conventions" once code lands.

## Code conventions (placeholder for M1+)

- TypeScript everywhere; strict mode.
- ESLint + Prettier (configs land with the scaffold).
- Server-side fs writes go through `lib/store/` only.
- Server actions are small; long work goes via the process registry + SSE.
- No DB. Files are canonical (ADR-002).
- No edge runtime in routes that touch fs or `child_process` (ADR-001 §Mitigations).

## Commit conventions

Conventional-style prefixes:

- `docs: …` — anything under `docs/`.
- `chore: …` — repo plumbing (gitignore, license, deps).
- `feat(<scope>): …` — new feature once code lands.
- `fix(<scope>): …` — bug fix.
- `refactor(<scope>): …` — non-functional changes.

One concern per commit. Small commits preferred; the log doubles as a research log.

## Pull requests

- Keep PRs small (under ~400 LoC change ideally).
- Link the docs / ADR / issue you're addressing.
- For doc PRs, also update `docs/SUMMARY.md` if you added a file.
- For ADR-affecting changes, propose the ADR update *in the same PR*.

## Code of conduct

Be kind. The Lottie ecosystem is small enough that we'll all run into each other again.
