import type { ChildProcess } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { PATHS } from "@open-lottie/lottie-tools";
import { spawnClaude } from "./spawn.ts";
import { parseStream } from "./stream-parse.ts";
import type { DriverEvent, GenerateOptions } from "./types.ts";

export type { DriverEvent, GenerateOptions } from "./types.ts";

/**
 * Result of a {@link generate} call. Single-consumer iterable.
 *
 * - `events` is the live event stream; iterate it once.
 * - `kill()` sends SIGTERM to the child.
 * - `sessionId` resolves to the Claude session id once the `init` event
 *   arrives, or `null` if the process exits before init.
 * - `child` is the underlying `ChildProcess`; the registry layer needs it,
 *   most callers should not touch it directly.
 */
export type GenerateHandle = {
  events: AsyncIterable<DriverEvent>;
  kill: () => void;
  sessionId: Promise<string | null>;
  child: ChildProcess;
};

const DEFAULT_MODEL = "claude-opus-4-7";

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
  const kill = () => {
    if (killed) return;
    killed = true;
    try {
      child.kill("SIGTERM");
    } catch {
      // already dead — ignore.
    }
  };

  // Wire up AbortSignal if provided.
  if (opts.signal) {
    if (opts.signal.aborted) kill();
    else opts.signal.addEventListener("abort", kill, { once: true });
  }

  // Resolve sessionId on the first `init` event (or null on early exit).
  let resolveSession!: (id: string | null) => void;
  const sessionId = new Promise<string | null>((res) => {
    resolveSession = res;
  });

  // Track whether we've seen a result event so we know whether to synthesize
  // an error on non-zero exit.
  const state = { sawResult: false, sawInit: false };

  const events: AsyncIterable<DriverEvent> = (async function* () {
    for await (const ev of parseStream(stdout)) {
      if (ev.kind === "init" && !state.sawInit) {
        state.sawInit = true;
        resolveSession(ev.sessionId);
      }
      if (ev.kind === "result") {
        state.sawResult = true;
      }
      yield ev;
    }

    // stdout closed — wait for the child to actually exit so we can inspect
    // the exit code, then synthesize an error event if appropriate.
    const exitCode: number | null = await new Promise((resolve) => {
      if (child.exitCode !== null) resolve(child.exitCode);
      else child.once("close", (code) => resolve(code));
    });

    if (!state.sawInit) resolveSession(null);

    if (!state.sawResult && exitCode !== 0) {
      const trailer = stderrBuffer.trim();
      const message = killed
        ? "claude process was killed"
        : `claude exited with code ${exitCode}${trailer ? `: ${trailer}` : ""}`;
      yield { kind: "error", message } satisfies DriverEvent;
    }
  })();

  return { events, kill, sessionId, child };
}
