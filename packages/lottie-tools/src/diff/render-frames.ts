/**
 * Render Lottie frames to PNG buffers, preferring the `inlottie` CLI (Rust
 * renderer) and falling back to a pure-JS rasteriser when inlottie can't run
 * headlessly.
 *
 * `inlottie` invocation shape (from `inlottie --help` on v0.1.9-g):
 *   inlottie [<path-to-file>]
 *
 * The shipped 0.1.9-g build is a windowed viewer with no headless flags; we
 * still spawn it with a few well-known flag layouts (newer in-development builds
 * surface them) so that an operator who upgrades inlottie picks up rendering
 * automatically. If none of the invocations produces a PNG and the
 * `OPEN_LOTTIE_DIFF_FALLBACK` mode allows it, we route the same frame through
 * `./fallback-renderer.ts` (pngjs-only). Operators who want hard failures (and
 * a 503 from the API) can set `OPEN_LOTTIE_DIFF_FALLBACK=off`.
 *
 * Frames are cached on disk under `.cache/frames/<contentHash>/<frame>@<width>.png`
 * so repeated diff calls (or replays after an admin reload) are free.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PATHS } from "../paths.ts";
import { pathExists, writeFileAtomic } from "../data/atomic.ts";
import { renderFrameFallback } from "./fallback-renderer.ts";
import { RendererUnavailableError } from "./types.ts";

/** Default to the location requested by the project; overridable via env. */
const DEFAULT_BIN = path.join(os.homedir(), ".cargo", "bin", "inlottie");

function inlottieBin(): string {
  return process.env.INLOTTIE_BIN || DEFAULT_BIN;
}

/**
 * Process-wide circuit breaker. Pinned to globalThis so HMR doesn't reset it.
 * Once any spawn fails to produce a PNG (the shipped 0.1.9-g `inlottie` is a
 * GUI viewer with no headless flags), every subsequent call short-circuits to
 * `RendererUnavailableError` so we don't burn one timeout per frame.
 */
const RENDERER_FLAG = Symbol.for("open-lottie.diffRendererUnavailable");
type GlobalWithFlag = typeof globalThis & { [RENDERER_FLAG]?: boolean };
function rendererKnownBad(): boolean {
  return Boolean((globalThis as GlobalWithFlag)[RENDERER_FLAG]);
}
function markRendererBad(): void {
  (globalThis as GlobalWithFlag)[RENDERER_FLAG] = true;
}

interface AnimationHeader {
  ip?: number;
  op?: number;
  fr?: number;
  w?: number;
  h?: number;
}

/**
 * Read the in-point / out-point / aspect from an animation JSON. Defaults are
 * conservative: ip=0, op=60, fr=30, square 200×200.
 */
export function readAnimationHeader(animation: unknown): Required<AnimationHeader> {
  const a = (animation ?? {}) as AnimationHeader;
  return {
    ip: typeof a.ip === "number" ? a.ip : 0,
    op: typeof a.op === "number" ? a.op : 60,
    fr: typeof a.fr === "number" ? a.fr : 30,
    w: typeof a.w === "number" && a.w > 0 ? a.w : 200,
    h: typeof a.h === "number" && a.h > 0 ? a.h : 200,
  };
}

/**
 * Clamp a list of frame numbers to `[ip, op]` (inclusive ip, exclusive op when
 * possible — Lottie convention is half-open).
 */
export function clampFrames(frames: number[], ip: number, op: number): number[] {
  const lo = Math.floor(ip);
  const hi = Math.max(Math.floor(op) - 1, lo);
  return frames.map((n) => {
    if (!Number.isFinite(n)) return lo;
    if (n < lo) return lo;
    if (n > hi) return hi;
    return Math.floor(n);
  });
}

/**
 * Pick `count` evenly-spaced frame numbers across `[ip, op)`.
 * Returns at least one frame, never returns out-of-range numbers.
 */
export function pickFrames(count: number, ip: number, op: number): number[] {
  const lo = Math.floor(ip);
  const hi = Math.max(Math.floor(op) - 1, lo);
  const n = Math.max(1, Math.min(60, Math.floor(count)));
  if (hi <= lo) return [lo];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // Distribute across [lo, hi]; first sample at lo, last sample at hi.
    const t = n === 1 ? 0 : i / (n - 1);
    out.push(lo + Math.round(t * (hi - lo)));
  }
  // Dedupe while preserving order.
  return Array.from(new Set(out));
}

function frameCacheDir(contentHash: string): string {
  // `sha256:abcd…` is fine on macOS/Linux but we prefer a clean dir name.
  const safe = contentHash.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(PATHS.cache, "frames", safe);
}

function frameCachePath(contentHash: string, frame: number, width: number): string {
  return path.join(frameCacheDir(contentHash), `${frame}@${width}.png`);
}

/**
 * Cache key derived from `(animation-hash, frame, width)`. We don't hash the
 * full animation here — the caller supplies a stable content-hash so we trust
 * it (single-process, single-tenant).
 */
export function frameKey(contentHash: string, frame: number, width: number): string {
  const h = createHash("sha256");
  h.update(contentHash);
  h.update("|");
  h.update(String(frame));
  h.update("|");
  h.update(String(width));
  return h.digest("hex");
}

/**
 * Spawn `inlottie` with one set of arguments, with a hard wall-clock timeout.
 * Resolves to the exit code (and stdout/stderr); does NOT throw on non-zero.
 */
function runInlottie(
  args: string[],
  timeoutMs = 15_000,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(inlottieBin(), args, {
      stdio: ["ignore", "pipe", "pipe"],
      // Detach from a controlling terminal so it can't grab stdin.
      detached: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    proc.stdout.on("data", (b: Buffer) => {
      stdout += b.toString("utf8");
    });
    proc.stderr.on("data", (b: Buffer) => {
      stderr += b.toString("utf8");
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      stderr += "\nspawn error: " + (err instanceof Error ? err.message : String(err));
      resolve({ code: null, stdout, stderr });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Tries the documented (and a couple of forward-looking) flag layouts to ask
 * `inlottie` to render a single frame to `outPath`. Returns true iff `outPath`
 * exists and is non-empty after the run.
 *
 * Layouts attempted (first match wins):
 *   1. inlottie --frame N --width W --output OUT FILE
 *   2. inlottie --frame N --width W -o OUT FILE
 *   3. inlottie --png OUT --frame N --width W FILE
 *   4. inlottie -o OUT FILE                         (single frame, default size)
 *   5. inlottie FILE                                (no-op probe; legacy viewer)
 */
async function tryRenderFrame(
  filePath: string,
  frame: number,
  width: number,
  outPath: string,
): Promise<boolean> {
  const layouts: string[][] = [
    ["--frame", String(frame), "--width", String(width), "--output", outPath, filePath],
    ["--frame", String(frame), "--width", String(width), "-o", outPath, filePath],
    ["--png", outPath, "--frame", String(frame), "--width", String(width), filePath],
    ["-o", outPath, filePath],
    [filePath],
  ];
  for (const args of layouts) {
    // Wipe any prior partial output before each attempt.
    await fs.rm(outPath, { force: true }).catch(() => {});
    // 2s per attempt. The 0.1.9-g viewer never returns headlessly, so any
    // longer is wasted wall-clock; legitimate headless versions render in
    // a few hundred ms.
    await runInlottie(args, 2_000);
    if (await fileNonEmpty(outPath)) return true;
  }
  return false;
}

async function fileNonEmpty(target: string): Promise<boolean> {
  try {
    const s = await fs.stat(target);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

export interface RenderFramesOptions {
  /** Stable content hash of the animation, used for caching. */
  contentHash: string;
  /** Render width in CSS pixels. */
  width: number;
  /**
   * Parsed animation JSON, supplied so the pure-JS fallback can rasterise
   * frames when inlottie can't render headlessly. Caller passes the same JSON
   * that's already on disk at `animationPath`.
   */
  animation?: unknown;
}

/** Returns true if the pure-JS fallback path is enabled. Default: on. */
function fallbackEnabled(): boolean {
  const v = (process.env.OPEN_LOTTIE_DIFF_FALLBACK || "").toLowerCase();
  return v !== "off" && v !== "0" && v !== "false";
}

/**
 * Render `frameNumbers` of the animation at `animationPath` to PNG buffers.
 *
 * The on-disk file at `animationPath` MUST already represent the animation
 * whose frames we want — callers are responsible for writing it (typically a
 * library or generation `final.json`). We don't re-canonicalise here.
 *
 * Cached per-frame on disk; re-runs are free.
 */
export async function renderFrames(
  animationPath: string,
  frameNumbers: number[],
  opts: RenderFramesOptions,
): Promise<Buffer[]> {
  if (!existsSync(animationPath)) {
    throw new Error(`Animation file not found: ${animationPath}`);
  }

  const inlottieMissing = !existsSync(inlottieBin());
  if (inlottieMissing) markRendererBad();

  // Compute the on-disk render dimensions once. The caller picks the width;
  // the height matches the animation aspect.
  const header = readAnimationHeader(opts.animation);
  const aspect = header.h / header.w;
  const renderHeight = Math.max(1, Math.round(opts.width * aspect));

  const out: Buffer[] = [];
  const cacheDir = frameCacheDir(opts.contentHash);
  await fs.mkdir(cacheDir, { recursive: true });

  for (const frame of frameNumbers) {
    const cachePath = frameCachePath(opts.contentHash, frame, opts.width);
    if (await pathExists(cachePath)) {
      out.push(await fs.readFile(cachePath));
      continue;
    }

    let buf: Buffer | null = null;

    // Try inlottie first when it looks usable.
    if (!rendererKnownBad()) {
      const ok = await tryRenderFrame(animationPath, frame, opts.width, cachePath);
      if (ok) {
        buf = await fs.readFile(cachePath);
      } else {
        // First failure flips the global breaker so subsequent diff requests
        // (different generations, different frames) fail fast and skip the
        // doomed inlottie spawn.
        markRendererBad();
      }
    }

    // Fall back to the pure-JS rasteriser if inlottie didn't deliver.
    if (!buf) {
      if (!fallbackEnabled() || opts.animation === undefined) {
        throw new RendererUnavailableError(
          inlottieMissing
            ? `inlottie not found at ${inlottieBin()} and the JS fallback is disabled or unavailable. ` +
              `Install with \`cargo install inlottie\`, set INLOTTIE_BIN, or enable the fallback.`
            : `inlottie at ${inlottieBin()} did not produce a PNG (the bundled v0.1.9-g build is ` +
              `a GUI viewer) and the JS fallback is disabled or no animation JSON was supplied.`,
        );
      }
      buf = renderFrameFallback(opts.animation, frame, opts.width, renderHeight);
    }

    // Atomic write so a half-flushed cache file never lingers.
    await writeFileAtomic(cachePath, buf);
    out.push(buf);
  }

  return out;
}
