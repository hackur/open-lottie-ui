# Research 16 — License compatibility

The project's default license is **MIT** (see `LICENSE`). For every dependency and asset source we plan to use, we need to confirm we can ship and distribute under MIT, or document the constraints if we can't.

## Code dependencies

| Dep | License | Compat with MIT app | Notes |
|-----|---------|---------------------|-------|
| `next` | MIT | ✅ | — |
| `react`, `react-dom` | MIT | ✅ | — |
| `tailwindcss` | MIT | ✅ | — |
| `shadcn/ui` (components copied in) | MIT | ✅ | We copy code, not depend. |
| `@radix-ui/*` | MIT | ✅ | — |
| `lottie-web` | MIT | ✅ | — |
| `lottie-react` | MIT | ✅ | — |
| `@lottiefiles/dotlottie-web` | MIT | ✅ | — |
| `@lottiefiles/dotlottie-react` | MIT | ✅ | — |
| `@lottiefiles/dotlottie-js` | MIT | ✅ | — |
| `dotlottie-rs` (CLI binary, optional) | MIT | ✅ | We shell out; no linking concerns. |
| `puppeteer` | Apache-2.0 | ✅ | — |
| `puppeteer-lottie` | MIT | ✅ | — |
| `pixelmatch` | ISC | ✅ | — |
| `odiff-bin` | MIT (wrapper) / native binary | ✅ | Binary distributed under MIT-like terms. |
| `ajv` (JSON Schema validator) | MIT | ✅ | — |
| `sharp` (image resize) | Apache-2.0 | ✅ | — |
| `nanoid` | MIT | ✅ | — |
| `zod` | MIT | ✅ | — |
| `react-hook-form` | MIT | ✅ | — |
| `@tanstack/react-table` | MIT | ✅ | — |
| `@tanstack/react-query` | MIT | ✅ | — |
| `sonner` | MIT | ✅ | — |
| `zustand` | MIT | ✅ | — |
| `bodymovin-python` | MIT | ✅ | Optional plugin; user installs. |
| **`python-lottie`** | **AGPL-3.0** | ⚠️ | Cannot bundle / link. **Must remain an opt-in CLI dependency**. We invoke as a subprocess; this is the standard "aggregation" interpretation. Document clearly. |
| **`Glaxnimate`** | **GPL-3.0** | ⚠️ | Same — invoke its CLI; do not link. Document. |
| `ffmpeg` | LGPL-2.1 / GPL-2.0 (depending on build) | ⚠️ | Same — invoke binary. Most installs are LGPL; some redistributions add GPL codecs. We only invoke, never link. |

### How we handle GPL/AGPL CLI tools

These are **plugins**, not core dependencies. The user installs them separately (we provide `brew`/`apt`/`pip` instructions). Our app shells out via `child_process`. The "aggregation" reading of GPL means our combined work isn't a derivative — both communities (GPL and FSF guidance) treat this as fine *as long as we don't link*.

We do this to give users the *option* of these powerful tools without forcing the project itself to inherit AGPL/GPL.

A plugin manifest declares its license; the UI shows a license badge so users know what they're installing.

## Asset source licenses

| Source | Default license | Permits commercial | Attribution required | Notes |
|--------|-----------------|--------------------|----------------------|-------|
| LottieFiles "free" | Lottie Simple License | yes | no (appreciated) | Derivatives must remain under same license. Cannot bulk-mirror to compete. |
| Lordicon free tier | Custom | yes (with attribution) | **yes** | Cannot resell. |
| useAnimations free | Custom | yes (with attribution) | **yes** | Visible link required. |
| Iconscout free | varies per uploader | varies | varies | Capture the per-asset license at import. |
| LottieFiles Premium | proprietary | yes (paid) | per terms | Out of scope. |
| GitHub topic `lottie-animation` | varies (often MIT/CC0/CC-BY) | varies | varies | Capture per-repo. |
| LAC sample animations | typically CC-BY | yes | yes | Used in spec conformance. |

### Implementation: per-file license metadata

Every imported file gets stored alongside a sidecar JSON:

```jsonc
// library/{id}.meta.json
{
  "id": "intro-burst",
  "source": "lottiefiles",
  "source_url": "https://lottiefiles.com/...",
  "license": "lottie-simple",
  "license_text_url": "https://lottiefiles.com/page/license",
  "attribution": null,
  "imported_at": "2026-04-27T14:00:00Z",
  "tags": [...]
}
```

When the user **exports a bundle** (`.lottie` pack of selected items), the export step:

1. Aggregates all licenses involved.
2. Generates a `LICENSES.md` to include in the bundle.
3. Warns if any included files are non-redistributable.

## Bundled seed library

The few Lottie files we ship in the repo as defaults must be MIT/CC0/CC-BY 4.0. We use:

- The `lottie-react` package's example animation (MIT, [github.com/LottieFiles/lottie-react](https://github.com/LottieFiles/lottie-react)).
- A handful of CC0 LAC conformance samples.
- Original animations we generate ourselves (CC0).

Total: 5–10 small files.

## Decision: project license

Stay on **MIT** for the application code. The dependency graph is overwhelmingly MIT/Apache/ISC. The two GPL/AGPL bits (`python-lottie`, `Glaxnimate`) are plugins invoked as binaries and stay out of the licensing scope of the application.

## Sources

- [Lottie Simple License](https://lottiefiles.com/page/license)
- [LottieFiles Terms](https://lottiefiles.com/page/terms-and-conditions)
- [useAnimations licensing](https://useanimations.com/licencing-and-terms.html)
- [Lordicon licenses](https://lordicon.com/licenses)
- [python-lottie license (GitLab)](https://gitlab.com/mattbas/python-lottie/-/blob/master/LICENSE) (AGPL-3.0)
- [Glaxnimate license](https://github.com/KDE/glaxnimate/blob/master/LICENSE) (GPL-3.0)
- [GNU FAQ: aggregation vs derivative work](https://www.gnu.org/licenses/gpl-faq.html#MereAggregation)
