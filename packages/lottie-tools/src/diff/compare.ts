/**
 * Pixel-level frame comparison.
 *
 * Decodes incoming PNG buffers with `pngjs` (pure-JS), then runs `pixelmatch`
 * on the raw RGBA pixel arrays. Returns a fresh PNG buffer per frame containing
 * the diff visualisation (red = changed pixels, semi-transparent base layer).
 *
 * Frames whose dimensions don't match are auto-sized down to the intersection
 * to keep `pixelmatch` happy — mismatched sizes shouldn't happen in practice
 * because the caller renders both at the same width.
 */

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import type { FrameDiff } from "./types.ts";

interface DecodedPng {
  width: number;
  height: number;
  data: Buffer;
}

function decode(buf: Buffer): DecodedPng {
  const png = PNG.sync.read(buf);
  return { width: png.width, height: png.height, data: png.data };
}

function encode(width: number, height: number, data: Buffer): Buffer {
  const png = new PNG({ width, height });
  data.copy(png.data);
  return PNG.sync.write(png);
}

/**
 * Compare two parallel arrays of PNG frame buffers.
 *
 * Both arrays must have the same length and matching frame indices — if you
 * picked frames `[0, 12, 24]` for the base, you must pass the corresponding
 * `[0, 12, 24]` for the generation in the same order. The `frameNumbers`
 * array is what shows up in the returned `FrameDiff.frame` field.
 */
export interface CompareOptions {
  /** pixelmatch threshold (0..1). Default 0.1. */
  threshold?: number;
  /** Frame numbers parallel to the buffers. Used as labels only. */
  frameNumbers?: number[];
}

export function compareFrames(
  baseFrames: Buffer[],
  genFrames: Buffer[],
  opts: CompareOptions = {},
): FrameDiff[] {
  if (baseFrames.length !== genFrames.length) {
    throw new Error(
      `compareFrames: base/gen length mismatch (${baseFrames.length} vs ${genFrames.length})`,
    );
  }
  const threshold = opts.threshold ?? 0.1;
  const labels = opts.frameNumbers ?? baseFrames.map((_, i) => i);
  const out: FrameDiff[] = [];

  for (let i = 0; i < baseFrames.length; i++) {
    const a = decode(baseFrames[i]);
    const b = decode(genFrames[i]);
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    if (w <= 0 || h <= 0) {
      throw new Error(
        `compareFrames: degenerate dims at frame ${labels[i]} (${a.width}×${a.height} vs ${b.width}×${b.height})`,
      );
    }
    const total = w * h;
    const aData = cropRGBA(a.data, a.width, a.height, w, h);
    const bData = cropRGBA(b.data, b.width, b.height, w, h);
    const diff = Buffer.alloc(total * 4);
    const mismatchPixels = pixelmatch(aData, bData, diff, w, h, {
      threshold,
      includeAA: false,
    });
    out.push({
      frame: labels[i],
      mismatchPixels,
      totalPixels: total,
      ratio: total === 0 ? 0 : mismatchPixels / total,
      diffPng: encode(w, h, diff),
    });
  }

  return out;
}

/**
 * Crop an RGBA pixel buffer from `(srcW × srcH)` to `(w × h)` (top-left origin).
 * Same-size inputs return a reference-copy. Cheap O(w·h).
 */
function cropRGBA(
  src: Buffer,
  srcW: number,
  srcH: number,
  w: number,
  h: number,
): Buffer {
  if (srcW === w && srcH === h) return src;
  const dst = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = y * srcW * 4;
    dst.set(src.subarray(srcStart, srcStart + w * 4), y * w * 4);
  }
  return dst;
}
