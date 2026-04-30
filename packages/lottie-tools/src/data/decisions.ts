/**
 * Decisions log — append-only NDJSON at `<root>/decisions.jsonl`.
 *
 * Schema is per `docs/architecture/data-model.md`: every line is a single JSON
 * object with at least `ts`, `gen`, `action`. Other fields vary by action.
 */

import { promises as fs } from "node:fs";

import { PATHS } from "../paths.ts";
import { appendJsonl } from "./atomic.ts";
import type { DecisionEntry } from "./types.ts";

/**
 * Append a single decision entry. `ts` is auto-stamped to `new Date().toISOString()`
 * if the caller didn't supply it.
 */
export async function appendDecision(
  entry: Omit<DecisionEntry, "ts"> & { ts?: string },
): Promise<DecisionEntry> {
  const stamped: DecisionEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    ...entry,
    // Make sure caller-supplied ts wins if present, otherwise keep stamped one.
    ...(entry.ts ? { ts: entry.ts } : {}),
  } as DecisionEntry;

  await appendJsonl(PATHS.decisions, stamped);
  return stamped;
}

/**
 * Return the last `n` decision entries (newest last, matching file order).
 *
 * Reads the whole file. Acceptable for v1: typical projects will have at most
 * a few thousand entries. If we ever need true tail efficiency we can swap in
 * a reverse-chunked reader without changing this signature.
 */
export async function tailDecisions(n: number): Promise<DecisionEntry[]> {
  if (n <= 0) return [];

  let raw: string;
  try {
    raw = await fs.readFile(PATHS.decisions, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const lines = raw.split("\n");
  const entries: DecisionEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as DecisionEntry);
    } catch {
      // Skip unparseable lines rather than blow up. The audit log is meant to
      // be append-only and human-readable; partial writes are unlikely but
      // possible if a process was killed mid-line.
      continue;
    }
  }

  return entries.slice(-n);
}
