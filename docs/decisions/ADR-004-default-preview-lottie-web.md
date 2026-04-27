# ADR-004 — Default preview renderer is `lottie-web`; offer `dotlottie-web` as a side-by-side toggle

## Context

We have two viable browser players: `lottie-web` (Airbnb, the reference) and `dotlottie-web` (LottieFiles, modern WASM/ThorVG). They render most files identically, but diverge on text, expressions, and some advanced features.

Which do we use for previews?

## Decision

Default preview is **`lottie-web`** (via `lottie-react`). The detail page exposes a toggle to render the same animation in `dotlottie-web`. The grid uses `lottie-web` thumbnails.

## Consequences

**Pros**

- Users see the most-compatible rendering by default. What they see is what 95 % of the world will see.
- Headless render uses the same engine (lottie-web in puppeteer), so thumbnails and live previews are consistent.
- The toggle becomes a *feature* — "see how this renders in dotlottie-web" is a useful sanity check for production-bound animations.

**Cons**

- Larger bundle than dotlottie-web alone.
- Two renderer dependencies to keep updated.
- Slight UX: users targeting dotlottie-web in production might assume the default preview is wrong when it differs.

**Mitigations**

- A small "renderer:" label on previews (`lottie-web 5.x`) so the distinction is visible.
- Compatibility-report plugin (M3) flags features at risk between the two renderers.

## Status

Accepted, M1.

## Sources

- [`research/02-players.md`](../research/02-players.md)
