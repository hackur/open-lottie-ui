/**
 * Atomic + append-only write helpers.
 *
 * All writes in the data layer go through here so we get crash-safety and a
 * single audit-able surface for disk mutations.
 */

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Write `data` to `target` atomically: write to a sibling tmp file, fsync, then
 * rename over the destination. The rename is atomic on POSIX filesystems.
 *
 * Creates parent directories as needed.
 */
export async function writeFileAtomic(
  target: string,
  data: string | Uint8Array,
): Promise<void> {
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });

  const suffix = randomBytes(6).toString("hex");
  const tmp = path.join(dir, `.${path.basename(target)}.${suffix}.tmp`);

  const handle = await fs.open(tmp, "w", 0o644);
  try {
    if (typeof data === "string") {
      await handle.writeFile(data, "utf8");
    } else {
      await handle.writeFile(data);
    }
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await fs.rename(tmp, target);
  } catch (err) {
    // Best-effort cleanup; rethrow original error.
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

/**
 * Append a single JSON object to `target` as one NDJSON line. Open-append-close
 * so multiple short-lived processes don't step on each other (single-process
 * is the v1 contract, but this stays cheap and safe).
 */
export async function appendJsonl(
  target: string,
  obj: unknown,
): Promise<void> {
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });

  const line = JSON.stringify(obj) + "\n";
  const handle = await fs.open(target, "a", 0o644);
  try {
    await handle.writeFile(line, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/**
 * Convenience: pretty-print + atomic-write JSON.
 */
export async function writeJsonAtomic(
  target: string,
  value: unknown,
  indent = 2,
): Promise<void> {
  await writeFileAtomic(target, JSON.stringify(value, null, indent) + "\n");
}

/**
 * Read a JSON file. Throws if missing or unparseable; callers can catch ENOENT
 * to treat absence as a soft signal.
 */
export async function readJson<T = unknown>(target: string): Promise<T> {
  const raw = await fs.readFile(target, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Returns true if a path exists (file or directory).
 */
export async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}
