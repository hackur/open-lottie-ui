# ADR-005 — `.lottie` is the canonical export format

## Context

Library items live as raw `.json` on disk because that's the most diff-friendly form. But when the user "exports", we have to pick between `.json` and `.lottie`.

## Decision

The default Export action produces a `.lottie` file. Raw `.json` is available via "Export as JSON" (advanced submenu).

## Consequences

**Pros**

- 50–80 % smaller — better defaults are good defaults.
- Bundles themes + (future) state machines + multi-animation in one file.
- It's where the ecosystem is heading; LottieFiles' modern player consumes it natively.

**Cons**

- Users who only know `.json` might be confused.
- `.lottie` is a ZIP — slightly opaque; not as inspectable as raw JSON.

**Mitigations**

- Tooltip on the export button explains what `.lottie` is and why.
- "Export as JSON" stays one menu away.
- The library item's detail page shows both the source `.json` (always) and a "packed `.lottie`" preview if the user has built one.

## Status

Accepted, M1.

## Sources

- [`research/04-dotlottie.md`](../research/04-dotlottie.md)
