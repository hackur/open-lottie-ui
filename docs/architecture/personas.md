# Personas & jobs-to-be-done

Four personas guide our design choices. When in doubt, optimize for **Devon** first, **Mira** second.

## Devon — Indie product engineer

- **Background**: full-stack dev, ships SaaS. Comfortable in a terminal. Uses Claude Code daily.
- **Tools today**: VS Code, lottie-react, occasionally drops into LottieFiles to grab a free animation.
- **Pain**: every Lottie change means hand-editing JSON or paying a designer; can't iterate fast on motion.
- **Top jobs**:
  1. *"Generate a loading animation that matches our brand teal."*
  2. *"Take this animation I downloaded and slow it down + loop seamlessly."*
  3. *"Export the final as a small `.lottie`."*
- **What they need from us**: keyboard-driven flow, no auth ceremony, runs in the same terminal as Claude Code, exports they can drop into Next.js.

## Mira — Solo product designer

- **Background**: 6 yrs at agencies; designs in Figma. Some After Effects. Doesn't write code.
- **Tools today**: Figma, occasionally Bodymovin, Lottielab paid plan.
- **Pain**: After Effects is overkill for small interactions; Bodymovin export is finicky; Lottielab is great but cloud-only and her clients want files.
- **Top jobs**:
  1. *"I have an SVG icon in Figma — turn it into an animated Lottie that draws on then loops a subtle pulse."*
  2. *"Make me 5 variants of this loader — different colors, different easing — pick one."*
  3. *"Hand the dev a `.lottie` they can drop into the app."*
- **What they need**: an actual UI (not a CLI), drag-drop, side-by-side variant comparison, Figma → Lottie path, a clear "ready to ship" export button.

## Sam — Frontend lead at a small team

- **Background**: 8 yrs frontend. Owns the design-system. Wants the team to use Lottie for micro-interactions.
- **Tools today**: their internal Storybook, Figma, ad-hoc Lottie files.
- **Pain**: no shared library; designers send `.json` over Slack; no review process; performance unknowns.
- **Top jobs**:
  1. *"Maintain a shared, version-controlled Lottie library for the team."*
  2. *"Audit each animation: size, render perf, dotlottie-web compatibility."*
  3. *"Plug it into our CI: validate every PR's Lottie changes."*
- **What they need**: file-based storage that works in git, plugin to validate / report on PRs (v2), audit log of who approved what.

## Aria — OSS maintainer building animated docs

- **Background**: maintains a popular OSS framework. Wants animated examples on the docs site.
- **Tools today**: hand-written CSS, Lottie occasionally.
- **Pain**: making 20 small animations consistently is tedious; can't justify subscription tools.
- **Top jobs**:
  1. *"Generate 20 small consistent micro-animations from prompts."*
  2. *"Bundle them into one `.lottie` to ship with the docs."*
  3. *"All MIT/CC0 — no licensing surprises in my repo."*
- **What they need**: bulk-generate workflow, license clarity for outputs, low cost per generation, no SaaS lock-in.

## Implications for design

- **Keyboard shortcuts and CLI are first-class**, not an after-thought (Devon, Aria).
- **Drag-drop and visual side-by-side are first-class** (Mira, Sam).
- **File-system storage** matters to all four — none of them want a hosted DB.
- **License metadata** matters most to Sam and Aria.
- **Cost visibility** matters to Aria most; should be unobtrusive.
- **Variant generation** is a Mira-driven feature ("give me 5 versions") — bumps it from "nice" to "MVP-adjacent."

## Anti-personas (we explicitly do not target)

- **Enterprise creative team with 50 designers and a procurement process.** Lottielab/LottieFiles enterprise serves them.
- **Mobile-only app developer** with no desktop machine. Out of scope; we're a desktop admin.
- **Non-technical end-user** with no Node/install background. Future packaging (Tauri/desktop) might address this; v1 expects `pnpm dev`.
