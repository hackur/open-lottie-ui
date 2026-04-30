/**
 * Headless thumbnail rendering via the `inlottie` Rust CLI.
 *
 * Cache layout: `<repo>/.cache/thumbs/<contentHashSlug>.png`
 * Key is the content hash (already in `meta.json`), so cache survives
 * across sessions and is automatically invalidated when the underlying
 * animation bytes change.
 *
 * Failure mode: returns `null` if the spawn fails, times out, or produces
 * no PNG. Callers should treat null as "fall back to live player".
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "@open-lottie/lottie-tools";
import { resolveTool } from "@/lib/detect-tools";

const RENDER_TIMEOUT_MS = 10_000;
const DEFAULT_WIDTH = 256;
const THUMBS_DIR = path.join(PATHS.cache, "thumbs");

/**
 * Strip the `sha256:` prefix and any non-hex chars so the hash is safe to
 * use as a filename component on every fs.
 */
function hashSlug(contentHash: string): string {
  const m = contentHash.match(/[0-9a-fA-F]{16,}/);
  return (m ? m[0] : contentHash.replace(/[^0-9a-zA-Z]/g, "")).toLowerCase();
}

function cachePathFor(contentHash: string, frame: number, width: number): string {
  // Frame + width are part of the key so callers can request alt sizes.
  return path.join(THUMBS_DIR, `${hashSlug(contentHash)}-f${frame}-w${width}.png`);
}

async function fileExistsNonEmpty(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

interface AnimationShape {
  ip?: number;
  op?: number;
}

/**
 * Pick a sensible default frame: middle of [ip, op]. Returns the input
 * frame clamped to that range when one is provided. Falls back to 0 when
 * the animation file can't be read.
 */
async function resolveFrame(
  animationPath: string,
  requested: number | undefined,
): Promise<number> {
  let ip = 0;
  let op = 0;
  try {
    const raw = await fs.readFile(animationPath, "utf8");
    const anim = JSON.parse(raw) as AnimationShape;
    if (typeof anim.ip === "number") ip = anim.ip;
    if (typeof anim.op === "number") op = anim.op;
  } catch {
    // Fall through to default 0.
  }

  const span = Math.max(0, op - ip);
  const mid = ip + Math.floor(span / 2);

  if (typeof requested !== "number" || !Number.isFinite(requested)) {
    return mid;
  }
  // Clamp to [ip, op].
  if (requested < ip) return ip;
  if (op > ip && requested > op) return op;
  return Math.floor(requested);
}

/**
 * Spawn `inlottie` to render the animation to a PNG. Resolves to true on
 * success (cache file exists and is non-empty), false otherwise.
 *
 * NOTE on argv: `inlottie --help` (v0.1.9) reports only the form
 * `inlottie [<path-to-file>]` and the README shows no headless flags.
 * The argv below uses the most plausible flag spellings (`--frame N`,
 * `--width N`, `-o PATH`) so a future version with headless export
 * should pick them up. If the binary doesn't recognize the flags it
 * exits non-zero and the caller falls back to the live player.
 */
function spawnInlottie(opts: {
  bin: string;
  inputPath: string;
  outputPath: string;
  frame: number;
  width: number;
}): Promise<boolean> {
  const { bin, inputPath, outputPath, frame, width } = opts;
  const argv = [
    "--frame",
    String(frame),
    "--width",
    String(width),
    "-o",
    outputPath,
    inputPath,
  ];

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(ok);
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(bin, argv, {
        stdio: ["ignore", "ignore", "pipe"],
      });
    } catch {
      finish(false);
      return;
    }

    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* noop */
      }
      finish(false);
    }, RENDER_TIMEOUT_MS);

    child.on("error", () => finish(false));
    child.on("exit", async (code) => {
      if (code !== 0) {
        finish(false);
        return;
      }
      finish(await fileExistsNonEmpty(outputPath));
    });
  });
}

export interface GetOrRenderThumbOptions {
  contentHash: string;
  /** Absolute path to the `animation.json` on disk. */
  animationPath: string;
  /** Optional explicit frame. Defaults to middle frame of the animation. */
  frame?: number;
  /** Output width in pixels. Defaults to 256. */
  width?: number;
}

export interface GetOrRenderThumbResult {
  path: string;
  cached: boolean;
}

/**
 * Returns the absolute path to a cached PNG thumbnail for the given
 * animation, rendering one if necessary. Returns null when rendering
 * fails (e.g. `inlottie` is not installed or doesn't support headless
 * export). The returned `cached` flag is true on cache hits.
 */
export async function getOrRenderThumb(
  opts: GetOrRenderThumbOptions,
): Promise<GetOrRenderThumbResult | null> {
  const width = opts.width ?? DEFAULT_WIDTH;
  const frame = await resolveFrame(opts.animationPath, opts.frame);
  const out = cachePathFor(opts.contentHash, frame, width);

  if (await fileExistsNonEmpty(out)) {
    return { path: out, cached: true };
  }

  // Make sure the cache dir exists before spawning.
  try {
    await fs.mkdir(THUMBS_DIR, { recursive: true });
  } catch {
    return null;
  }

  // Sanity check the input animation.
  try {
    const st = await fs.stat(opts.animationPath);
    if (!st.isFile()) return null;
  } catch {
    return null;
  }

  const bin = (await resolveTool("inlottie")) ?? "inlottie";
  const ok = await spawnInlottie({
    bin,
    inputPath: opts.animationPath,
    outputPath: out,
    frame,
    width,
  });

  if (!ok) {
    // Best-effort cleanup of any partial output.
    try {
      await fs.unlink(out);
    } catch {
      /* noop */
    }
    return null;
  }

  return { path: out, cached: false };
}
