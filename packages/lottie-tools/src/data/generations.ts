/**
 * Generations — read/write helpers for `generations/<id>/`.
 *
 * Layout (per `docs/architecture/data-model.md`):
 *   generations/<id>/prompt.md
 *   generations/<id>/meta.json
 *   generations/<id>/v1.json, v2.json, ...
 *   generations/<id>/final.json   (== v<final_version>.json after review)
 *   generations/<id>/claude-stream.ndjson
 *   generations/<id>/thumb.png
 *   generations/<id>/frames/<n>.png
 */

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../paths.ts";
import {
  pathExists,
  readJson,
  writeFileAtomic,
  writeJsonAtomic,
} from "./atomic.ts";
import type {
  CreateGenerationOptions,
  GenerationEntry,
  GenerationListFilter,
  GenerationMeta,
  GenerationStatus,
} from "./types.ts";

function entryDir(id: string): string {
  return path.join(PATHS.generations, id);
}

function metaPath(id: string): string {
  return path.join(entryDir(id), "meta.json");
}

function promptPath(id: string): string {
  return path.join(entryDir(id), "prompt.md");
}

function versionPath(id: string, v: number): string {
  return path.join(entryDir(id), `v${v}.json`);
}

function finalPath(id: string): string {
  return path.join(entryDir(id), "final.json");
}

/** `2026-04-29` (UTC). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 6 lowercase hex chars — collision-resistant within a day for our scale. */
function randomTail(): string {
  return randomBytes(3).toString("hex");
}

function defaultPromptMarkdown(meta: GenerationMeta, body?: string): string {
  const tierLine =
    meta.tier === 1 && meta.template_id
      ? `**Tier**: 1 (template \`${meta.template_id}\`)`
      : `**Tier**: ${meta.tier}`;
  const baseLine = meta.base_id ? `**Base**: ${meta.base_id}` : "**Base**: (none)";
  const userText = body?.trim() || meta.prompt_summary;
  return [
    `# Prompt — ${meta.id}`,
    "",
    tierLine,
    `**Model**: ${meta.model}`,
    baseLine,
    "",
    "## User text",
    `> ${userText.replace(/\n/g, "\n> ")}`,
    "",
  ].join("\n");
}

/**
 * Create a new generation directory with seed `meta.json` + `prompt.md`.
 *
 * Returns the freshly written meta. The id format is
 * `<YYYY-MM-DD>_<6-hex>` unless one is supplied via `opts.id`.
 */
export async function createGeneration(
  opts: CreateGenerationOptions,
): Promise<GenerationMeta> {
  const id = opts.id ?? `${todayIso()}_${randomTail()}`;
  const dir = entryDir(id);
  await fs.mkdir(dir, { recursive: true });

  const startedAt = new Date().toISOString();
  const meta: GenerationMeta = {
    id,
    status: "running",
    base_id: opts.base_id ?? null,
    prompt_summary: opts.prompt_summary,
    tier: opts.tier,
    template_id: opts.template_id ?? null,
    model: opts.model,
    session_id: opts.session_id ?? null,
    started_at: startedAt,
    ended_at: null,
    duration_ms: null,
    cost_usd: null,
    num_turns: null,
    validation: { ok: false, errors: [] },
    render: { ok: false, blank_frames: 0, total_frames: 0 },
    versions: [],
    final_version: null,
  };

  await writeJsonAtomic(metaPath(id), meta);
  await writeFileAtomic(
    promptPath(id),
    defaultPromptMarkdown(meta, opts.prompt_markdown),
  );

  return meta;
}

/**
 * Read the parsed `meta.json` for a generation. Throws if missing.
 */
async function readMeta(id: string): Promise<GenerationMeta> {
  return readJson<GenerationMeta>(metaPath(id));
}

/**
 * Bundle: `{ id, dir, meta }`.
 */
export async function getGeneration(id: string): Promise<GenerationEntry> {
  const meta = await readMeta(id);
  return { id, dir: entryDir(id), meta };
}

/**
 * Apply a partial patch to `meta.json`. Read-modify-write through
 * `writeJsonAtomic` — single-process v1 has no contention concerns.
 */
export async function updateGenerationMeta(
  id: string,
  patch: Partial<GenerationMeta>,
): Promise<GenerationMeta> {
  const current = await readMeta(id);
  const next: GenerationMeta = { ...current, ...patch };
  await writeJsonAtomic(metaPath(id), next);
  return next;
}

/**
 * Convenience wrapper around `updateGenerationMeta` for status-only changes.
 * Stamps `ended_at` + `duration_ms` when transitioning to a terminal state.
 */
export async function setGenerationStatus(
  id: string,
  status: GenerationStatus,
): Promise<GenerationMeta> {
  const TERMINAL: ReadonlySet<GenerationStatus> = new Set([
    "approved",
    "rejected",
    "failed-validation",
    "failed-render",
    "cancelled",
    "pending-review",
  ]);

  const current = await readMeta(id);
  const patch: Partial<GenerationMeta> = { status };

  if (TERMINAL.has(status) && !current.ended_at) {
    const endedAt = new Date().toISOString();
    patch.ended_at = endedAt;
    const startedMs = Date.parse(current.started_at);
    if (!Number.isNaN(startedMs)) {
      patch.duration_ms = Date.parse(endedAt) - startedMs;
    }
  }

  return updateGenerationMeta(id, patch);
}

/**
 * Persist `v<n>.json` for a generation. Does not mutate `meta.versions` —
 * callers register validation results separately via `updateGenerationMeta`.
 */
export async function writeGenerationVersion(
  id: string,
  v: number,
  json: unknown,
): Promise<string> {
  const target = versionPath(id, v);
  await writeJsonAtomic(target, json);
  return target;
}

/**
 * Resolve and read the "final" animation JSON for a generation:
 *   1. `final.json` if present
 *   2. else `v<final_version>.json` if `meta.final_version` is set
 *   3. else throws
 */
export async function getGenerationFinalAnimation(
  id: string,
): Promise<unknown> {
  if (await pathExists(finalPath(id))) {
    return readJson(finalPath(id));
  }
  const meta = await readMeta(id);
  if (meta.final_version != null) {
    return readJson(versionPath(id, meta.final_version));
  }
  throw new Error(`Generation ${id} has no final.json and no final_version set`);
}

function statusMatches(
  meta: GenerationMeta,
  filter?: GenerationListFilter,
): boolean {
  if (!filter?.status) return true;
  const allowed = Array.isArray(filter.status) ? filter.status : [filter.status];
  return allowed.includes(meta.status);
}

/**
 * List every generation directory, optionally filtered by status. Missing
 * root → `[]`. Sorted by `started_at` descending (newest first).
 */
export async function listGenerations(
  filter?: GenerationListFilter,
): Promise<GenerationEntry[]> {
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(PATHS.generations, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const entries: GenerationEntry[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name.startsWith(".")) continue;

    const id = dirent.name;
    try {
      const meta = await readMeta(id);
      if (!statusMatches(meta, filter)) continue;
      entries.push({ id, dir: entryDir(id), meta });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue;
      continue; // be defensive — see library.ts for rationale
    }
  }

  entries.sort((a, b) => {
    // Newest first. Fall back to id descending for ties.
    if (a.meta.started_at === b.meta.started_at) {
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    }
    return a.meta.started_at < b.meta.started_at ? 1 : -1;
  });
  return entries;
}
