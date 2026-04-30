/**
 * Promote a generation into the canonical library.
 *
 * Reads the generation's final animation, computes a content hash, and writes
 * a fresh `library/<new-id>/{animation.json, meta.json}`. The new id is
 * `<YYYY-MM-DD>_<slug>_<gen-id-tail>` to keep it filesystem-safe and traceable.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../paths.ts";
import { writeJsonAtomic } from "./atomic.ts";
import { getGenerationFinalAnimation, getGeneration } from "./generations.ts";
import { libraryEntryExists } from "./library.ts";
import type { LibraryEntry, LibraryIntrinsic, LibraryMeta, PromoteOptions } from "./types.ts";

const SLUG_MAX = 40;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX) || "untitled";
}

/** `2026-04-29_a1b2c3` → `a1b2c3`. Falls back to whole id if no underscore. */
function genIdTail(genId: string): string {
  const idx = genId.lastIndexOf("_");
  return idx >= 0 ? genId.slice(idx + 1) : genId;
}

/** YYYY-MM-DD UTC. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Best-effort intrinsic extraction from a Lottie JSON object. Falls back to
 * sentinel values if fields are missing — validator catches malformed inputs
 * upstream.
 */
function extractIntrinsic(
  animation: unknown,
  sizeBytes: number,
): LibraryIntrinsic {
  const a = (animation ?? {}) as Record<string, unknown>;
  const layers = Array.isArray(a.layers) ? a.layers : [];
  const num = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  return {
    fr: num(a.fr, 0),
    ip: num(a.ip, 0),
    op: num(a.op, 0),
    w: num(a.w, 0),
    h: num(a.h, 0),
    layer_count: layers.length,
    size_bytes: sizeBytes,
  };
}

/**
 * Promote a generation to the canonical library. Returns the new
 * `LibraryEntry`. Throws if the target id already exists or if the generation
 * has no final animation.
 */
export async function promoteGenerationToLibrary(
  genId: string,
  opts: PromoteOptions,
): Promise<LibraryEntry> {
  // Pull both meta and final animation up front so we fail fast.
  const gen = await getGeneration(genId);
  const animation = await getGenerationFinalAnimation(genId);

  const slug = slugify(opts.slug);
  const newId = `${todayIso()}_${slug}_${genIdTail(genId)}`;

  if (await libraryEntryExists(newId)) {
    throw new Error(
      `Cannot promote ${genId}: library entry "${newId}" already exists`,
    );
  }

  const targetDir = path.join(PATHS.library, newId);
  await fs.mkdir(targetDir, { recursive: true });

  // Canonicalize JSON for hashing — re-serialize without indent so cosmetic
  // whitespace doesn't perturb the hash. Indented copy is what we persist.
  const canonical = JSON.stringify(animation);
  const indented = JSON.stringify(animation, null, 2) + "\n";
  const sizeBytes = Buffer.byteLength(canonical, "utf8");
  const contentHash = `sha256:${sha256Hex(canonical)}`;

  const animationTarget = path.join(targetDir, "animation.json");
  await writeJsonAtomic(animationTarget, animation);

  const meta: LibraryMeta = {
    id: newId,
    title: opts.title,
    tags: opts.tags ?? [],
    source: opts.source ?? "generation",
    source_url: opts.source_url ?? null,
    license_id: opts.license_id ?? "CC0-1.0",
    license_url: opts.license_url ?? null,
    attribution_required: opts.attribution_required ?? false,
    attribution_text: opts.attribution_text ?? null,
    imported_at: new Date().toISOString(),
    imported_by: opts.imported_by ?? "local-user",
    content_hash: contentHash,
    intrinsic: extractIntrinsic(animation, sizeBytes),
    from_generation: gen.id,
  };

  // Suppress unused-variable lint on `indented`; persisted JSON is what
  // writeJsonAtomic produced. We compute `indented` for symmetry / future use
  // (e.g. byte-exact output) but the canonical write happens above.
  void indented;

  const metaTarget = path.join(targetDir, "meta.json");
  await writeJsonAtomic(metaTarget, meta);

  return { id: newId, dir: targetDir, meta };
}
