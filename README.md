# open-lottie-ui

A local-first Next.js admin for browsing, generating, remixing, and exporting Lottie animations — orchestrated by the Claude CLI with a human in the loop on every change.

> **Status: M1 — admin runs locally.** All M0 docs are still authoritative; see `docs/` for design, `docs/decisions/ADR-008-m1-defaults.md` for the defaults committed without the user brainstorm.

## Why

Lottie has a healthy open-source ecosystem (lottie-web, dotlottie-js, python-lottie, glaxnimate, lottie-spec, …) but it's fragmented. Designers bounce between After Effects + Bodymovin, LottieFiles' web tooling, and a half-dozen CLIs. There is no single **local-first**, **open-source** workspace that:

1. Catalogs animations you already have (free libraries, your exports, your team's library).
2. Lets you ask an LLM to generate a new one or tweak an existing one.
3. Forces a human-approval step on every generated/edited file before it lands in the library.
4. Composes existing community tooling rather than replacing it.

`open-lottie-ui` aims to be that workspace. Everything runs on your machine, all state is files (git-friendly), and we shell out to community tools (Claude CLI, dotlottie-rs, python-lottie, glaxnimate, ffmpeg, …) the way a Unix toolchain would.

## High-level design

- **Next.js 15 App Router** at `localhost:3000`. No auth — local only (ADR-006).
- **File system as DB.** `library/` is canonical; `generations/` is the review queue; `decisions.jsonl` is the audit log (ADR-002).
- **Claude CLI** (`claude --print --output-format stream-json …`) drives generation. No API keys — uses your existing Claude Code OAuth (ADR-003).
- **Human in the loop.** Every generation lands in a review queue. Side-by-side compare with the base (or blank), approve, reject with reason codes that feed back into the next prompt, or edit-and-retry.
- **Manifest-driven plugins.** Any CLI that takes Lottie JSON in and produces something useful out (optimize, render to gif, convert to dotLottie, validate against lottie-spec, …) is a `plugin.json` away (ADR-007).
- **`lottie-web` is the default preview renderer; `dotlottie-web` is a side-by-side toggle** (ADR-004). `.lottie` is the canonical export format (ADR-005).

## Repository layout

```
open-lottie-ui/
├── docs/                              # research, architecture, ADRs, workflows
│   ├── 00-vision.md                   # elevator pitch
│   ├── SUMMARY.md                     # index — start here
│   ├── research/                      # 19 numbered notes (format, players, prompting, …)
│   ├── inventory/                     # npm packages, CLI tools, asset sources
│   ├── architecture/                  # personas, system, data model, MVP, roadmap
│   ├── workflows/                     # generate-approve, remix, import
│   ├── decisions/                     # 7 ADRs
│   ├── wireframes.md                  # ASCII screen sketches
│   ├── glossary.md                    # term definitions
│   ├── faq.md
│   └── brainstorm.md                  # open questions for the next user session
├── prompts/                           # system prompts + Tier 1 templates + few-shot
│   ├── system/                        # default + full-schema variants
│   ├── templates/                     # 5 parameter-schema stubs (Tier 1)
│   ├── few-shot/                      # corpus of (prompt, output) examples
│   └── starter-prompts.json           # UI seed prompts
├── plugins/                           # 8 plugin manifest stubs (M2+ implementations)
│   ├── svg-import/                    # MIT
│   ├── dotlottie-pack/                # MIT
│   ├── lottie-validate/               # MIT
│   ├── lottie-optimize/               # MIT
│   ├── gif-export/                    # MIT (uses ffmpeg)
│   ├── glaxnimate-roundtrip/          # MIT plugin → GPL-3.0 tool
│   ├── dotlottie-render/              # MIT (uses dotlottie-rs)
│   └── python-lottie-helpers/         # MIT plugin → AGPL-3.0 tool
├── packages/                          # reusable libraries (built in M1+)
│   └── lottie-tools/
│       ├── licenses.json              # license registry
│       └── schema/                    # vendored JSON Schemas
├── seed-library/                      # CC0/MIT starter animations shipped with the repo
│   └── loader-pulse/
├── scripts/
│   └── detect-tools.sh                # probe host for required CLIs
├── apps/admin/                        # the Next.js app (M1)
├── library/                           # user's Lottie library (gitignored by default)
├── generations/                       # review queue (gitignored)
├── CLAUDE.md                          # project memory for Claude Code sessions
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE                            # MIT
```

## Reading order

1. [`docs/00-vision.md`](docs/00-vision.md) — the elevator pitch.
2. [`docs/SUMMARY.md`](docs/SUMMARY.md) — index of everything in `docs/`.
3. [`docs/architecture/mvp.md`](docs/architecture/mvp.md) — what week-1 looks like.
4. [`docs/brainstorm.md`](docs/brainstorm.md) — questions for the next session.
5. [`docs/wireframes.md`](docs/wireframes.md) — ASCII screen sketches.

## Run it locally

Requires Node ≥ 20 and `pnpm` (auto-activated via corepack on Node 22+).
Optional: `claude` CLI (for Tier-3 prompted generation), `ffmpeg`.

```
$ corepack enable && corepack prepare pnpm@9.15.0 --activate
$ pnpm install
$ pnpm dev
   open-lottie-ui  •  http://127.0.0.1:3000

# In the browser:
#  /library  → 3 seed animations (loader-pulse, checkmark-success, spinner-arc)
#  /generate → Tier 1 (template + params, deterministic) or Tier 3 (Claude prompt)
#  /review/:id → side-by-side base/generation, validation panel, press 'a' to approve / 'r' to reject
#  /library  → new animation appears; export as .lottie or .json
```

Probe host capabilities anytime: `pnpm detect-tools`.

## License

**MIT** for application code (see `LICENSE`). Some optional plugins invoke GPL-3.0 / AGPL-3.0 community tools as separate processes; we never link. See [`docs/research/16-licenses.md`](docs/research/16-licenses.md) for the full breakdown.
