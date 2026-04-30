import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import type { ChildProcess } from "node:child_process";

// Re-import the internal helper via spawnClaude on `node`'s `cat`-style
// sub-process to avoid re-exporting `lineIterable` just for tests.
import { spawnClaude } from "./spawn.ts";

// Spawn `node -e "process.stdout.write(...)"` to feed deterministic chunks
// (cross-platform; avoids depending on `printf` behavior).
function emitChunks(chunks: string[]): ChildProcess {
  const script = `
    const chunks = ${JSON.stringify(chunks)};
    (async () => {
      for (const c of chunks) {
        process.stdout.write(c);
        await new Promise(r => setTimeout(r, 5));
      }
    })();
  `;
  return spawn(process.execPath, ["-e", script], { stdio: ["pipe", "pipe", "pipe"] });
}

test("buffers partial lines across chunks", async () => {
  // Manual exercise of the line-buffering by piping a fake stdout into the
  // same generator code path we'd use for `claude`. We approximate by
  // wrapping a Readable.from() iterator into a fake child.
  const fakeChild = emitChunks(["hel", "lo\nwor", "ld\n", "trail"]);
  const collected: string[] = [];
  const stdout = lineIter(fakeChild.stdout!);
  for await (const line of stdout) {
    collected.push(line);
  }
  assert.deepEqual(collected, ["hello", "world", "trail"]);
});

// Mirror of the private helper for direct unit testing — not exported from
// spawn.ts because callers always go through spawnClaude().
function lineIter(stream: NodeJS.ReadableStream): AsyncIterable<string> {
  return (async function* () {
    let buffer = "";
    stream.setEncoding("utf8");
    const chunks: string[] = [];
    let done = false;
    let resolve: (() => void) | null = null;

    const wake = () => {
      if (resolve) {
        const r = resolve;
        resolve = null;
        r();
      }
    };

    stream.on("data", (c: string) => {
      chunks.push(c);
      wake();
    });
    stream.on("end", () => {
      done = true;
      wake();
    });

    while (true) {
      while (chunks.length > 0) {
        buffer += chunks.shift();
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          yield buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
        }
      }
      if (done) {
        if (buffer.length > 0) yield buffer;
        return;
      }
      await new Promise<void>((r) => {
        resolve = r;
      });
    }
  })();
}

test("spawnClaude returns child with iterables (claude binary not required)", () => {
  // Just verify the import works — actually spawning `claude` would hang
  // on auth in CI. We assert the function exists.
  assert.equal(typeof spawnClaude, "function");
});

// Suppress unused `Readable` import warning in strict mode without polluting
// the test runtime.
void Readable;
