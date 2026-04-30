/**
 * Public surface for the visual-diff module.
 *
 * Pipeline:
 *   1. Read header (ip/op/w/h) of the BASE animation; pick N evenly-spaced frames.
 *   2. Materialise both animations to disk (under `.cache/diff/.../animation.json`)
 *      so the inlottie spawn shape is uniform.
 *   3. Render each frame for both animations through `inlottie`.
 *   4. pixelmatch each pair → per-frame `FrameDiff`.
 *   5. Compute summary (peak frame, max ratio).
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "../paths.ts";
import { writeJsonAtomic } from "../data/atomic.ts";

import { compareFrames } from "./compare.ts";
import {
  pickFrames,
  readAnimationHeader,
  renderFrames,
} from "./render-frames.ts";
import {
  RendererUnavailableError,
  type DiffOptions,
  type DiffResult,
  type FrameDiff,
} from "./types.ts";

export { compareFrames } from "./compare.ts";
export {
  pickFrames,
  clampFrames,
  readAnimationHeader,
  renderFrames,
  frameKey,
} from "./render-frames.ts";
export { RendererUnavailableError } from "./types.ts";
export type { DiffOptions, DiffResult, FrameDiff } from "./types.ts";

/**
 * Spill the animation JSON to disk under `.cache/diff/<hash>/animation.json` so
 * `inlottie` can pick it up. Reused on subsequent runs; we never delete the
 * cache directory automatically.
 */
async function materialiseAnimation(
  animation: unknown,
  contentHash: string,
): Promise<string> {
  const safe = contentHash.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(PATHS.cache, "diff", safe);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, "animation.json");
  // Skip the rewrite if we've already spilled identical content.
  try {
    await fs.access(target);
    return target;
  } catch {
    /* fall through to write */
  }
  await writeJsonAtomic(target, animation);
  return target;
}

/**
 * Top-level orchestrator. Returns a fully-populated `DiffResult`.
 *
 * Throws `RendererUnavailableError` (typed) if `inlottie` can't produce a PNG.
 * Other failures (size mismatches, bad inputs) throw plain `Error`.
 */
export async function diffAnimations(opts: DiffOptions): Promise<DiffResult> {
  const width = opts.width ?? 200;
  const frameCount = opts.frameCount ?? 6;

  const baseHeader = readAnimationHeader(opts.baseAnimation);
  const frames = pickFrames(frameCount, baseHeader.ip, baseHeader.op);

  // Render at the requested width preserving aspect ratio.
  const aspect = baseHeader.h / baseHeader.w;
  const height = Math.max(1, Math.round(width * aspect));

  const [basePath, genPath] = await Promise.all([
    materialiseAnimation(opts.baseAnimation, opts.baseHash),
    materialiseAnimation(opts.genAnimation, opts.genHash),
  ]);

  const [baseBufs, genBufs] = await Promise.all([
    renderFrames(basePath, frames, {
      contentHash: opts.baseHash,
      width,
      animation: opts.baseAnimation,
    }),
    renderFrames(genPath, frames, {
      contentHash: opts.genHash,
      width,
      animation: opts.genAnimation,
    }),
  ]);

  const frameDiffs = compareFrames(baseBufs, genBufs, {
    threshold: opts.threshold ?? 0.1,
    frameNumbers: frames,
  });

  const { maxRatio, peakFrame } = pickPeak(frameDiffs);

  return {
    frames: frames.length,
    frameDiffs,
    maxRatio,
    peakFrame,
    width,
    height,
  };
}

function pickPeak(diffs: FrameDiff[]): { maxRatio: number; peakFrame: number } {
  let maxRatio = 0;
  let peakFrame = diffs[0]?.frame ?? 0;
  for (const d of diffs) {
    if (d.ratio > maxRatio) {
      maxRatio = d.ratio;
      peakFrame = d.frame;
    }
  }
  return { maxRatio, peakFrame };
}

// Sanity-check: keep the unused-import linter quiet by referencing the typed
// error explicitly here.
void RendererUnavailableError;
