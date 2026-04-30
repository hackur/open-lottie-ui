import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "@open-lottie/lottie-tools";

let didCheck = false;

export async function ensureFirstRun(): Promise<{ copied: number }> {
  if (didCheck) return { copied: 0 };
  didCheck = true;

  await fs.mkdir(PATHS.library, { recursive: true });
  await fs.mkdir(PATHS.generations, { recursive: true });

  const existing = await fs.readdir(PATHS.library).catch(() => []);
  if (existing.length > 0) return { copied: 0 };

  const seedDirs = await fs.readdir(PATHS.seedLibrary, { withFileTypes: true }).catch(() => []);
  let copied = 0;
  for (const entry of seedDirs) {
    if (!entry.isDirectory()) continue;
    const src = path.join(PATHS.seedLibrary, entry.name);
    const dst = path.join(PATHS.library, entry.name);
    if (await exists(dst)) continue;
    await copyDir(src, dst);
    await stampImportedAt(dst);
    copied++;
  }
  return { copied };
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(src: string, dst: string): Promise<void> {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else if (e.isFile()) await fs.copyFile(s, d);
  }
}

async function stampImportedAt(libDir: string): Promise<void> {
  const metaPath = path.join(libDir, "meta.json");
  try {
    const raw = await fs.readFile(metaPath, "utf8");
    const meta = JSON.parse(raw) as Record<string, unknown>;
    meta.imported_at = new Date().toISOString();
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
  } catch {
    /* ignore — meta is not strictly required for the file to render */
  }
}
