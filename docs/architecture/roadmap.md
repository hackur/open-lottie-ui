# Roadmap & milestones

Calendar-week granularity. Each milestone has a demo that proves it.

## M0 — Research & planning ✅ done

- All of `docs/` landed (19 research notes, 8 ADRs, architecture set).
- ADRs locked. ADR-008 captures the M1 defaults committed without a live brainstorm.

**Demo:** doc walk-through. Decisions are explicit and traceable.

## M1 — MVP ✅ shipped (2026-05)

Per `architecture/mvp.md`. End-to-end: library → generate → review → approve → export. Plus a number of M3 items pulled forward behind feature flags: Glaxnimate roundtrip, python-lottie optimize, ffmpeg video export, video import, URL-paste import.

**Status:** library at ~284 entries; Tier-1 and Tier-3 generation both live; activity log + debug surface shipped; feature flags wired through `/settings`.

**Demo:** the script in `mvp.md` §"Demo script."

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
Apr 27 ───── M0  research & planning      [done]
Apr 28 – May 11 M1  MVP                   [done — shipped on schedule]
May 12+        M2  plugin loader + diff + remix + variants  [next]
later          M3  power plugins + theming + external sources
later          M4  polish + 0.1 release
later          M5  beyond
```

These are *targets*, not commitments. M1 shipped on schedule (the LLM angle works: Tier-3 with a 60s silence watchdog + transcript diagnosis is reliable enough to ship). Highest remaining schedule risk is **M3** (community CLIs being usable from Node; `dotlottie-rs` does not ship a CLI today, so that plugin is blocked upstream).

## What slipping looks like

- ~~**M1 slips a week** if Claude's Lottie reliability is below 50% even with templates → we cut Tier 3 and ship Tier 1 + Tier 2 only.~~ Did not slip; Tier 3 ships, Tier 2 (Python script) was deferred to M2.
- **M2 slips two weeks** if the plugin manifest needs a v2 mid-build → we ship hardcoded plugins for M2 and revisit manifests in M3. (Note: M1 already hardcodes the actions per ADR-008, so M2's task is purely "extract to loader".)
- **M3 slips arbitrarily** if `python-lottie` or `glaxnimate` integrations have install pain we can't smooth over. Mitigated: both shipped in M1 behind feature flags, and Glaxnimate auto-detects `/Applications/glaxnimate.app/...`.

## Decision points

| Date | Decision |
|---|---|
| End of M0 | Final MVP feature cut. |
| End of M1 | Continue or pivot? Based on R1 (Claude reliability). |
| End of M2 | Manifest v1 frozen for community plugins. |
| End of M3 | 0.1 release-blocking issue list. |
| End of M4 | Public release. |
