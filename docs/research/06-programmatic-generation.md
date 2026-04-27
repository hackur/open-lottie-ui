# Research 06 — Programmatic Lottie generation

The core question: **what tools exist that let code (rather than a UI editor) emit valid Bodymovin JSON?** This matters because Claude is much better at producing Python that emits Lottie than at producing valid Lottie JSON in one shot.

## `python-lottie` (a.k.a. `lottie` on PyPI, by Mattia Basaglia)

- Repo: [mattbas / python-lottie on GitLab](https://mattbas.gitlab.io/python-lottie/), PyPI: [`lottie`](https://pypi.org/project/lottie/).
- This is the most complete Python framework for Lottie. Features:
  - Load TGS (Telegram compressed Lottie) and uncompressed Lottie JSON.
  - Object model for every layer / shape / property.
  - Helpers: shake, linear bounce, follow-bezier-path, draw-on/draw-off, wave distortion, pseudo-3D rotation, IK solver, easing presets.
  - `lottie_convert.py` script: convert between Lottie / TGS / SVG / animated SVG / GIF / WebP / MP4 (the last few require `cairosvg` + `pillow` + `ffmpeg`).
  - `lottie_gui.py` Qt GUI player (we don't need this).
- License: AGPL — **important**, see `16-licenses.md`. Means we can shell out to it as a CLI dependency, but we cannot link it into our Node process or copy code.
- Strategy: distribute it as an *optional plugin* with install instructions (`pip install lottie cairosvg pillow`). When present, our prompt template offers Claude a "write a python-lottie script that produces this animation" path.

## `bodymovin-python` (boringcactus)

- Repo: [boringcactus/bodymovin-python](https://github.com/boringcactus/bodymovin-python).
- Smaller, MIT-licensed. Dataclass-style Bodymovin object model, you compose and serialize.
- Pros: license-friendly, simple API.
- Cons: less coverage than python-lottie, fewer high-level animation helpers.
- Strategy: bundle as a default plugin since the license allows.

## `bodymovin/lottie-api` (JS, browser-side)

- Repo: [bodymovin/lottie-api](https://github.com/bodymovin/lottie-api).
- Lets you mutate a *running* lottie-web instance — set property values, retrieve property paths.
- Use case in `open-lottie-ui`: hot-tweak the preview (e.g., live color picker) before committing.

## `dotlottie-js`

- Repo: [LottieFiles/dotlottie-js](https://github.com/LottieFiles/dotlottie-js).
- Programmatic creation/inspection of `.lottie` containers. Read animations, add themes, write packages.
- Used for **export**, not for authoring animation content.

## Glaxnimate Python API

- Glaxnimate exposes a Python scripting API — you can run a Python file that builds an animation and saves to Lottie. Less ergonomic than python-lottie but useful if you already have the Glaxnimate object model in your head.

## Hand-rolled programmatic patterns

Sometimes the fastest path is to skip frameworks entirely and write a small JS helper that emits the Lottie JSON our prompt expects. For very simple animations (a fade-in, a single tween, a counter), a 50-line generator is more reliable than asking the LLM for raw JSON every time.

We'll capture these as **prompt-side templates** (see `10-prompting-lottie.md`): "use this scaffold and only change the values".

## Decision for `open-lottie-ui`

Three generation paths, in order of reliability:

1. **Template + parameter substitution.** For common patterns (fade-in, draw-on, color-pulse) we ship JSON templates. Claude fills in parameters; we substitute.
2. **`bodymovin-python` script generation.** Claude writes a short Python script using `bodymovin-python`'s dataclasses; we run it; capture the JSON output.
3. **Raw JSON from Claude.** Last resort, schema-grounded, validator-gated, retry-on-fail. Reserved for genuinely novel asks.

`python-lottie` is offered as an opt-in plugin for users who install it (gives access to the high-level animation helpers like draw-on / IK).

## Sources

- [Python Lottie on PyPI](https://pypi.org/project/lottie/)
- [python-lottie docs (mattbas / GitLab)](https://mattbas.gitlab.io/python-lottie/)
- [boringcactus/bodymovin-python](https://github.com/boringcactus/bodymovin-python)
- [bodymovin/lottie-api](https://github.com/bodymovin/lottie-api)
- [LottieFiles/dotlottie-js](https://github.com/LottieFiles/dotlottie-js)
- [Glaxnimate scripting docs](https://glaxnimate.org/contributing/scripting/)
