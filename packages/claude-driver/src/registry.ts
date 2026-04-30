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
 * The registry tees the live event stream into a `buffer` so late SSE
 * subscribers can replay everything that has happened so far. The original
 * `events` iterable on the entry is the buffered replay + live tail; the
 * underlying generator is consumed exactly once by this function.
 */
export function startRegistered(id: string, opts: GenerateOptions): RegisteredProcess {
  const handle = generate(opts);
  const buffer: DriverEvent[] = [];
  const subscribers = new Set<(ev: DriverEvent) => void>();

  const entry: RegisteredProcess = {
    id,
    child: handle.child,
    kill: () => {
      handle.kill();
      processRegistry.delete(id);
    },
    startedAt: Date.now(),
    status: "running",
    buffer,
    events: replayThenLive(buffer, subscribers),
  };

  processRegistry.set(id, entry);

  // Drain the underlying generator into buffer + subscribers.
  (async () => {
    try {
      for await (const ev of handle.events) {
        buffer.push(ev);
        for (const fn of subscribers) fn(ev);
      }
    } finally {
      entry.status = "exited";
      // Sentinel `null` to wake up replay-then-live consumers.
      for (const fn of subscribers) fn(EXIT_SENTINEL as unknown as DriverEvent);
      subscribers.clear();
    }
  })().catch(() => {
    entry.status = "exited";
  });

  return entry;
}

const EXIT_SENTINEL = Symbol("exit");

/**
 * Yields everything currently in `buffer`, then live events as they arrive,
 * until the producer sends the exit sentinel.
 *
 * Multi-consumer safe — every call returns its own iterator with its own
 * subscriber slot.
 */
function replayThenLive(
  buffer: DriverEvent[],
  subscribers: Set<(ev: DriverEvent) => void>,
): AsyncIterable<DriverEvent> {
  return {
    [Symbol.asyncIterator]() {
      let cursor = 0;
      const queue: DriverEvent[] = [];
      let resolve: (() => void) | null = null;
      let done = false;

      const wake = () => {
        if (resolve) {
          const r = resolve;
          resolve = null;
          r();
        }
      };

      const push = (ev: DriverEvent) => {
        if ((ev as unknown) === EXIT_SENTINEL) {
          done = true;
        } else {
          queue.push(ev);
        }
        wake();
      };
      subscribers.add(push);

      return {
        async next(): Promise<IteratorResult<DriverEvent>> {
          // Replay phase: drain buffer first.
          if (cursor < buffer.length) {
            return { value: buffer[cursor++]!, done: false };
          }
          // Live phase.
          while (queue.length === 0 && !done) {
            await new Promise<void>((r) => {
              resolve = r;
            });
          }
          if (queue.length > 0) {
            return { value: queue.shift()!, done: false };
          }
          subscribers.delete(push);
          return { value: undefined as unknown as DriverEvent, done: true };
        },
        async return(): Promise<IteratorResult<DriverEvent>> {
          subscribers.delete(push);
          return { value: undefined as unknown as DriverEvent, done: true };
        },
      };
    },
  };
}
