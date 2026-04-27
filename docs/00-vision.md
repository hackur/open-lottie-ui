# Vision & problem statement

## The problem

Lottie has won as the cross-platform vector-animation format. The official Lottie format is now stewarded by the **Lottie Animation Community (LAC)**, a Linux Foundation non-profit, with a real published spec at [`lottie.github.io/lottie-spec`](https://lottie.github.io/lottie-spec/). The runtime ecosystem is healthy:

- **lottie-web** (Airbnb) — the original SVG/canvas player, ~all the legacy tutorials.
- **dotlottie-web / dotlottie-react** (LottieFiles) — modern WASM/canvas player on top of `dotlottie-rs` (ThorVG renderer). Up to 90 % smaller payloads than raw JSON, supports themes, multi-animation, state machines.
- **dotlottie-rs** — a single Rust core with FFI for C, Kotlin, Swift, WASM.
- **rlottie** (Samsung), **Skottie** (Skia/Chrome) — alternative renderers.
- **python-lottie**, **bodymovin-python**, **lottie-api** — programmatic edit/generation.
- **Glaxnimate** — open-source vector-animation editor, KDE project, with a CLI and Python plugin API.
- **Bodymovin** — the After Effects export plugin that started it all.
- **awesome-lottie** — the canonical index of everything.

But the *workflow* is fragmented. A typical motion designer who wants to ship animation today still:

1. Authors in After Effects + Bodymovin (paid software) or hand-codes JSON.
2. Manages files in Finder.
3. Uses LottieFiles' web tools for previewing, optimizing, and converting to dotLottie.
4. Pulls free animations from a half-dozen marketplaces, each with its own license and download flow.
5. Has no good story for "tweak this animation slightly" without going back into AE — or for "generate a new one from a description".

There is no single, **local-first**, **open-source** workspace that ties this all together with an LLM in the loop.

## The proposed solution

`open-lottie-ui` is a Next.js admin that runs on your own machine and:

1. **Catalogs** Lottie files (raw `.json` and `.lottie`) from local folders, with metadata, thumbnails, tags, search.
2. **Generates** new animations by sending prompts to **Claude CLI** (`claude --print --output-format stream-json`). The output is captured, validated against the Lottie schema, rendered headlessly into preview frames, and dropped into a review queue.
3. **Reviews & approves.** A human sees the proposed animation side-by-side with whatever it was based on (or a blank slate), can play it, scrub it, see the JSON diff, and either approve (commit it to the library) or reject (with a reason that feeds back into the next iteration).
4. **Remixes** existing animations: pick one, describe a change ("make the loop seamless, switch the brand color to teal, slow it down 2×"), Claude rewrites the JSON, same review loop.
5. **Composes community tools** as plugins: `dotlottie-rs` to package, `python-lottie` to manipulate, `glaxnimate` to round-trip into a GUI, `ffmpeg` to export to mp4, the `lottie-spec` validator, headless renderers for thumbnails. Each is a small CLI shelled out from a Next.js server action. Adding a new tool = writing a manifest, not patching the app.

The point is **composition, not replacement.** We don't write a renderer. We don't write an editor. We write the connective tissue plus a great review UX.

## Success criteria

- A solo designer can install once (`pnpm install`, `pnpm dev`, point at a folder of `.json` files) and within 5 minutes:
  - browse their library with live previews,
  - generate a new animation from a text prompt and see it rendered,
  - approve or reject it with one click,
  - export the approved animation as `.lottie`.
- Every approval/rejection is recorded in `decisions.jsonl` so the system can learn what the user likes (later: feed past approvals back into prompts).
- All state lives as files on disk. Nothing in a database. The library directory is git-friendly so teams can share via a normal repo.
- Adding a new community CLI to the plugin registry takes < 30 lines of manifest.

## Non-goals

- **Not** a hosted SaaS. Local only. (May add deploy-the-admin-on-your-server later, but not v1.)
- **Not** a Bodymovin / After Effects replacement. We do not draw vectors. Use Glaxnimate or AE for authoring; we orchestrate.
- **Not** a renderer. We embed `lottie-web` / `dotlottie-web` for previews; we don't reimplement them.
- **Not** an LLM playground. Claude CLI is the only generator in v1; if someone wants to swap in a different one, that's a v2 plugin.
- **Not** a marketplace. We point at free libraries; we don't host or resell.
- **No telemetry.** Local app. If you want analytics, add them yourself.

## Why now

- The Lottie spec just stabilized under LAC governance — it's now a real, machine-readable JSON Schema, which makes LLM grounding actually feasible.
- dotLottie 2.0 ships state machines and themes, so an admin tool can do meaningful things beyond "preview JSON".
- Claude CLI ships a non-interactive `--print` mode with stream-json output that's purpose-built for being driven from another app.
- Local-first / file-system-as-DB workflows (Obsidian, Logseq, etc.) have proven that designers and developers will adopt them over hosted tools when the data is theirs.

## Audience

- Solo product designers / indie devs who want to ship Lottie without a $30/mo subscription.
- Frontend teams who already have a Lottie pipeline but want a self-hostable review tool.
- OSS maintainers building animated docs / READMEs / landing pages.
- Anyone curious about LLM-driven motion design who wants a tool, not a SaaS demo.
