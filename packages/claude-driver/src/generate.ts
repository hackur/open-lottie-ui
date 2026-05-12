import type { ChildProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { PATHS } from "@open-lottie/lottie-tools";
import { spawnClaude } from "./spawn.ts";
import { parseStream } from "./stream-parse.ts";
import type { DriverEvent, GenerateOptions, KillOptions } from "./types.ts";

export type { DriverEvent, GenerateOptions, KillOptions } from "./types.ts";

/**
 * Result of a {@link generate} call. Single-consumer iterable.
 *
 * - `events` is the live event stream; iterate it once.
 * - `kill()` sends SIGTERM to the child. With `{ graceful: true }` it waits
 *   up to `timeoutMs` (default 5000) and then sends SIGKILL; the returned
 *   promise resolves once the child is confirmed dead.
 * - `sessionId` resolves to the Claude session id once the `init` event
 *   arrives, or `null` if the process exits before init.
 * - `child` is the underlying `ChildProcess`; the registry layer needs it,
 *   most callers should not touch it directly.
 */
export type GenerateHandle = {
  events: AsyncIterable<DriverEvent>;
  kill: (opts?: KillOptions) => Promise<void>;
  sessionId: Promise<string | null>;
  child: ChildProcess;
};

const DEFAULT_MODEL = "claude-opus-4-7";
const DEFAULT_SILENCE_TIMEOUT_MS = 60_000;
const DEFAULT_KILL_GRACE_MS = 5_000;

/**
 * Tools we explicitly forbid the model from invoking. The model's job is to
 * return Lottie JSON (or a generation script) as text — all I/O happens on
 * our side. See ADR-003 and `docs/architecture/claude-integration.md`.
 */
const DISALLOWED_TOOLS = "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,TodoWrite";

/**
 * Spawn `claude` with the project's Lottie-generation flags and return a
 * single-consumer event stream.
 */
export function generate(opts: GenerateOptions): GenerateHandle {
  const model = opts.model ?? DEFAULT_MODEL;
  const systemPromptPath = opts.systemPromptPath ?? PATHS.systemPromptDefault;
  // Run claude in an empty tmp dir so the model doesn't see the project's
  // CLAUDE.md / docs/ / package.json. Combined with --disallowed-tools this
  // keeps the model focused on emitting Lottie JSON instead of "let me check
  // the existing templates to understand the format..." text.
  const cwd = opts.cwd ?? mkdtempSync(path.join(os.tmpdir(), "claude-lottie-"));

  const args = [
    "--print",
    "--output-format", "stream-json",
    "--verbose",
    "--permission-mode", "bypassPermissions",
    "--disallowed-tools", DISALLOWED_TOOLS,
    "--append-system-prompt", `@${systemPromptPath}`,
    "--model", model,
  ];

  const { child, stdout, stderr } = spawnClaude(args, { cwd });

  // Feed the user prompt over stdin and close it — the CLI exits after the
  // single turn (`--print`).
  if (child.stdin) {
    child.stdin.write(opts.prompt);
    child.stdin.end();
  }

  // Drain stderr so the OS pipe never fills up; collect for error reporting.
  let stderrBuffer = "";
  (async () => {
    for await (const line of stderr) {
      stderrBuffer += line + "\n";
    }
  })().catch(() => {});

  let killed = false;
  const waitForExit = (): Promise<void> =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }
      child.once("close", () => resolve());
    });

  const kill = async (killOpts: KillOptions = {}): Promise<void> => {
    const graceful = killOpts.graceful ?? false;
    const timeoutMs = killOpts.timeoutMs ?? DEFAULT_KILL_GRACE_MS;
    if (killed) {
      // Still expose exit-await semantics — caller may wait for child to die.
      await waitForExit();
      return;
    }
    killed = true;
    try {
      child.kill("SIGTERM");
    } catch {
      // already dead — ignore.
    }
    if (!graceful) return;

    // Wait up to timeoutMs for SIGTERM to take, then SIGKILL.
    const exitedInTime = await Promise.race([
      waitForExit().then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ]);
    if (!exitedInTime) {
      try {
        child.kill("SIGKILL");
      } catch {
        // already dead — ignore.
      }
      await waitForExit();
    }
  };

  // Wire up AbortSignal if provided.
  if (opts.signal) {
    if (opts.signal.aborted) void kill();
    else opts.signal.addEventListener("abort", () => void kill(), { once: true });
  }

  // Resolve sessionId on the first `init` event (or null on early exit).
  let resolveSession!: (id: string | null) => void;
  const sessionId = new Promise<string | null>((res) => {
    resolveSession = res;
  });

  // Track whether we've seen a result event so we know whether to synthesize
  // an error on non-zero exit.
  const state = { sawResult: false, sawInit: false };

  // Silence watchdog. If no event arrives for `silenceTimeoutMs`, emit an
  // error and kill. The timer is reset on every yielded event (init, text,
  // tool_use, result, error, raw). A 0/negative value disables the watchdog.
  const silenceTimeoutMs = opts.silenceTimeoutMs ?? DEFAULT_SILENCE_TIMEOUT_MS;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let silenceTripped = false;
  const silenceQueue: DriverEvent[] = [];
  let silenceWaker: (() => void) | null = null;
  const wakeSilence = () => {
    if (silenceWaker) {
      const w = silenceWaker;
      silenceWaker = null;
      w();
    }
  };
  const armSilence = () => {
    if (silenceTimeoutMs <= 0) return;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      silenceTripped = true;
      silenceQueue.push({
        kind: "error",
        message: `claude went silent for ${Math.round(silenceTimeoutMs / 1000)}s — killing`,
      } satisfies DriverEvent);
      wakeSilence();
      void kill();
    }, silenceTimeoutMs);
  };
  const disarmSilence = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  armSilence();

  const events: AsyncIterable<DriverEvent> = (async function* () {
    // Race the parser against the silence watchdog by interleaving them
    // through a small queue. Drain anything the watchdog has queued each
    // time we get a chance.
    const parseIter = parseStream(stdout)[Symbol.asyncIterator]();
    let parseDone = false;
    // The parser is a stateful async iterator — calling .next() twice
    // concurrently queues the second call. We must reuse a single pending
    // .next() across loop iterations whenever the race was won by silence
    // instead of by parse, so the parser doesn't accumulate ignored work.
    let pendingParse:
      | Promise<{ kind: "parse"; result: IteratorResult<DriverEvent> }>
      | null = null;
    while (true) {
      // Drain any queued silence-events first so they reach the consumer
      // even if the parser is mid-await.
      while (silenceQueue.length > 0) {
        const ev = silenceQueue.shift()!;
        yield ev;
      }
      if (parseDone) break;

      // Once the watchdog has tripped, stop racing — the child is being
      // killed and we just want to drain whatever the parser still emits
      // (typically nothing) and then exit cleanly. Continuing to race
      // against a synchronously-resolved silence promise would spin in a
      // tight loop forever because `silenceTripped` is never reset.
      if (silenceTripped) {
        if (!pendingParse) {
          pendingParse = parseIter.next().then(
            (r) => ({ kind: "parse" as const, result: r }),
          );
        }
        const { result } = await pendingParse;
        pendingParse = null;
        const { value, done } = result;
        if (done) {
          parseDone = true;
          continue;
        }
        // Silently absorb late events after the watchdog tripped — the
        // consumer already saw the silence error; piping more (likely
        // partial / inconsistent) events would just confuse them.
        void value;
        continue;
      }

      if (!pendingParse) {
        pendingParse = parseIter.next().then(
          (r) => ({ kind: "parse" as const, result: r }),
        );
      }
      const nextSilence = new Promise<{ kind: "silence" }>((resolve) => {
        silenceWaker = () => resolve({ kind: "silence" });
      });

      const winner = await Promise.race([pendingParse, nextSilence]);
      if (winner.kind === "silence") {
        // Leave pendingParse intact — we'll await it on a future iteration
        // (or drop it once silenceTripped causes us to drain).
        continue;
      }
      // Parse won the race; clear the waker so a late watchdog firing
      // doesn't resolve a stale promise we no longer own.
      silenceWaker = null;
      pendingParse = null;

      const { value, done } = winner.result;
      if (done) {
        parseDone = true;
        continue;
      }
      const ev = value;
      armSilence();
      if (ev.kind === "init" && !state.sawInit) {
        state.sawInit = true;
        resolveSession(ev.sessionId);
      }
      if (ev.kind === "result") {
        state.sawResult = true;
      }
      yield ev;
    }

    disarmSilence();

    // Drain any final silence-queued events (e.g. if the watchdog tripped at
    // the same moment the parser finished).
    while (silenceQueue.length > 0) {
      yield silenceQueue.shift()!;
    }

    // stdout closed — wait for the child to actually exit so we can inspect
    // the exit code, then synthesize an error event if appropriate.
    const exitCode: number | null = await new Promise((resolve) => {
      if (child.exitCode !== null) resolve(child.exitCode);
      else child.once("close", (code) => resolve(code));
    });

    if (!state.sawInit) resolveSession(null);

    // If the watchdog tripped, we already emitted an error event; suppress
    // the generic "killed" message to avoid double-noise.
    if (!state.sawResult && exitCode !== 0 && !silenceTripped) {
      const trailer = stderrBuffer.trim();
      const message = killed
        ? "claude process was killed"
        : `claude exited with code ${exitCode}${trailer ? `: ${trailer}` : ""}`;
      yield { kind: "error", message } satisfies DriverEvent;
    }
  })();

  return { events, kill, sessionId, child };
}
