/**
 * Library — read/write helpers for `library/<id>/`.
 *
 * Layout (per `docs/architecture/data-model.md`):
 *   library/<id>/animation.json
 *   library/<id>/meta.json
 *   library/<id>/thumb.png        (optional)
 *   library/<id>/animation.lottie (optional)
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../paths.ts";
import { pathExists, readJson, writeJsonAtomic } from "./atomic.ts";
import type { LibraryEntry, LibraryMeta } from "./types.ts";

function entryDir(id: string): string {
  return path.join(PATHS.library, id);
}

function metaPath(id: string): string {
  return path.join(entryDir(id), "meta.json");
}

function animationPath(id: string): string {
  return path.join(entryDir(id), "animation.json");
}

/**
 * Returns true if `library/<id>/meta.json` exists.
 */
export async function libraryEntryExists(id: string): Promise<boolean> {
  return pathExists(metaPath(id));
}

/**
 * Read the parsed `meta.json` for a library entry.
 */
export async function getLibraryMeta(id: string): Promise<LibraryMeta> {
  return readJson<LibraryMeta>(metaPath(id));
}

/**
 * Read the parsed `animation.json` for a library entry. Returns `unknown` —
 * Lottie validation is the validator module's job.
 */
export async function getLibraryAnimation(id: string): Promise<unknown> {
  return readJson(animationPath(id));
}

/**
 * Read both meta + animation paths into a single bundle.
 */
export async function getLibraryEntry(id: string): Promise<LibraryEntry> {
  const meta = await getLibraryMeta(id);
  return { id, dir: entryDir(id), meta };
}

/**
 * List every entry in `library/`. Missing root → `[]`. Subdirs without a
 * `meta.json` are skipped silently (e.g. dotfiles, partial writes).
 */
export async function listLibrary(): Promise<LibraryEntry[]> {
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(PATHS.library, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const entries: LibraryEntry[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name.startsWith(".") || dirent.name.startsWith("_")) continue;

    const id = dirent.name;
    try {
      const meta = await getLibraryMeta(id);
      entries.push({ id, dir: entryDir(id), meta });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") continue; // no meta.json → skip
      // Bad JSON or other error → skip with no throw; caller can re-list once
      // the problem is fixed. Keeping this defensive matches the read-path
      // contract: list pages should never blow up over one bad entry.
      continue;
    }
  }

  // Stable order for UI: id ascending.
  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return entries;
}

/**
 * Persist `meta.json` for a library entry atomically. Caller is responsible
 * for shape correctness; validator sits one layer up.
 */
export async function saveLibraryMeta(
  id: string,
  meta: LibraryMeta,
): Promise<void> {
  await writeJsonAtomic(metaPath(id), meta);
}
