# Research 08 — Open-source Lottie editors

We are *not* building an editor. We orchestrate. But surfacing "Open this animation in $EDITOR for hand-tweaking, then re-import" is a valuable plugin point.

## Glaxnimate

- Site: [glaxnimate.org](https://glaxnimate.org/), now part of KDE: [apps.kde.org/glaxnimate](https://apps.kde.org/glaxnimate/), repo: [KDE/glaxnimate](https://github.com/KDE/glaxnimate).
- Open-source vector animation editor. Cross-platform (Linux first-class, macOS / Windows builds via Flathub / KDE).
- Formats: Lottie (read/write), animated SVG, animated WebP, AVD, RIVE.
- **CLI**: yes. `glaxnimate <input> --export <output> --format lottie` — converts/renders without launching the GUI.
- **Python scripting**: full Python plugin API for automating tasks and adding format support. Available as a PyPI package: [`glaxnimate`](https://pypi.org/project/glaxnimate/).
- License: GPL-3.0.
- **Use in `open-lottie-ui`**:
  - Plugin button **"Open in Glaxnimate"** that launches the GUI on a generation, watches the file, re-imports on save.
  - Headless conversions / format checks via the CLI.
  - Note GPL: we ship as an external dependency the user installs themselves. Documented as the "designer's escape hatch".

## Synfig (with `python-lottie` export)

- Synfig is a long-running open-source 2D animation studio. Not Lottie-native, but `python-lottie` includes a Synfig importer/exporter.
- Heavier than designers usually want; mention but don't prioritize.

## LottieLab community tier (proprietary)

- Web-based Lottie editor; has a free tier. Closed-source.
- Our role: link out to it as an option, no integration.

## Haiku / Animator

- Defunct as a standalone product, codebase exists. Not worth integrating.

## Lottie editors built into other tools

- **Figma → Lottie** via plugins (Aninix, LottieFiles plugin) — closed but widely used. We can document the workflow but not integrate.
- **Rive** — different format (`.riv`), not Lottie. Out of scope.

## Decision for `open-lottie-ui`

- **Glaxnimate is the canonical "editor escape hatch."** Plugin: `glaxnimate-roundtrip`.
- We document and support: drag-out to Lottielab / Figma / AE, drop back the modified file via the import workflow.
- We **do not** build any in-app editing of layers/keyframes in v1. (Maybe a v3 feature: simple property tweaking.)

## Sources

- [Glaxnimate site](https://glaxnimate.org/)
- [Glaxnimate on KDE Apps](https://apps.kde.org/glaxnimate/)
- [glaxnimate on PyPI](https://pypi.org/project/glaxnimate/)
- [Glaxnimate scripting docs](https://glaxnimate.org/contributing/scripting/)
- [KDE/glaxnimate repo](https://github.com/KDE/glaxnimate/blob/master/CHANGELOG.md)
- [Glaxnimate intro on dev.to](https://dev.to/mbasaglia/glaxnimate-create-2d-vector-animations-for-the-web-2ein)
