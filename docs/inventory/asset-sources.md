# Inventory — Free / open Lottie asset sources

Detailed table consolidating `research/03-libraries.md` and `research/16-licenses.md` for at-a-glance reference. **Always re-read the source's terms before relying on this.**

## Sources we integrate as plugins

| Source | URL | License | Commercial | Attrib | API/scraping | Status |
|---|---|---|---|---|---|---|
| LottieFiles "free" | [lottiefiles.com/featured](https://lottiefiles.com/featured) | Lottie Simple | yes | optional | public site, per-file download | tier-1 plugin |
| Lordicon free tier | [lordicon.com](https://lordicon.com/) | Lordicon free | yes | required | per-file download | plugin |
| useAnimations | [useanimations.com](https://useanimations.com/) | useAnimations free | yes | required | per-file download | plugin |
| Iconscout free packs | [iconscout.com/free-lottie-animation-packs](https://iconscout.com/free-lottie-animation-packs) | varies per pack | varies | varies | per-file, license-aware import | plugin |
| Lottie Animation Community samples | [lottie.github.io](https://lottie.github.io/) + [github.com/lottie/lottie-spec](https://github.com/lottie/lottie-spec) | typically CC-BY / CC0 | yes | varies | git clone | bundled (small subset) |
| `lottie-react` examples | [github.com/LottieFiles/lottie-react](https://github.com/LottieFiles/lottie-react) | MIT | yes | no | git clone | bundled (small subset) |
| GitHub topic `lottie-animation` | [github.com/topics/lottie-animation](https://github.com/topics/lottie-animation) | varies per repo | varies | varies | clone, per-repo | manual import |

## Sources we link to but don't auto-import

| Source | Why not | Notes |
|---|---|---|
| LottieFiles Premium | proprietary | User can drag in downloaded files; license stays paid. |
| MotionElements | paid catalog | Same. |
| Envato | paid | Same. |
| Adobe Stock | paid + AE-centric | Same. |

## Per-file metadata captured at import

Stored as `library/{id}.meta.json`:

```jsonc
{
  "id": "burst-ok",
  "title": "OK Burst",
  "source": "lottiefiles",            // a known plugin id
  "source_url": "https://lottiefiles.com/animations/...",
  "license_id": "lottie-simple",      // looked up from a registry
  "license_url": "https://lottiefiles.com/page/license",
  "attribution_required": false,
  "attribution_text": null,
  "imported_at": "2026-04-27T14:00:00Z",
  "imported_by": "local-user",
  "tags": ["icon", "success", "checkmark"],
  "content_hash": "sha256:..."
}
```

## License registry

`packages/lottie-tools/licenses.json`:

```jsonc
{
  "lottie-simple": {
    "name": "Lottie Simple License",
    "url": "https://lottiefiles.com/page/license",
    "commercial": true,
    "attribution_required": false,
    "share_alike": true,
    "redistribute_collection": false
  },
  "useanimations-free": {
    "name": "useAnimations Free",
    "url": "https://useanimations.com/licencing-and-terms.html",
    "commercial": true,
    "attribution_required": true,
    "share_alike": false,
    "redistribute_collection": false
  },
  "lordicon-free": { /* ... */ },
  "MIT": { /* spdx */ },
  "CC0-1.0": { /* spdx */ },
  "CC-BY-4.0": { /* spdx */ }
}
```

## Compatibility matrix for export bundles

When the user exports a bundle (`.lottie` pack) of N items, we:

1. Collect all `license_id`s in the bundle.
2. Compute the most restrictive policy across them.
3. Generate a `LICENSES.md` listing each item + its license + attribution.
4. **Block** if any item has `redistribute_collection: false` and the bundle is being exported to share publicly (configurable).

The actual block is a confirmation dialog, not a hard error — final call is the user's, but they can't claim ignorance.

## What we ship in the seed library

A handful of MIT / CC0 files in `apps/admin/seed-library/`:

- `loader-spinner.json` (CC0, hand-made)
- `success-check.json` (CC0)
- `heart-like.json` (MIT, from `lottie-react` examples)
- `notification-bell.json` (CC0)
- 1–2 more small ones

Total under 200 KB. Lets the admin show *something* on first run.
