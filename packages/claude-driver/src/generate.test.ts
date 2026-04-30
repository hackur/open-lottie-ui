/**
 * generate() integration tests that don't require the real `claude` binary.
 *
 * We point PATH at a tmpdir containing a stub `claude` script so spawnClaude
 * resolves to our shim. Each test writes a different shim shell-script that
 * simulates a specific failure mode (silent hang, normal completion, etc.).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { generate } from "./generate.ts";
import type { DriverEvent } from "./types.ts";

// Build a tmpdir with a stub `claude` script and return the absolute dir.
// Caller composes PATH = `${stubDir}:${process.env.PATH}` when invoking
// generate(). The script body receives stdin (the prompt) but ignores it.
async function makeStubDir(scriptBody: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-driver-stub-"));
  const scriptPath = path.join(dir, "claude");
  // Use node directly as the interpreter so the test is cross-platform-ish.
  const script = `#!/usr/bin/env node\n${scriptBody}\n`;
  await fs.writeFile(scriptPath, script, "utf8");
  await fs.chmod(scriptPath, 0o755);
  return dir;
}

// Patch process.env.PATH to prefix `dir`. Returns a restore function.
function withPathPrefix(dir: string): () => void {
  const original = process.env.PATH;
  process.env.PATH = `${dir}${path.delimiter}${original ?? ""}`;
  return () => {
    process.env.PATH = original;
  };
}

// Required by generate(): a system prompt file the driver can reference via
// `--append-system-prompt @<path>`. We don't actually read it (the stub
// ignores all flags), but generate() resolves PATHS.systemPromptDefault, so
// we just rely on whatever the workspace ships.
const SHIM_INIT_LINE = JSON.stringify({
  type: "system",
  subtype: "init",
  session_id: "stub-session-1",
  model: "claude-stub",
});

test("silence watchdog kills child and emits error after silenceTimeoutMs", async () => {
  // Stub: emit one ndjson init line, then sleep forever. The watchdog's
  // 200ms timer should fire well before the manual setInterval timeout.
  const stubBody = `
    process.stdout.write(${JSON.stringify(SHIM_INIT_LINE + "\n")});
    setInterval(() => {}, 1e9);
  `;
  const stubDir = await makeStubDir(stubBody);
  const restore = withPathPrefix(stubDir);
  try {
    const handle = generate({
      prompt: "anything",
      silenceTimeoutMs: 200,
    });

    const events: DriverEvent[] = [];
    const start = Date.now();
    for await (const ev of handle.events) {
      events.push(ev);
      if (events.length > 8) break; // safety
    }
    const elapsed = Date.now() - start;

    // We expect: init, error("went silent..."), and possibly a trailing
    // "killed" error (which is suppressed when silenceTripped).
    const errorEvents = events.filter((e) => e.kind === "error");
    assert.ok(
      errorEvents.length >= 1,
      `expected at least one error event, got: ${JSON.stringify(events)}`,
    );
    const silenceErr = errorEvents.find(
      (e) => e.kind === "error" && /went silent/.test(e.message),
    );
    assert.ok(
      silenceErr,
      `expected a 'went silent' error, got: ${JSON.stringify(errorEvents)}`,
    );
    assert.ok(elapsed >= 200, `should wait at least 200ms (waited ${elapsed}ms)`);
    assert.ok(
      elapsed < 5000,
      `watchdog should fire well before 5s (took ${elapsed}ms)`,
    );

    // Child should be dead by the time we get here.
    assert.ok(
      handle.child.killed || handle.child.exitCode !== null || handle.child.signalCode !== null,
      "child should be killed",
    );
  } finally {
    restore();
    await fs.rm(stubDir, { recursive: true, force: true });
  }
});

test("silenceTimeoutMs=0 disables the watchdog", async () => {
  // Stub emits init then exits cleanly after 100ms. Watchdog must NOT fire.
  const stubBody = `
    process.stdout.write(${JSON.stringify(SHIM_INIT_LINE + "\n")});
    setTimeout(() => {
      const result = JSON.stringify({
        type: "result",
        subtype: "success",
        result: "<lottie-json>{}</lottie-json>",
        total_cost_usd: 0,
        num_turns: 1,
        duration_ms: 100,
      });
      process.stdout.write(result + "\\n");
      process.exit(0);
    }, 100);
  `;
  const stubDir = await makeStubDir(stubBody);
  const restore = withPathPrefix(stubDir);
  try {
    const handle = generate({
      prompt: "anything",
      silenceTimeoutMs: 0,
    });

    const events: DriverEvent[] = [];
    for await (const ev of handle.events) {
      events.push(ev);
    }

    const errorEvents = events.filter((e) => e.kind === "error");
    assert.equal(errorEvents.length, 0, `unexpected errors: ${JSON.stringify(errorEvents)}`);
    const resultEvent = events.find((e) => e.kind === "result");
    assert.ok(resultEvent, "should have received a result event");
  } finally {
    restore();
    await fs.rm(stubDir, { recursive: true, force: true });
  }
});

test("graceful kill SIGTERMs then SIGKILLs after timeout", async () => {
  // Stub installs a SIGTERM handler that ignores it, so only SIGKILL works.
  const stubBody = `
    process.on("SIGTERM", () => { /* ignore */ });
    process.stdout.write(${JSON.stringify(SHIM_INIT_LINE + "\n")});
    setInterval(() => {}, 1e9);
  `;
  const stubDir = await makeStubDir(stubBody);
  const restore = withPathPrefix(stubDir);
  try {
    const handle = generate({
      prompt: "anything",
      silenceTimeoutMs: 0, // disable so the watchdog doesn't race us
    });

    // Drain init in the background so the parser doesn't block.
    const drained: DriverEvent[] = [];
    const drainP = (async () => {
      for await (const ev of handle.events) drained.push(ev);
    })();

    // Small wait so the child is up.
    await new Promise((r) => setTimeout(r, 100));

    const start = Date.now();
    await handle.kill({ graceful: true, timeoutMs: 250 });
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 250, `kill should wait at least timeoutMs (got ${elapsed}ms)`);
    assert.ok(elapsed < 2000, `kill should resolve within ~2s (got ${elapsed}ms)`);
    assert.ok(
      handle.child.exitCode !== null || handle.child.signalCode !== null,
      "child should have exited",
    );

    await drainP;
  } finally {
    restore();
    await fs.rm(stubDir, { recursive: true, force: true });
  }
});
