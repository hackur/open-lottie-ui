# Research 18 — Prior art / similar projects

What's already out there, what we'd steal from each, and what gap we fill.

## Web-based Lottie editors

### LottieFiles

- The 800-lb gorilla. Hosts animations, has a web Creator (former Lottielab tech), web optimizer, plugins for Figma / Sketch / AE.
- Strengths: massive library, mature export tooling, the canonical source of `.lottie` and `dotlottie-rs`.
- Gaps for our user: cloud-only, no LLM-driven generation with HITL approval, no local-first workflow, can't bring your own offline assets and treat them as first-class.
- What we steal: theming model, dotlottie spec, examples for prompt grounding.

### Lottielab

- Web-based animation editor specifically for Lottie. Recently added a **Magic Animator** feature that uses AI under the hood.
- Strengths: best-in-class Lottie-native editor, paid AI generation.
- Gaps: cloud, paid, no plugin extensibility, no review queue with rejection codes / iteration history.
- What we steal: their editor UX is the gold standard if/when we ever do in-app editing.

### Jitter

- "Figma for motion." Browser-based motion editor. Exports to Lottie/MP4/GIF.
- Strengths: low-learning-curve UI, social sharing.
- Gaps: not local, not Lottie-native (broader motion design), no LLM workflow.
- What we steal: keyframe UX patterns.

### Haiku Animator

- Defunct as a product but the codebase exists. Tried to bridge design and code — animations as components.
- Lessons: this market is hard; users want either a designer tool or a developer tool, rarely both.

### LottieEditor.com

- Free in-browser editor, simpler than Lottielab.
- Gaps: no LLM, no local.

## Open-source desktop editors

### Glaxnimate

- Covered in `08-editors.md`. We integrate via plugin.

### Synfig

- General 2D animator with Lottie export via `python-lottie`.
- Heavier than designers usually want.

### Krita / Blender Grease Pencil

- Vector animation features but not Lottie-targeted. Out of scope.

## LLM-for-animation projects

### Rive's AI features

- Rive (different format, `.riv`) added AI-assisted state-machine generation in 2025.
- Different format, but the pattern of "describe a state machine, AI proposes" is one we should learn from.

### Various indie "AI animation" SaaS

- Mostly text-to-video or text-to-storyboard, not text-to-Lottie. The Lottie corner is genuinely under-served.

## Local-first design tools (inspiration, not Lottie-specific)

### Penpot (desktop / self-hostable Figma alternative)

- Self-hostable design tool; has a healthy plugin ecosystem.
- Inspiration for our plugin manifest format and self-hosting story.

### Storybook + Chromatic

- Approval queue UX for visual changes. Side-by-side review with diff highlighting.
- We borrow heavily here for `13-hitl-ux.md`.

### Plasmic Studio

- Visual page builder with a review/preview pattern.

## So what's the gap?

There is **no** local-first, open-source admin that:

1. Catalogs Lottie files across multiple sources.
2. Calls an LLM (with no API-key setup) to generate / remix.
3. Forces a human-approval gate.
4. Composes existing community CLIs as plugins.

Each piece exists somewhere. None of them are stitched together. That's the project.

## Lessons we explicitly take

- **Lottielab → editor UX bar.** If we ever do property tweaking, copy their patterns.
- **LottieFiles → dotLottie + theming.** Make `.lottie` the canonical export.
- **Storybook/Chromatic → review queue.** Visual diff + decision codes + per-item URLs.
- **Penpot → plugin format.** Manifest-driven, self-hostable, no remote-code execution.
- **Haiku → cautionary tale.** Don't try to be both a designer tool and a developer tool. Pick "developer-with-designers-on-the-side."

## Sources

- [LottieFiles Alternatives — AlternativeTo](https://alternativeto.net/software/lottie/)
- [Lottielab alternatives — Product Hunt 2026](https://www.producthunt.com/products/lottielab/alternatives)
- [Best Jitter alternatives 2026 — Product Hunt](https://www.producthunt.com/products/jitter/alternatives)
- [25 Best Tools for Motion Design 2025 (todaymade)](https://www.todaymade.com/blog/best-tools-for-motion-design)
- [Top 10 Free Alternatives to LottieFiles in 2025](https://www.femaleswitch.com/directories/tpost/pv08lg18n1-top-10-free-alternatives-to-lottiefiles)
- [Rive vs Lottie](https://rive.app/blog/rive-as-a-lottie-alternative)
- [Jitter vs LottieFiles vs Rive (SourceForge)](https://sourceforge.net/software/compare/Jitter-vs-LottieFiles-vs-Rive/)
