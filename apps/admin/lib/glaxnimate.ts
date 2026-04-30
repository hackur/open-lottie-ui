import "server-only";
import { spawn } from "node:child_process";
import { promises as fs, watchFile, unwatchFile, type Stats } from "node:fs";
import path from "node:path";
import { data, validator } from "@open-lottie/lottie-tools";
import { resolveTool } from "./detect-tools.ts";

/**
 * Edit-in-Glaxnimate plugin (separate-process boundary; GPL-3.0).
 *
 * Glaxnimate is a GUI-only Qt app — when launched with a file path it opens
 * the editor for that file. There is no headless save mode. We launch it
 * detached so the request returns immediately, then poll the file's mtime
 * for ~30 minutes; if the user saves we synthesize a new generation in the
 * review queue rather than mutating the library entry directly.
 */

export interface OpenInGlaxnimateOpts {
  /** Absolute path to animation.json. */
  animationPath: string;
  /** Human-readable label, e.g. library id. Used as base_id for save-back. */
  workingId: string;
}

export interface OpenInGlaxnimateResult {
  launched: boolean;
  binary: string | null;
  pid?: number;
  reason?: string;
}

const WATCHERS_KEY = Symbol.for("open-lottie.glaxnimateWatchers");
type Watcher = {
  startedAt: number;
  expiresAt: number;
  baselineMs: number;
  /** Cancels the watcher (clears timeouts + unwatchFile). */
  cancel: () => void;
};
type WatcherMap = Map<string, Watcher>;
type GlobalWithWatchers = typeof globalThis & {
  [WATCHERS_KEY]?: WatcherMap;
};
const g = globalThis as GlobalWithWatchers;
const watchers: WatcherMap = (g[WATCHERS_KEY] ??= new Map());

/** 30 minutes in ms — single editing session window. */
const WATCHER_TTL_MS = 30 * 60 * 1000;
/** fs.watchFile poll interval. fs.watch is unreliable on macOS for cross-app saves. */
const POLL_INTERVAL_MS = 1500;

/**
 * Launch Glaxnimate detached on the given animation file. Returns immediately;
 * Glaxnimate keeps running after the request completes (`child.unref`).
 *
 * Side-effect: registers a save-back watcher on `animationPath` (idempotent —
 * relaunching for the same id resets the TTL).
 */
export async function openInGlaxnimate(
  opts: OpenInGlaxnimateOpts,
): Promise<OpenInGlaxnimateResult> {
  const binary = await resolveTool("glaxnimate");
  if (!binary) {
    return { launched: false, binary: null, reason: "glaxnimate not found" };
  }

  const child = spawn(binary, [opts.animationPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  // (Re)arm the save-back watcher.
  await armWatcher(opts.animationPath, opts.workingId);

  return { launched: true, binary, pid: child.pid };
}

/**
 * Watches `animationPath` for ~30 minutes. Each detected mtime change spawns
 * a new tier-1 generation in `pending-review` whose `base_id` is `workingId`.
 *
 * Pinned to globalThis so HMR doesn't orphan watchers; relaunching for the
 * same id resets the expiration.
 */
async function armWatcher(animationPath: string, workingId: string): Promise<void> {
  // Capture baseline mtime so we only react to *future* writes.
  let baselineMs = 0;
  try {
    const st = await fs.stat(animationPath);
    baselineMs = st.mtimeMs;
  } catch {
    return; // file gone — nothing to watch
  }

  // If a watcher already exists for this id, cancel and replace (TTL reset).
  const existing = watchers.get(workingId);
  if (existing) existing.cancel();

  const onChange = (curr: Stats, prev: Stats) => {
    // mtimeMs of 0 indicates the file was removed.
    if (curr.mtimeMs === 0) return;
    if (curr.mtimeMs <= prev.mtimeMs) return;
    if (curr.mtimeMs <= baselineMs) return;
    // Bump baseline so a single save doesn't fire twice (watchFile fires per-poll).
    baselineMs = curr.mtimeMs;
    void handleSaveBack(animationPath, workingId).catch((e) => {
      console.error(`[glaxnimate] save-back failed for ${workingId}:`, e);
    });
  };

  watchFile(animationPath, { interval: POLL_INTERVAL_MS, persistent: false }, onChange);

  const startedAt = Date.now();
  const expiresAt = startedAt + WATCHER_TTL_MS;
  const timer = setTimeout(() => {
    const w = watchers.get(workingId);
    if (w) w.cancel();
  }, WATCHER_TTL_MS);
  // Don't keep the Node event loop alive on this timer.
  if (typeof timer.unref === "function") timer.unref();

  const watcher: Watcher = {
    startedAt,
    expiresAt,
    baselineMs,
    cancel: () => {
      clearTimeout(timer);
      unwatchFile(animationPath, onChange);
      watchers.delete(workingId);
    },
  };
  watchers.set(workingId, watcher);
}

/**
 * Read the modified animation, create a tier-1 generation, copy as v1.json +
 * final.json, mark pending-review.
 */
async function handleSaveBack(
  animationPath: string,
  workingId: string,
): Promise<string | null> {
  let json: unknown;
  try {
    const raw = await fs.readFile(animationPath, "utf8");
    json = JSON.parse(raw);
  } catch (e) {
    console.error(`[glaxnimate] failed to read modified animation:`, e);
    return null;
  }

  const v = validator.validate(json);

  const gen = await data.createGeneration({
    prompt_summary: `glaxnimate edit of ${workingId}`,
    tier: 1,
    template_id: null,
    model: "glaxnimate",
    base_id: workingId,
    prompt_markdown: [
      `# Glaxnimate edit`,
      ``,
      `**Source**: \`library/${workingId}/animation.json\``,
      `**Tool**: Glaxnimate (separate-process plugin)`,
      ``,
      `User saved an edit at ${new Date().toISOString()}.`,
      ``,
    ].join("\n"),
  });

  await data.writeGenerationVersion(gen.id, 1, json);
  const entry = await data.getGeneration(gen.id);
  await fs.copyFile(
    path.join(entry.dir, "v1.json"),
    path.join(entry.dir, "final.json"),
  );

  await data.updateGenerationMeta(gen.id, {
    final_version: 1,
    versions: [{ v: 1, validated: v.valid, errors_count: v.errors.length }],
    validation: { ok: v.valid, errors: v.errors as unknown[] },
    cost_usd: 0,
    num_turns: 0,
  });
  await data.setGenerationStatus(gen.id, "pending-review");

  await data.appendDecision({
    gen: gen.id,
    action: "created",
    tier: 1,
    via: "glaxnimate",
    base_id: workingId,
  });
  await data.appendDecision({
    gen: gen.id,
    action: "validated",
    ok: v.valid,
    errors: v.errors.length,
  });

  return gen.id;
}

/** Test/debug helper — currently unused by routes. */
export function _watcherCount(): number {
  return watchers.size;
}
