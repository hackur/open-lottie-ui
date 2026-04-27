# Research 11 — Next.js 15 patterns for a local-only admin

We're building a *local* admin tool, not a public web app. That changes the prescription on a lot of usual Next.js advice.

## Why Next.js (and not just Vite + Express)

Pros for our use case:

- **Server actions** make "click this button → run this server-side code" trivial without writing API routes.
- **Streaming responses** (App Router + Suspense + ReadableStream) are exactly what we need to surface live Claude CLI output to the browser.
- **File-system routing** keeps the project structure intuitive for contributors.
- **shadcn/ui + Tailwind** ecosystem assumes Next.js as the path of least resistance.
- **Built-in production build** (`next build`) gives users a one-command deploy if they want to host on a NAS or Pi.

Cons / things we don't need:

- We don't need SSG / ISR / image optimization. We're a localhost app.
- We don't need middleware auth (it's *your* machine).
- We don't need edge runtime — everything must run on the Node runtime to spawn child processes and access the file system.

## Versioning

Next.js 15 / React 19 is the floor. The dashboard ecosystem (`shadcn/ui`, TanStack Table v8, Tailwind v4) has all moved to React 19.

## Project layout (App Router)

```
apps/admin/
├── app/
│   ├── layout.tsx                        # root layout (sidebar shell)
│   ├── page.tsx                          # dashboard / library home
│   ├── library/
│   │   ├── page.tsx                      # grid of all animations
│   │   └── [id]/page.tsx                 # detail view + preview
│   ├── generate/
│   │   ├── page.tsx                      # prompt form
│   │   └── actions.ts                    # server actions (kick off Claude)
│   ├── review/
│   │   ├── page.tsx                      # pending generations queue
│   │   └── [id]/page.tsx                 # side-by-side review UI
│   ├── plugins/
│   │   ├── page.tsx                      # plugin registry
│   │   └── [id]/run/route.ts             # POST to invoke a plugin
│   └── api/
│       ├── stream/[id]/route.ts          # SSE: live tokens of a running gen
│       └── render/[id]/[frame]/route.ts  # serve a rendered PNG frame
├── components/
│   ├── ui/                               # shadcn primitives
│   ├── lottie-preview.tsx                # lottie-react wrapper
│   ├── dotlottie-preview.tsx             # dotlottie-react wrapper
│   ├── side-by-side-review.tsx
│   └── prompt-form.tsx
├── lib/
│   ├── store/                            # FS-backed data layer (no DB)
│   ├── claude/                           # Claude CLI driver
│   ├── lottie/                           # validate / optimize / render helpers
│   └── plugins/                          # plugin manifest loader & runner
└── next.config.ts
```

Colocation principle: each route folder owns its server actions and components; shared UI/hooks live at the top level. ([2026 shadcn/Next.js guide pattern](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/).)

## Important configuration choices

1. **Force Node runtime everywhere**:
   ```ts
   // app/api/.../route.ts
   export const runtime = "nodejs";
   export const dynamic = "force-dynamic";
   ```
   We need `child_process`, `fs.promises`, and we never want SSE responses cached.
2. **Disable static optimization on dynamic pages** with `dynamic = "force-dynamic"` so the file-system view is fresh per nav.
3. **Limit `experimental.serverActions.bodySizeLimit`** thoughtfully — Lottie files can be a few MB, default 1 MB will reject uploads. Bump to 25 MB.
4. **Bind to 127.0.0.1 by default**, not 0.0.0.0. Local-only by intent. Document a flag for LAN access.
5. **No telemetry**: `NEXT_TELEMETRY_DISABLED=1` in our `.env.example`.

## State management

- **No client-side state library** for v1. Server components + form actions + a small zustand store for ephemeral UI state (drawer open, current preview frame).
- **All persistent state is files on disk.** A 200-line `lib/store/` module that wraps `fs.promises` is enough.
- **TanStack Query** for client-side caching of plugin lists and library scans (long-lived, optionally auto-revalidating).
- **Server actions** for mutations; `revalidatePath` on the affected route after.

## UI kit

- **shadcn/ui** as the component layer. Copy components into `components/ui/`; no runtime dep.
- **Radix primitives** for everything that needs accessibility/keyboard nav (Dialog, Popover, Combobox).
- **Tailwind v4** with a single dark/light theme switch.
- **TanStack Table v8** for the library grid (sorting, filtering, virtualized rows).
- **Sonner** for toast notifications.
- **react-hook-form** + zod for the generate form.

## Dev mode considerations

- The admin is launched with `pnpm dev` and served on `:3000`. We document `pnpm start` (production build) for daily use.
- Hot-reload is fine; long-running Claude CLI processes survive an HMR (we manage them in a module-scope `Map`).

## Auth

- v1: none. Local-only.
- v2 (if we ever do LAN): a simple "set a password on first run, store hashed in `~/.config/open-lottie-ui/auth.json`" pattern; basic-auth middleware. Documented later, not built.

## Sources

- [Next.js 15 release notes](https://nextjs.org/blog/next-15)
- [Next.js streaming guide](https://nextjs.org/docs/app/guides/streaming)
- [Next.js loading.js + Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [Server Actions vs Route Handlers (dev.to)](https://dev.to/whoffagents/nextjs-15-server-actions-vs-route-handlers-when-to-use-each-i-got-this-wrong-for-3-months-49hm)
- [Vercel — Next.js & shadcn/ui Admin Dashboard Template](https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard)
- [Build an Admin Dashboard with shadcn/ui (AdminLTE 2026 guide)](https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/)
- [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
