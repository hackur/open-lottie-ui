# Research 12 — Long-lived child processes from Next.js

Claude CLI invocations take 10s–60s+. We need to spawn them, stream output to the browser live, allow cancellation, and survive page navigations.

## The shape of the problem

- A user submits a prompt → server action returns a `generationId` immediately.
- The browser navigates to `/review/{generationId}` (or stays on the form with a panel open).
- The browser opens an SSE connection to `/api/stream/{generationId}`.
- The server has been spawning the Claude CLI in the background since the action fired; the SSE handler subscribes to its output.

This is two pieces:

1. A **process registry**: a Node module-scope `Map<id, RunningGeneration>` that holds the child process, its accumulated output, and a list of subscribers.
2. An **SSE route handler** that subscribes a browser client to a registry entry.

## Process registry sketch

```ts
// lib/claude/registry.ts
import type { ChildProcess } from "node:child_process";

export type RunningGeneration = {
  id: string;
  child: ChildProcess;
  status: "running" | "done" | "error" | "cancelled";
  exitCode: number | null;
  buffer: string[];                    // ndjson lines as they arrive
  subscribers: Set<(line: string) => void>;
  startedAt: number;
  endedAt: number | null;
};

const registry = new Map<string, RunningGeneration>();

export function start(id: string, child: ChildProcess) { /* ... */ }
export function get(id: string) { return registry.get(id); }
export function subscribe(id: string, fn: (line: string) => void) { /* ... */ }
export function cancel(id: string) { /* sends SIGTERM */ }
```

Notes:

- Module-scope registries survive Next.js HMR in dev (the module is hot-reloaded, but our wrapper preserves the Map across reloads via `globalThis`).
- On graceful shutdown we kill all running children.
- Buffer is capped — we keep the last N MB and a "result" message; for very long runs we spill to disk under `.cache/streams/{id}.ndjson`.

## SSE route handler

```ts
// app/api/stream/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      // 1. Replay anything that already happened.
      const gen = registry.get(params.id);
      if (!gen) {
        controller.enqueue(enc.encode("event: error\ndata: not-found\n\n"));
        controller.close();
        return;
      }
      for (const line of gen.buffer) {
        controller.enqueue(enc.encode(`data: ${line}\n\n`));
      }

      // 2. Subscribe to live updates.
      const unsubscribe = registry.subscribe(params.id, (line) => {
        controller.enqueue(enc.encode(`data: ${line}\n\n`));
      });

      // 3. End the stream when the generation finishes.
      const onEnd = () => { unsubscribe(); controller.close(); };
      if (gen.status !== "running") onEnd();
      else gen.child.once("close", onEnd);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",      // disable nginx buffering if reverse-proxied
    },
  });
}
```

Critical gotchas (from the [Vercel discussion #48427](https://github.com/vercel/next.js/discussions/48427) and [issue #9965](https://github.com/vercel/next.js/issues/9965)):

- **`runtime = "nodejs"` is mandatory** — edge runtime can't keep a streaming response open or spawn processes.
- **`dynamic = "force-dynamic"`** prevents Next from trying to statically optimize the route.
- **Don't `await` inside `start()`** before returning the stream — return the response promptly and write to the controller from the spawned child's event handlers.
- **Don't deploy to Vercel/Netlify serverless** — long-lived SSE doesn't work there. (Fine; we're local-only.)

## Server action that kicks things off

```ts
// app/generate/actions.ts
"use server";
import { spawn } from "node:child_process";
import { nanoid } from "nanoid";
import { registry } from "@/lib/claude/registry";
import { revalidatePath } from "next/cache";

export async function startGeneration(formData: FormData) {
  const prompt = String(formData.get("prompt"));
  const id = nanoid(10);

  const child = spawn("claude", [
    "-p", prompt,
    "--system-prompt", await loadSystemPrompt(),
    "--output-format", "stream-json",
    "--verbose",
    "--model", "claude-opus-4-7",
    "--permission-mode", "bypassPermissions",
    "--disallowed-tools", "Bash,Edit,Write",
  ], { cwd: sandboxDir(id) });

  registry.start(id, child);
  revalidatePath("/review");
  return { id };
}
```

The action returns immediately with the id; the browser navigates to `/review/{id}` which subscribes to the SSE stream.

## Cancellation

A "Cancel" button posts to a tiny route that calls `registry.cancel(id)` → `child.kill("SIGTERM")` → CLI cleans up → `close` event fires → registry transitions to `cancelled` → SSE closes.

## Concurrency limits

- One generation per user is the default UX. The button is disabled while one is running for that user.
- We allow concurrent generations across different requests (e.g., a batch screen) but cap to N (default 3) via a simple semaphore in the registry. Otherwise a "regenerate everything" sweep could fork-bomb Claude CLI.

## Persistence across server restarts

- Running children **die** when the Next dev server restarts. We accept this for v1; a generation in flight at restart is marked `cancelled` and the user can retry.
- All *completed* generations live in `generations/{id}/` so restart loses no committed data.

## Sources

- [Next.js streaming guide](https://nextjs.org/docs/app/guides/streaming)
- [Implementing SSE in Node.js with Next.js (Medium)](https://medium.com/@ammarbinshakir557/implementing-server-sent-events-sse-in-node-js-with-next-js-a-complete-guide-1adcdcb814fd)
- [SSE for real-time notifications in Next.js (Pedro Alonso)](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/)
- [Streaming LLM responses with SSE in Next.js (Upstash)](https://upstash.com/blog/sse-streaming-llm-responses)
- [Streaming in Next.js 15: WebSockets vs SSE (HackerNoon)](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events)
- [SSE don't work in Next API routes — discussion #48427](https://github.com/vercel/next.js/discussions/48427)
- [SSE issue #9965](https://github.com/vercel/next.js/issues/9965)
- [Long-running tasks with Next.js (dev.to)](https://dev.to/bardaq/long-running-tasks-with-nextjs-a-journey-of-reinventing-the-wheel-1cjg)
- [Start a child process from Next.js API (Marcilhacy)](https://medium.com/@gmarcilhacy/start-a-child-process-from-next-js-api-f55026ad0b1b)
