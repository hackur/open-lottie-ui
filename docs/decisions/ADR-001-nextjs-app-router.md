# ADR-001 — Use Next.js 15 App Router (not Vite + Express)

## Context

We need a local web app for the admin. Two reasonable choices:

- **Next.js 15 App Router**: integrated framework, server components, server actions, file-system routing, built-in streaming.
- **Vite + React + Express**: lighter, more flexible, two processes (frontend + backend), more wiring.

Both are MIT, both are mainstream.

## Decision

Use Next.js 15 with the App Router. Force Node runtime everywhere (`runtime = "nodejs"`).

## Consequences

**Pros**

- Server actions handle "click → run server-side" without writing API routes.
- Streaming via Suspense + ReadableStream is exactly the SSE pattern we need.
- shadcn/ui ecosystem assumes Next.js; least friction.
- One process to run.
- Production build (`next build`) lets users self-host on a NAS / Pi if they want.

**Cons**

- Heavier than Vite + Express; more "framework" we have to live inside.
- Server actions and route handlers have subtly different runtime constraints; a few gotchas (`force-dynamic`, `runtime: "nodejs"`).
- Edge runtime is unusable for us (no `child_process`); easy mistake to make.

**Mitigations**

- A small `next.config.ts` override sets sensible defaults.
- Lint rule (custom) flags any `runtime = "edge"` in our routes.
- Docs spell out the constraints for contributors.

## Status

Accepted, M0.

## Sources

- [`research/11-nextjs-admin.md`](../research/11-nextjs-admin.md)
- [`research/12-process-management.md`](../research/12-process-management.md)
