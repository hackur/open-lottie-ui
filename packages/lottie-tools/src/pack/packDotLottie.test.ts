/**
 * Smoke test for `packDotLottie`. Packs the `loader-pulse` seed animation and
 * asserts that the returned bytes look like a real ZIP archive.
 *
 * Run from the package root with:
 *   pnpm test
 * or directly with:
 *   node --test --experimental-strip-types src/pack/packDotLottie.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { packDotLottie } from "./pack.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// src/pack -> repo root is four levels up: pack -> src -> lottie-tools -> packages -> repo.
const REPO_ROOT = path.resolve(HERE, "..", "..", "..", "..");
const SEED = path.join(
  REPO_ROOT,
  "seed-library",
  "loader-pulse",
  "animation.json",
);

test("packDotLottie: produces a non-empty ZIP buffer for loader-pulse", async () => {
  const raw = await readFile(SEED, "utf8");
  const animation = JSON.parse(raw);

  const { bytes, manifest } = await packDotLottie({
    id: "loader-pulse",
    animation,
    meta: {
      title: "Loader Pulse",
      author: "open-lottie-ui seed",
      license: "CC0-1.0",
      description: "Seed animation packed via the .lottie packer smoke test.",
      keywords: ["loader", "pulse", "seed"],
    },
  });

  assert.ok(bytes instanceof Uint8Array, "bytes is a Uint8Array");
  assert.ok(bytes.byteLength > 0, "bytes is non-empty");

  // ZIP local file header magic — every .lottie must start with `PK\x03\x04`.
  assert.equal(bytes[0], 0x50, "byte[0] = 'P'");
  assert.equal(bytes[1], 0x4b, "byte[1] = 'K'");
  assert.equal(bytes[2], 0x03, "byte[2] = 0x03");
  assert.equal(bytes[3], 0x04, "byte[3] = 0x04");

  // Manifest echo isn't strictly required for the smoke test, but if the
  // package returned one it should mention our animation id somewhere.
  if (manifest && typeof manifest === "object") {
    const json = JSON.stringify(manifest);
    assert.ok(
      json.includes("loader-pulse"),
      "manifest references the animation id",
    );
  }
});
