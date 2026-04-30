#!/usr/bin/env node
/**
 * Refresh content_hash + intrinsic.size_bytes for every seed-library entry.
 *
 * Run with:
 *   node --experimental-strip-types scripts/seed-hash.ts
 *
 * Imports the hash helpers directly from the lottie-tools package source —
 * no build step, no Ajv. Intentional: we want this script to work in a
 * fresh checkout before pnpm install has run.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contentHash } from "../packages/lottie-tools/src/hash/hash.ts";
import { intrinsics } from "../packages/lottie-tools/src/hash/intrinsics.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seedRoot = resolve(here, "..", "seed-library");

type SeedMeta = {
  content_hash: string;
  intrinsic: {
    fr: number;
    ip: number;
    op: number;
    w: number;
    h: number;
    layer_count: number;
    size_bytes: number | null;
  };
  [k: string]: unknown;
};

function refreshOne(dir: string): { id: string; hash: string; size: number } {
  const id = dir.split("/").pop() ?? dir;
  const animPath = join(dir, "animation.json");
  const metaPath = join(dir, "meta.json");
  const animRaw = readFileSync(animPath, "utf8");
  const anim = JSON.parse(animRaw);
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as SeedMeta;

  const hash = contentHash(anim);
  const intr = intrinsics(anim);

  meta.content_hash = hash;
  meta.intrinsic = {
    fr: intr.fr,
    ip: intr.ip,
    op: intr.op,
    w: intr.w,
    h: intr.h,
    layer_count: intr.layer_count,
    size_bytes: intr.size_bytes,
  };

  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
  return { id, hash, size: intr.size_bytes };
}

const entries = readdirSync(seedRoot)
  .map((name) => join(seedRoot, name))
  .filter((p) => statSync(p).isDirectory());

if (entries.length === 0) {
  console.error(`No seed entries found under ${seedRoot}`);
  process.exit(1);
}

for (const dir of entries) {
  const { id, hash, size } = refreshOne(dir);
  console.log(`${id}\t${hash}\tsize_bytes=${size}`);
}
