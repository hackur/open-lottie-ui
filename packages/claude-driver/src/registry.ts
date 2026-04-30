import { generate } from "./generate.ts";
import type { DriverEvent, GenerateOptions, RegisteredProcess } from "./types.ts";

export type { RegisteredProcess } from "./types.ts";

/**
 * Process registry — pinned to `globalThis` so it survives Next.js HMR
 * (the module is hot-reloaded but the Map is preserved across reloads).
 *
 * See `docs/research/12-process-management.md` for the full rationale.
 */
const KEY = Symbol.for("open-lottie.processRegistry");
type Registry = Map<string, RegisteredProcess>;
type GlobalWithRegistry = typeof globalThis & { [KEY]?: Registry };
const g = globalThis as GlobalWithRegistry;
export const processRegistry: Registry = (g[KEY] ??= new Map<string, RegisteredProcess>());

/**
 * Spawn a generation and register it under `id`. Returns the registry entry.
 *
 * The registry tees the live event stream into a shared `buffer` so any number
 * of late SSE subscribers can replay everything that has happened so far AND
 * receive new events as they arrive. Each consumer maintains its own cursor
 * into the buffer; there is no per-subscriber queue, which avoids the
 * duplicate-event race that existed when a subscriber registered while the
 * producer was still pushing into both buffer and queue simultaneously.
 */
export function startRegistered(id: string, opts: GenerateOptions): RegisteredProcess {
  const handle = generate(opts);
  const buffer: DriverEvent[] = [];
  const wakers = new Set<() => void>();
  const stoppedRef = { value: false };

  const entry: RegisteredProcess = {
    id,
    child: handle.child,
    kill: async (killOpts) => {
      try {
        await handle.kill(killOpts);
      } finally {
        processRegistry.delete(id);
      }
    },
    startedAt: Date.now(),
    status: "running",
    buffer,
    events: replayThenLive(buffer, wakers, stoppedRef),
  };

  processRegistry.set(id, entry);

  const startedAt = Date.now();
  const log = (msg: string, extra?: unknown) => {
    const ms = Date.now() - startedAt;
    if (extra !== undefined) {
      console.log(`[claude-driver ${id} +${ms}ms] ${msg}`, extra);
    } else {
      console.log(`[claude-driver ${id} +${ms}ms] ${msg}`);
    }
  };

  log("started", { model: opts.model, cwd: opts.cwd, promptPreview: opts.prompt.slice(0, 80) });

  // Drain the underlying generator into the shared buffer and wake any
  // subscribers. We never push events into per-subscriber queues — consumers
  // poll `buffer` via cursors and rely on the wake fanout.
  (async () => {
    try {
      for await (const ev of handle.events) {
        buffer.push(ev);
        const summary =
          ev.kind === "text" ? `text(${ev.text.length} chars)`
          : ev.kind === "tool_use" ? `tool_use(${ev.tool})`
          : ev.kind === "result" ? `result(success=${ev.success}, cost=$${ev.costUsd.toFixed(4)}, turns=${ev.numTurns}, ${ev.durationMs}ms)`
          : ev.kind === "init" ? `init(${ev.sessionId})`
          : ev.kind === "error" ? `error(${ev.message})`
          : `raw`;
        log(summary);
        for (const wake of wakers) wake();
      }
    } finally {
      entry.status = "exited";
      stoppedRef.value = true;
      log("exited", { totalEvents: buffer.length });
      for (const wake of wakers) wake();
      wakers.clear();
    }
  })().catch((err) => {
    entry.status = "exited";
    stoppedRef.value = true;
    log("crashed", { error: err instanceof Error ? err.message : String(err) });
    for (const wake of wakers) wake();
  });

  return entry;
}

/**
 * Yield every event in `buffer` (replay) then any new events as they arrive,
 * until `stopped.value` is true and the cursor reaches the buffer's end.
 *
 * Each call returns a fresh iterator with its own cursor — no queue, no
 * race. Subscribers register a `wake` callback so they get nudged when new
 * events land, but the only source of truth is `buffer`.
 */
function replayThenLive(
  buffer: DriverEvent[],
  wakers: Set<() => void>,
  stopped: { value: boolean },
): AsyncIterable<DriverEvent> {
  return {
    [Symbol.asyncIterator]() {
      let cursor = 0;
      let resolve: (() => void) | null = null;

      const wake = () => {
        if (resolve) {
          const r = resolve;
          resolve = null;
          r();
        }
      };
      wakers.add(wake);

      const cleanup = () => wakers.delete(wake);

      return {
        async next(): Promise<IteratorResult<DriverEvent>> {
          while (true) {
            if (cursor < buffer.length) {
              return { value: buffer[cursor++]!, done: false };
            }
            if (stopped.value) {
              cleanup();
              return { value: undefined as unknown as DriverEvent, done: true };
            }
            await new Promise<void>((r) => {
              resolve = r;
            });
          }
        },
        async return(): Promise<IteratorResult<DriverEvent>> {
          cleanup();
          return { value: undefined as unknown as DriverEvent, done: true };
        },
      };
    },
  };
}
