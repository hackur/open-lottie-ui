# ADR-006 — No auth in v1; bind to 127.0.0.1 only

## Context

This is a local admin. Should we have any auth at all?

## Decision

No auth in v1. Bind the dev/prod server to `127.0.0.1` by default. Document a flag (`HOST=0.0.0.0`) for users who want LAN access at their own risk.

## Consequences

**Pros**

- Zero install ceremony. `pnpm dev` and you're working.
- No password to forget.
- No session middleware to maintain.
- Matches the pattern of every other local dev tool (Storybook, Jupyter on localhost, Cursor's local servers).

**Cons**

- A user who exposes the port (intentionally or via mis-bind) gets a wide-open admin.
- "Multi-user team" mode is a different product.

**Mitigations**

- Default bind is loopback only. A user has to actively set `HOST=0.0.0.0`.
- README has a "deploying on a LAN" section that links to a v2 LAN auth recipe (basic-auth).
- The Settings page surfaces the current bind address so the user always knows.

## Status

Accepted, M1. Re-evaluate after M3 if the "team" use case shows up.
