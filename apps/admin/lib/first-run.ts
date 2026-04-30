import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "@open-lottie/lottie-tools";

let didCheck = false;
const WELCOME_FLAG = path.join(PATHS.config, ".welcome-seen");

export async function ensureFirstRun(): Promise<{ copied: number; isFirstRun: boolean }> {
  if (didCheck) return { copied: 0, isFirstRun: false };
  didCheck = true;

  await fs.mkdir(PATHS.library, { recursive: true });
  await fs.mkdir(PATHS.generations, { recursive: true });
  await fs.mkdir(PATHS.config, { recursive: true });

  const existing = await fs.readdir(PATHS.library).catch(() => []);
  if (existing.length > 0) return { copied: 0, isFirstRun: false };

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
  return { copied, isFirstRun: copied > 0 };
}

/** Returns true if the user has not yet seen the welcome screen. */
export async function shouldShowWelcome(): Promise<boolean> {
  return !(await exists(WELCOME_FLAG));
}

/** Marks the welcome screen as seen — called from /welcome → "got it". */
export async function markWelcomeSeen(): Promise<void> {
  await fs.mkdir(PATHS.config, { recursive: true });
  await fs.writeFile(WELCOME_FLAG, new Date().toISOString(), "utf8");
}

/** List of seed ids currently in the seed-library directory. */
export async function listSeedIds(): Promise<string[]> {
  const dirs = await fs.readdir(PATHS.seedLibrary, { withFileTypes: true }).catch(() => []);
  return dirs.filter((d) => d.isDirectory()).map((d) => d.name);
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
