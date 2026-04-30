import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

/**
 * Result of {@link spawnClaude}. The two streams are independent async
 * iterables of complete (newline-terminated) lines — partial lines are
 * buffered until the next chunk arrives, and any final un-terminated line is
 * yielded on close.
 */
export type SpawnResult = {
  child: ChildProcess;
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
};

/**
 * Spawn `claude` with the given argv and stream stdout/stderr line-by-line.
 *
 * We stay close to `node:child_process.spawn` rather than reach for readline
 * because we need to control the chunk boundary precisely (stream-json lines
 * can be arbitrarily long, and partial chunks must be buffered, not split).
 */
export function spawnClaude(args: string[], options?: SpawnOptions): SpawnResult {
  const child = spawn("claude", args, {
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
    env: {
      ...process.env,
      NO_COLOR: "1",
      ...(options?.env ?? {}),
    },
  });

  return {
    child,
    stdout: lineIterable(child, "stdout"),
    stderr: lineIterable(child, "stderr"),
  };
}

/**
 * Wraps a child stream as an async iterable of complete lines. Buffers
 * partial chunks across `data` events and yields the trailing fragment (if
 * any) when the stream closes.
 */
function lineIterable(child: ChildProcess, which: "stdout" | "stderr"): AsyncIterable<string> {
  const stream = child[which];
  if (!stream) {
    return (async function* () {})();
  }

  return (async function* () {
    let buffer = "";
    let closed = false;
    let error: Error | null = null;

    // Pending consumer for back-pressure-friendly handoff.
    type Pending = { resolve: () => void; reject: (e: Error) => void };
    let pending: Pending | null = null;
    const queue: string[] = [];

    const wake = () => {
      if (pending) {
        const p = pending;
        pending = null;
        p.resolve();
      }
    };

    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        // Strip optional CR so the parser sees clean ndjson.
        queue.push(line.endsWith("\r") ? line.slice(0, -1) : line);
      }
      wake();
    });
    stream.on("end", () => {
      if (buffer.length > 0) {
        queue.push(buffer);
        buffer = "";
      }
      closed = true;
      wake();
    });
    stream.on("error", (err: Error) => {
      error = err;
      closed = true;
      wake();
    });

    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (closed) {
        if (error) throw error;
        return;
      }
      await new Promise<void>((resolve, reject) => {
        pending = { resolve, reject };
      });
    }
  })();
}
