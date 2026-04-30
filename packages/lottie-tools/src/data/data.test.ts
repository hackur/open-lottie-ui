/**
 * Data-layer integration tests.
 *
 * `paths.ts` reads `process.env.OPEN_LOTTIE_ROOT` at import time, so we set it
 * to a fresh tmpdir at module load BEFORE any data-module imports. The data
 * module is then loaded via `await import()` inside `before()`.
 */

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

// --- IMPORTANT: env must be set before importing the data module ---
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "open-lottie-data-test-"));
process.env.OPEN_LOTTIE_ROOT = tmpRoot;

// Pre-create the dirs paths.ts expects (mirrors a real repo root).
await fs.mkdir(path.join(tmpRoot, "library"), { recursive: true });
await fs.mkdir(path.join(tmpRoot, "generations"), { recursive: true });

// Now load the data module — `PATHS` will resolve under tmpRoot.
const data = await import("./index.ts");
const { PATHS } = await import("../paths.ts");

before(() => {
  assert.equal(PATHS.root, tmpRoot, "PATHS must resolve to tmpRoot");
});

after(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

test("createGeneration writes meta.json + prompt.md", async () => {
  const meta = await data.createGeneration({
    id: "2026-04-29_aaa001",
    prompt_summary: "spinning loader",
    tier: 3,
    model: "claude-sonnet",
    prompt_markdown: "Make a spinner.",
  });

  assert.equal(meta.id, "2026-04-29_aaa001");
  assert.equal(meta.status, "running");
  assert.equal(meta.tier, 3);
  assert.equal(meta.ended_at, null);

  const dir = path.join(tmpRoot, "generations", meta.id);
  const metaRaw = await fs.readFile(path.join(dir, "meta.json"), "utf8");
  const promptRaw = await fs.readFile(path.join(dir, "prompt.md"), "utf8");

  assert.equal(JSON.parse(metaRaw).id, meta.id);
  assert.match(promptRaw, /# Prompt — 2026-04-29_aaa001/);
  assert.match(promptRaw, /Make a spinner\./);
});

test("writeGenerationVersion writes v<n>.json", async () => {
  const meta = await data.createGeneration({
    id: "2026-04-29_aaa002",
    prompt_summary: "test",
    tier: 3,
    model: "claude-sonnet",
  });

  const animation = { v: "5.7.4", fr: 30, ip: 0, op: 60, w: 256, h: 256, layers: [] };
  const target = await data.writeGenerationVersion(meta.id, 1, animation);

  assert.ok(target.endsWith("v1.json"));
  const onDisk = JSON.parse(
    await fs.readFile(path.join(tmpRoot, "generations", meta.id, "v1.json"), "utf8"),
  );
  assert.deepEqual(onDisk, animation);
});

test("setGenerationStatus sets ended_at + duration_ms on terminal states", async () => {
  const meta = await data.createGeneration({
    id: "2026-04-29_aaa003",
    prompt_summary: "test",
    tier: 3,
    model: "claude-sonnet",
  });
  assert.equal(meta.ended_at, null);

  // Tiny sleep so duration_ms is > 0 deterministically.
  await new Promise((r) => setTimeout(r, 10));
  const updated = await data.setGenerationStatus(meta.id, "approved");

  assert.equal(updated.status, "approved");
  assert.ok(updated.ended_at, "ended_at should be set");
  assert.ok(typeof updated.duration_ms === "number" && updated.duration_ms >= 0);

  // Non-terminal status (running) should not stamp ended_at if not previously set.
  const meta2 = await data.createGeneration({
    id: "2026-04-29_aaa003b",
    prompt_summary: "x",
    tier: 3,
    model: "claude-sonnet",
  });
  // "running" isn't terminal — ended_at stays null.
  const stillRunning = await data.setGenerationStatus(meta2.id, "running");
  assert.equal(stillRunning.ended_at, null);
});

test("updateGenerationMeta merges partial fields", async () => {
  const meta = await data.createGeneration({
    id: "2026-04-29_aaa004",
    prompt_summary: "test",
    tier: 3,
    model: "claude-sonnet",
  });

  const updated = await data.updateGenerationMeta(meta.id, {
    cost_usd: 0.0123,
    num_turns: 4,
    final_version: 1,
  });

  assert.equal(updated.cost_usd, 0.0123);
  assert.equal(updated.num_turns, 4);
  assert.equal(updated.final_version, 1);
  // unrelated fields preserved
  assert.equal(updated.prompt_summary, "test");
  assert.equal(updated.status, "running");
});

test("appendDecision + tailDecisions roundtrip", async () => {
  await data.appendDecision({ gen: "g1", action: "created" });
  await data.appendDecision({ gen: "g1", action: "validated", ok: true });
  await data.appendDecision({ gen: "g1", action: "approve", reviewer: "nora" });

  const last2 = await data.tailDecisions(2);
  assert.equal(last2.length, 2);
  assert.equal(last2[0].action, "validated");
  assert.equal(last2[1].action, "approve");
  assert.equal((last2[1] as { reviewer?: string }).reviewer, "nora");

  // ts is auto-stamped if not provided.
  for (const e of last2) assert.ok(typeof e.ts === "string" && e.ts.length > 0);

  // tailDecisions(0) is empty.
  assert.deepEqual(await data.tailDecisions(0), []);
});

test("promoteGenerationToLibrary creates library entry with content_hash + from_generation", async () => {
  const genId = "2026-04-29_aaa005";
  const meta = await data.createGeneration({
    id: genId,
    prompt_summary: "promote me",
    tier: 3,
    model: "claude-sonnet",
  });

  const animation = { v: "5.7.4", fr: 30, ip: 0, op: 60, w: 128, h: 128, layers: [{}] };
  await data.writeGenerationVersion(meta.id, 1, animation);
  await data.updateGenerationMeta(meta.id, { final_version: 1 });
  await data.setGenerationStatus(meta.id, "approved");

  const entry = await data.promoteGenerationToLibrary(genId, {
    slug: "Promoted Loader",
    title: "Promoted Loader",
    tags: ["loader", "test"],
  });

  assert.match(entry.id, /^\d{4}-\d{2}-\d{2}_promoted-loader_aaa005$/);
  assert.equal(entry.meta.from_generation, genId);
  assert.match(entry.meta.content_hash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(entry.meta.title, "Promoted Loader");
  assert.deepEqual(entry.meta.tags, ["loader", "test"]);
  assert.equal(entry.meta.intrinsic.layer_count, 1);
  assert.equal(entry.meta.intrinsic.w, 128);

  const dir = path.join(tmpRoot, "library", entry.id);
  const onDiskMeta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf8"));
  assert.equal(onDiskMeta.from_generation, genId);
  const onDiskAnim = JSON.parse(await fs.readFile(path.join(dir, "animation.json"), "utf8"));
  assert.equal(onDiskAnim.w, 128);
});

test("listLibrary returns the promoted entry", async () => {
  const entries = await data.listLibrary();
  // At least the one we just promoted; tests run in declaration order.
  assert.ok(entries.length >= 1);
  const promoted = entries.find((e) => e.meta.from_generation === "2026-04-29_aaa005");
  assert.ok(promoted, "promoted entry should be listed");
  assert.equal(promoted.meta.title, "Promoted Loader");
});

test("listGenerations({ status }) filters by status", async () => {
  // From earlier tests we have:
  //   aaa001 running, aaa002 running, aaa003 approved, aaa003b running,
  //   aaa004 running, aaa005 approved.
  const all = await data.listGenerations();
  assert.ok(all.length >= 6);

  const approved = await data.listGenerations({ status: "approved" });
  const ids = approved.map((g) => g.id).sort();
  assert.deepEqual(ids, ["2026-04-29_aaa003", "2026-04-29_aaa005"]);

  const running = await data.listGenerations({ status: "running" });
  for (const g of running) assert.equal(g.meta.status, "running");

  // Array form.
  const both = await data.listGenerations({ status: ["approved", "running"] });
  assert.equal(both.length, all.length);
});
