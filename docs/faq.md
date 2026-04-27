# FAQ

Quick answers. Long-form explanations live in the linked docs.

### Why Lottie and not Rive / SVG / Lordicon / Lottie-Bodymovin?

Lottie is the most-deployed cross-platform vector animation format and now has a real published spec under the Linux Foundation. SVG animation lacks ecosystem; Rive is excellent but a different format with a different runtime. Lordicon is a *library* on top of Lottie. We bet on Lottie's ecosystem maturity. See `research/01-lottie-format.md`, `research/18-prior-art.md`.

### Why a Next.js admin and not a CLI / VS Code extension / Electron app?

- **CLI**: no review UX, no preview, no comparison.
- **VS Code extension**: ties our audience to one editor.
- **Electron**: heavier than a localhost web app, and the web is exactly the platform Lottie targets.
A localhost Next.js admin gets us streaming, file-system access, and a real UI without Electron weight. See ADR-001.

### Why Claude CLI and not the Anthropic SDK?

Uses your existing Claude Code OAuth — no API keys to manage. ndjson stream-json output is purpose-built for being driven from another app. See ADR-003.

### Will it work without Claude installed?

The browse / preview / import / export flows work without Claude. The generate / remix flows are gated on `claude` being on PATH. The Settings page surfaces a clear error and install hint.

### What does generation cost?

A typical Tier 3 (raw JSON) generation costs ~$0.01–0.04 with claude-opus-4-7. Tier 1 (templates) is ~$0.001 because the model only fills params. The UI shows running totals; there's a per-day cap you can set. See `architecture/claude-integration.md` §"Cost & usage".

### Can I use a different LLM?

v1 is Claude-only. The `generate()` driver in `lib/claude/` is implementation-agnostic; v2 will accept other backends behind the same interface. See ADR-003 §Status.

### Where does my data live?

On your disk, in this project's directory. `library/` for canonical animations, `generations/` for proposals awaiting review, `decisions.jsonl` for the audit log. No DB, no cloud. See `architecture/data-model.md`.

### Can I share a library with my team via git?

Yes. Remove `library/` from `.gitignore` and commit. The format is human-diffable for `meta.json`s and decisions; raw `animation.json` will be noisy diffs. See `architecture/data-model.md` §"Git friendliness".

### Can I run this on a server / NAS / Pi?

Technically yes — `next build && next start` works. But the default bind is 127.0.0.1; for LAN access set `HOST=0.0.0.0`. There's no auth in v1; if you expose the port you're trusting your LAN. See ADR-006.

### Why MIT? My company can't use AGPL.

Application code is MIT. The few AGPL/GPL community tools (`python-lottie`, `Glaxnimate`) are *invoked as subprocesses*, never linked. Standard "aggregation" interpretation. See `research/16-licenses.md`.

### Can I bundle the LottieFiles free library?

No. The Lottie Simple License explicitly forbids bulk-mirroring to compete. We do per-file imports on demand; we do not redistribute their library. See `research/16-licenses.md`.

### Can I drop in any Lottie file?

Most. We validate against `lottie-spec`, so clearly malformed files are rejected. Files that use player-specific extensions (text layers `ty:5`, audio, expressions) import OK but show warnings on the detail page about cross-renderer compatibility.

### Why two preview renderers (lottie-web *and* dotlottie-web)?

They render most files identically but diverge on edge cases. lottie-web is the reference; dotlottie-web is what your production users will run. The toggle is a sanity check. See ADR-004.

### What if Claude generates broken JSON?

Three layers:
1. **Templates (Tier 1)** mostly avoid the problem because the model only fills params.
2. **Repair loop**: failed validation triggers up to 3 follow-up calls with the validator errors.
3. **Reject**: if it still doesn't validate after repairs, the generation lands in the queue with status `failed-validation`. You can inspect, edit, retry, or discard.
See `research/10-prompting-lottie.md`, `architecture/claude-integration.md` §"Repair loop".

### Why no auth?

v1 is local-only. Auth is friction for the localhost case and useless against a malicious LAN actor without TLS and a real account model. See ADR-006.

### When can I install it?

When M1 ships (target: ~1 week after the brainstorm). Currently in M0 (research & planning) — `docs/` only.

### How do I add a community tool as a plugin?

Write a `plugin.json`. See `architecture/plugins.md` and the stubs under `plugins/`. The format is stable from M2.

### Where do I report bugs / request features?

GitHub issues on the project repo. For now the project lives at `/Volumes/JS-DEV/open-lottie-ui` locally; the public repo URL is added when M4 (public release) ships.
