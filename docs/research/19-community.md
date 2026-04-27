# Research 19 — Community resources & references

The Lottie ecosystem has a few canonical hubs. Tracking these is useful both as research bookmarks for us and as **context to feed Claude in prompts** (e.g., "see <url> for an example of how shape layer trim paths work").

## Standards & specs

- **Lottie Animation Community (LAC)**: [lottie.github.io](https://lottie.github.io/) — Linux Foundation home; format steward.
- **Lottie spec (formal)**: [lottie.github.io/lottie-spec](https://lottie.github.io/lottie-spec/1.0.1/).
- **JSON Schema**: [lottie.github.io/lottie-spec/1.0.1/specs/schema/](https://lottie.github.io/lottie-spec/1.0.1/specs/schema/).
- **dotLottie 2.0 spec**: [dotlottie.io/spec/2.0/](https://dotlottie.io/spec/2.0/).
- **Lottie docs (LottieFiles tutorial-style)**: [lottiefiles.github.io/lottie-docs](https://lottiefiles.github.io/lottie-docs/).

## Curated indices

- **awesome-lottie**: [LottieFiles/awesome-lottie](https://github.com/LottieFiles/awesome-lottie). Bookmarks, libraries, tools, integrations.
- **Lottie Implementations directory**: [lottie.github.io/implementations](https://lottie.github.io/implementations/).
- **GitHub topic**: [github.com/topics/lottie](https://github.com/topics/lottie) and [`lottie-animation`](https://github.com/topics/lottie-animation).

## Core orgs / accounts

- **LottieFiles** on GitHub: [github.com/lottiefiles](https://github.com/lottiefiles) — dotlottie-web, dotlottie-rs, dotlottie-js, lottie-react, lottie-vue, …
- **Airbnb**: [github.com/airbnb](https://github.com/airbnb) — `lottie-web`, `lottie-ios`, `lottie-android` (still maintained).
- **Samsung**: `rlottie`, ThorVG.
- **KDE**: `Glaxnimate` (since 2023 transfer).

## Community / Q&A

- **LottieFiles forum**: [forum.lottiefiles.com](https://forum.lottiefiles.com/) — main Q&A. Engineering, design, runtime sub-forums.
- **LottieFiles Discord** (linked from forum) — real-time help.
- **LottieFiles Help Center**: [help.lottiefiles.com](https://help.lottiefiles.com/).
- **Stack Overflow tag**: [`lottie`](https://stackoverflow.com/questions/tagged/lottie).

## Editors / authoring

- **Glaxnimate**: [glaxnimate.org](https://glaxnimate.org/) and on KDE Apps.
- **Lottielab**: [lottielab.com](https://www.lottielab.com/).
- **Bodymovin (AE plugin)**: [aescripts.com/bodymovin](https://aescripts.com/bodymovin/).
- **LottieFiles for AE**: [aescripts.com/lottiefiles](https://aescripts.com/lottiefiles/).
- **Jitter**: [jitter.video](https://jitter.video/).

## Notable blog posts / talks (research aids)

- [LottieFiles engineering blog — Documenting the Lottie JSON object](https://lottiefiles.com/blog/engineering/kicking-off-the-documentation-of-lottie-json-object).
- [Understanding the internals of Lottie (codingwithmitch)](https://codingwithmitch.com/blog/understanding-the-internals-of-lottie-rendering-the-animation-file/).
- [Glaxnimate intro on dev.to (Mattia Basaglia)](https://dev.to/mbasaglia/glaxnimate-create-2d-vector-animations-for-the-web-2ein).
- [How I rendered Lottie in NodeJS — Facundo Paredes](https://medium.com/@facuparedes/how-i-managed-to-render-a-lottie-in-nodejs-for-real-869454d236a7).
- [Lottielab — Optimization technology overview](https://www.lottielab.com/optimise-lottie).

## Conformance test suite

- The `lottie-spec` repo includes a conformance suite: [github.com/lottie/lottie-spec](https://github.com/lottie/lottie-spec).
- Excellent source of tiny well-formed Lottie files for our few-shot prompt corpus.

## Plugins ecosystem (what to integrate later)

- **Figma plugin**: LottieFiles for Figma — useful pre-step for users who design in Figma.
- **Sketch / XD plugins** — declining usage; document only.
- **VS Code Lottie preview** — third-party extensions worth listing.

## How we use this in the app

- Plugin manifests can declare `documentation_url` so the UI shows "Read the docs" links.
- The system prompt includes hand-curated paragraphs from these sources for grounding.
- A `docs/community.md` (this file) is the public-facing pointer for new contributors.

## Sources

(Same as in-line links above; major hubs only.)

- [Lottie Animation Community](https://lottie.github.io/)
- [LottieFiles/awesome-lottie](https://github.com/LottieFiles/awesome-lottie)
- [LottieFiles Forum](https://forum.lottiefiles.com/)
- [LottieFiles Help Center](https://help.lottiefiles.com/)
