# Roadmap & milestones

Calendar-week granularity. Each milestone has a demo that proves it.

## M0 — Research & planning (this week)

- All of `docs/` lands.
- Brainstorm session with the user → MVP scope confirmed or adjusted.
- ADRs locked.

**Demo:** doc walk-through. Decisions are explicit and traceable.

## M1 — MVP (week 1 of build)

Per `architecture/mvp.md`. End-to-end: library → generate → review → approve → export.

**Demo:** the script in `mvp.md` §"Demo script."

**Stretch (if time permits in week 1):**
- Tier 1 templates with 3 templates (`color-pulse`, `fade-in`, `scale-bounce`).
- Library tag filter.

## M2 — Plugins, diff, remix (weeks 2–4)

Per `architecture/features.md` §M2. Headline:

- Plugin system (manifest + loader + 2 first-party plugins moved into the plugin tree).
- Visual diff toggle on review screen.
- Remix workflow (pick item → describe change → diff → approve).
- Variant batch ("give me 5") with strip-of-thumbnails review.
- Frame thumbnails carousel on library detail.

**Demo:** import an SVG, generate 5 animated variants, side-by-side compare with diff heatmap, approve one, export as `.lottie`.

## M3 — Power features (weeks 5–8)

Per `features.md` §M3. Headline:

- More first-party plugins: `glaxnimate-roundtrip`, `lottie-optimize`, `gif-export`, `mp4-export`, `dotlottie-render`, `python-lottie-helpers`.
- External-source plugins: `lottiefiles-browse`, `lordicon-browse`, `useanimations-browse`.
- Compatibility report: lottie-web vs dotlottie-web rendering deltas.
- Theme editor (LSS).
- Begin v2 dotLottie state-machine UI work (probably slips into M4).

**Demo:** import animation from LottieFiles, optimize, export as `.lottie` with two themes (light/dark).

## M4 — Polish + 0.1 release (weeks 9–10)

- Onboarding tour (first-run wizard).
- Keyboard shortcut help screen.
- Settings polish (paths, model defaults, theme).
- Docs site (built off this `docs/` tree).
- Sample library bundle release.
- Tag the 0.1.0 release; cut a release notes blog.

**Demo:** post on HN / r/webdev. Public 0.1 release.

## M5+ — Beyond v1

Per `features.md` §Later:

- CI integration (`open-lottie-ui ci validate <files>`).
- Auth + LAN mode.
- Hosted "team" deployment.
- Inline property editing.
- Tauri desktop bundle.

## Calendar overview

```
Apr 27 (today) ───── M0  research & planning
May 4         ───── M1  MVP starts
May 11        ───── M1  done (target)
May 18 ── Jun 1     M2  plugins + diff + remix + variants
Jun 8 ── Jun 22     M3  power plugins + theming
Jun 29 ── Jul 6     M4  polish + 0.1 release
Jul+                M5  beyond
```

These are *targets*, not commitments. The two milestones with the highest schedule risk are **M1 (proves the LLM angle works)** and **M3 (depends on community CLIs being usable from Node)**.

## What slipping looks like

- **M1 slips a week** if Claude's Lottie reliability is below 50 % even with templates → we cut Tier 3 and ship Tier 1 + Tier 2 only.
- **M2 slips two weeks** if the plugin manifest needs a v2 mid-build → we ship hardcoded plugins for M2 and revisit manifests in M3.
- **M3 slips arbitrarily** if `python-lottie` or `glaxnimate` integrations have install pain we can't smooth over → we punt those plugins to "community-contributed" and ship the Node-only plugins for M3.

## Decision points

| Date | Decision |
|---|---|
| End of M0 | Final MVP feature cut. |
| End of M1 | Continue or pivot? Based on R1 (Claude reliability). |
| End of M2 | Manifest v1 frozen for community plugins. |
| End of M3 | 0.1 release-blocking issue list. |
| End of M4 | Public release. |
