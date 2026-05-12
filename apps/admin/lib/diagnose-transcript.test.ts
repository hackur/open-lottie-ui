import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { diagnoseTranscript } from "./diagnose-transcript.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GENERATIONS = path.resolve(HERE, "../../../generations");

test("empty transcript", () => {
  const d = diagnoseTranscript("");
  assert.equal(d.kind, "empty");
  assert.match(d.reason, /[Ee]mpty/);
});

test("whitespace-only transcript classifies as empty", () => {
  const d = diagnoseTranscript("   \n\t  \n");
  assert.equal(d.kind, "empty");
});

test("rate-limited banner is detected", () => {
  const d = diagnoseTranscript(
    "You've hit your limit · resets 11:50pm (America/Los_Angeles)",
  );
  assert.equal(d.kind, "rate_limited");
  assert.ok(d.detail);
  assert.match(d.detail ?? "", /resets/i);
});

test("rate-limited via 'resets HH:MMpm' regex alone", () => {
  const d = diagnoseTranscript("Some banner text\nresets 3:00am (UTC)");
  assert.equal(d.kind, "rate_limited");
});

test("tool-narration: 'created foo.json' classifies", () => {
  const d = diagnoseTranscript(
    "Valid. `prompts/templates/car-driving.json` is created — 6 layers.",
  );
  assert.equal(d.kind, "tool_narration");
  assert.match(d.reason, /file writes/i);
});

test("tool-narration: 'wrote thing.ts'", () => {
  const d = diagnoseTranscript("I wrote the helper to lib/foo.ts and saved it.");
  assert.equal(d.kind, "tool_narration");
});

test("no_tag fallback for plain narration without writes", () => {
  const d = diagnoseTranscript(
    "Sure — here is some description of what a Lottie file would look like, but no tag.",
  );
  assert.equal(d.kind, "no_tag");
  assert.ok(d.detail);
});

test("detail is truncated to ~160 chars", () => {
  const long = "x".repeat(500);
  const d = diagnoseTranscript(long);
  assert.equal(d.kind, "no_tag");
  // detail uses .slice(-160).replace(/\s+/g," ") — bounded length
  assert.ok((d.detail ?? "").length <= 200);
});

test("real transcript: generations/2026-04-30_15e375 → tool_narration", async () => {
  const p = path.join(GENERATIONS, "2026-04-30_15e375", "transcript.md");
  try {
    const text = await fs.readFile(p, "utf8");
    const d = diagnoseTranscript(text);
    assert.equal(d.kind, "tool_narration", `expected tool_narration, got ${d.kind}`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      // Fixture not present in this checkout — skip rather than fail.
      return;
    }
    throw e;
  }
});

test("real transcript: generations/2026-04-30_8632ae → rate_limited", async () => {
  const p = path.join(GENERATIONS, "2026-04-30_8632ae", "transcript.md");
  try {
    const text = await fs.readFile(p, "utf8");
    const d = diagnoseTranscript(text);
    assert.equal(d.kind, "rate_limited", `expected rate_limited, got ${d.kind}`);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw e;
  }
});
