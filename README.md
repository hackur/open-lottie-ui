# open-lottie-ui

A local-first Next.js admin for browsing, generating, remixing, and exporting Lottie animations — orchestrated by the Claude CLI with a human in the loop on every change.

> **Status: research & planning.** No code yet — see `docs/` for the design log. The implementation plan lands once research is done.

## Why

Lottie has a healthy open-source ecosystem (lottie-web, dotlottie-js, python-lottie, glaxnimate, lottie-spec, …) but it's fragmented. Designers bounce between After Effects + Bodymovin, LottieFiles' web tooling, and a half-dozen CLIs. There is no single local workspace that:

1. Catalogs animations you already have (free libraries, your exports, your team's library).
2. Lets you ask an LLM to generate a new one or tweak an existing one.
3. Forces a human-approval step on every generated/edited file before it lands in the library.
4. Composes the existing open-source tooling instead of replacing it.

`open-lottie-ui` aims to be that workspace. It runs entirely on your machine, stores everything as files in git, and shells out to community tools (Claude CLI, dotlottie-rs, python-lottie, glaxnimate, ffmpeg, …) the same way a Unix toolchain would.

## High-level design

- **Next.js 15 App Router**, runs at `localhost:3000`. No auth — local only.
- **File-system as DB.** `library/` holds canonical animations; `generations/` holds proposals awaiting human review; `decisions.jsonl` is the append-only audit log.
- **Claude CLI** (`claude --print --output-format stream-json …`) is the LLM driver. Server actions spawn it, stream tokens to the UI, and persist results. No API keys to manage — uses your existing Claude Code auth.
- **Human in the loop.** Every generation lands in a review queue. You compare side-by-side with the previous version (or a blank canvas), approve, reject with a reason (which feeds back into the next iteration), or send it for another round.
- **Plugin model.** Any CLI that takes Lottie JSON in and produces something useful out (optimize, render to gif, convert to dotLottie, validate against lottie-spec, …) can be declared in a manifest and surfaced as a button in the UI.

## Repository layout (planned)

```
open-lottie-ui/
├── docs/                  # research, architecture, ADRs, workflows (this is where we are now)
│   ├── research/
│   ├── architecture/
│   ├── decisions/
│   ├── inventory/
│   └── workflows/
├── apps/
│   └── admin/             # the Next.js app (not yet created)
├── packages/
│   ├── lottie-tools/      # thin wrappers around community CLIs
│   └── claude-driver/     # Claude CLI invocation + JSON parsing
├── library/               # user's Lottie library (gitignored by default)
└── plugins/               # community-tool manifests
```

## Reading order

1. [`docs/00-vision.md`](docs/00-vision.md) — the elevator pitch.
2. [`docs/SUMMARY.md`](docs/SUMMARY.md) — index of everything in `docs/`.
3. [`docs/architecture/mvp.md`](docs/architecture/mvp.md) — what week-1 looks like.

## License

MIT (placeholder — see `docs/research/16-licenses.md` once that doc lands; the dependency mix may force a re-evaluation).
