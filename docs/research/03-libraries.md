# Research 03 — Free Lottie animation libraries & marketplaces

The admin needs to surface "browse free animations" as a built-in source so users get value before they generate anything. Here's what's out there, with **license-first** notes (full analysis in `16-licenses.md`).

## Tier 1 — usable, commercial-friendly, scriptable

### LottieFiles "Free" / "Public" animations

- URL: [lottiefiles.com/featured](https://lottiefiles.com/featured), free filter.
- License: **Lottie Simple License** ([lottiefiles.com/page/license](https://lottiefiles.com/page/license)). Permissive — download / reproduce / modify / publish / commercial use allowed. **Attribution not required**, but appreciated. Modifications must be shared under the same license (copyleft on derivatives of the file).
- **Important catch:** the license forbids "compiling files from LottieFiles to replicate or develop a similar or competing service." Our admin is an *organizer/editor*, not a competitor — but we should not bulk-mirror their library. We surface their search via their public site / API and link out, or we let users opt in to local downloads of individual files.
- Distribution: per-file download, GIF / MP4 / JSON / `.lottie`.
- Strategy: a "LottieFiles browse" plugin that uses the public site (or any future official API) and downloads on-demand into the user's library. We **do not ship** their files in our repo.

### Lordicon free tier

- 25,000+ animated icons, ~600 free with attribution requirement.
- License: free icons require crediting Lordicon; cannot be resold / sublicensed; PRO removes attribution.
- Strategy: link out, single-file import per icon; show the attribution requirement prominently in the import UI.

### Iconscout free Lottie packs

- URL: [iconscout.com/free-lottie-animation-packs](https://iconscout.com/free-lottie-animation-packs).
- License varies per uploader (crowdsourced). User must check each pack's license.
- Strategy: link out, capture the license string into the file's metadata at import time so the user is reminded later.

### useAnimations

- URL: [useanimations.com](https://useanimations.com/).
- 100+ animated icons, free with **mandatory attribution** to useanimations.com.
- License: see [useanimations.com/licencing-and-terms.html](https://useanimations.com/licencing-and-terms.html).
- Strategy: link out, import per-icon, store attribution string in metadata.

## Tier 2 — open source, ship-with-the-app candidates

### awesome-lottie (LottieFiles)

- Repo: [LottieFiles/awesome-lottie](https://github.com/LottieFiles/awesome-lottie).
- Curated list of bookmarks/libraries/tools. Not animations per se; useful to seed our community resources doc (see `19-community.md`).

### `lottie-react` sample animations

- The `lottie-react` repo and Storybook ship a handful of demo animations. MIT.
- Strategy: ship 5–10 of these as the **default seed library** so the admin has *something* to render the first time you open it.

### GitHub `lottie-animation` topic

- Topic page: [github.com/topics/lottie-animation](https://github.com/topics/lottie-animation).
- Many small repos with sample `.json` files. Per-repo license check required.

### Lottie Animation Community samples

- [lottie.github.io](https://lottie.github.io/) — LAC site, links to the spec and sample files used for conformance testing. CC-licensed where attributed.

## Tier 3 — proprietary, document-only

- Lottielab gallery (web tool, paid).
- IconScout PRO.
- MotionElements.
- Envato.

We do not integrate these directly; users can drag-drop downloaded files in, and the metadata / license field captures whatever they paste.

## Implementation in `open-lottie-ui`

A "Sources" tab in the sidebar lists configured sources:

- **Local** (always; the user's `library/` directory).
- **Bundled samples** (5–10 MIT-licensed seeds shipped in-repo).
- **External (web)** plugins per source: LottieFiles search, Lordicon browse, useAnimations browse, Iconscout — each implemented as a small plugin module that opens the site in an embedded webview / new window and handles import-on-click.
- **Custom URL / drag-drop** — paste any .json / .lottie URL, or drag from desktop.

Every imported file gets metadata stamped: `source`, `license`, `attribution`, `imported_at`. The export-to-bundle flow checks all included files' licenses and warns on incompatibilities.

## Sources

- [Lottie Simple License](https://lottiefiles.com/page/license)
- [LottieFiles — Commercial Use & Attribution](https://help.lottiefiles.com/hc/en-us/articles/45243303062681-Commercial-Use-Attribution)
- [LottieFiles — Animation Licensing Basics](https://help.lottiefiles.com/animation-licensing-basics-)
- [LottieFiles Terms](https://lottiefiles.com/page/terms-and-conditions)
- [useAnimations licensing](https://useanimations.com/licencing-and-terms.html)
- [Lordicon licenses](https://lordicon.com/licenses)
- [Lordicon free license](https://lordicon.com/docs/license/free)
- [IconScout free Lottie packs](https://iconscout.com/free-lottie-animation-packs)
- [LottieFiles/awesome-lottie](https://github.com/LottieFiles/awesome-lottie)
- ["10 Best Free Lottie Animation Libraries (Commercial Use)" — moonb.io](https://www.moonb.io/blog/free-lottie-animations)
