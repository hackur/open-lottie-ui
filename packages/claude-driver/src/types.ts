import type { ChildProcess } from "node:child_process";

/**
 * Public options for {@link generate}. The driver is intentionally narrow —
 * higher-level concerns (repair loops, tier selection, basis injection) live
 * in callers; this module just spawns `claude` and surfaces typed events.
 */
export type GenerateOptions = {
  /** User-facing prompt; sent to the CLI on stdin. */
  prompt: string;
  /**
   * Model id; defaults to `claude-opus-4-7`. The well-known ids are listed
   * in the union for autocomplete; arbitrary strings are also accepted so
   * callers can route to alias models or future ids without a driver bump.
   */
  model?:
    | "claude-opus-4-7"
    | "claude-sonnet-4-6"
    | "claude-haiku-4-5-20251001"
    | (string & {});
  /** Override the system-prompt file path. Defaults to `PATHS.systemPromptDefault`. */
  systemPromptPath?: string;
  /** Working directory to run the CLI in. Defaults to the repo root. */
  cwd?: string;
  /** Optional abort signal; aborting kills the child with SIGTERM. */
  signal?: AbortSignal;
};

/**
 * Discriminated union of every event surfaced by the driver. Keep it stable —
 * callers (server actions, SSE handler, registry) match on `kind`.
 *
 * `raw` carries through any stream-json line we didn't recognize so debugging
 * does not require re-spawning `claude`.
 */
export type DriverEvent =
  | { kind: "init"; sessionId: string }
  | { kind: "text"; text: string }
  | { kind: "tool_use"; tool: string; input: unknown }
  | {
      kind: "result";
      success: boolean;
      text: string;
      costUsd: number;
      numTurns: number;
      durationMs: number;
    }
  | { kind: "error"; message: string }
  | { kind: "raw"; value: unknown };

/**
 * A spawned generation pinned to the {@link processRegistry}. The `events`
 * iterable is single-consumer; for replay use the `buffer` accumulated by the
 * registry layer (see `registry.ts`).
 */
export type RegisteredProcess = {
  id: string;
  child: ChildProcess;
  kill: () => void;
  startedAt: number;
  status: "running" | "exited";
  events: AsyncIterable<DriverEvent>;
  /** Mirror of events as they arrive — useful for late SSE subscribers. */
  buffer: DriverEvent[];
};
