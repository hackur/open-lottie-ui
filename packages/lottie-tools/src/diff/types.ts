/**
 * Visual-diff types for remix generations.
 *
 * Pairs a base animation against a generated animation, renders a fixed number
 * of evenly-spaced frames through `inlottie`, and runs `pixelmatch` over each
 * pair. See `./render-frames.ts` for the rendering pipeline and `./compare.ts`
 * for the comparison logic.
 */

export interface DiffOptions {
  /** Base animation JSON (parsed). */
  baseAnimation: unknown;
  /** Generated animation JSON (parsed). */
  genAnimation: unknown;
  /** Stable hash of the base animation (used as the frame-cache key). */
  baseHash: string;
  /** Stable hash of the generated animation (used as the frame-cache key). */
  genHash: string;
  /** How many frames to sample. Defaults to 6. Clamped to [1, 60]. */
  frameCount?: number;
  /** Render width in pixels. Height matches the animation aspect ratio. Defaults to 200. */
  width?: number;
  /** pixelmatch threshold passed straight through. Defaults to 0.1. */
  threshold?: number;
}

export interface FrameDiff {
  /** Frame number sampled (in the base animation's frame space, clamped to [ip, op]). */
  frame: number;
  /** Number of pixels that differ above the threshold. */
  mismatchPixels: number;
  /** Total pixel count (width × height). */
  totalPixels: number;
  /** mismatchPixels / totalPixels in [0, 1]. */
  ratio: number;
  /** PNG bytes of the diff visualization (red = changed pixels). */
  diffPng: Buffer;
}

export interface DiffResult {
  /** Number of frames sampled. */
  frames: number;
  /** Per-frame diff entries, sorted by frame ascending. */
  frameDiffs: FrameDiff[];
  /** Maximum ratio across all frames (peak diff). */
  maxRatio: number;
  /** Frame number at which the peak ratio was observed. */
  peakFrame: number;
  /** Width / height of each rendered frame. */
  width: number;
  height: number;
}

/**
 * Thrown when the inlottie renderer is missing or doesn't support headless
 * frame export. The API layer surfaces this as HTTP 503.
 */
export class RendererUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RendererUnavailableError";
  }
}
