/**
 * Video / GIF / WebP / APNG → Lottie importer.
 *
 * Embeds each input frame as a base64-encoded PNG inside an image asset
 * (`assets[]` entries with `e: 1`) and pairs each with a one-frame image layer
 * (`ty: 2`). The resulting JSON plays back the source frame-by-frame at the
 * requested fps. This is *raster-Lottie*: filesize tends to be larger than the
 * input video, but downstream tooling that only speaks Lottie can consume it.
 *
 * Hard runtime requirement: `ffmpeg` on PATH. We never link ffmpeg directly —
 * always invoked as a subprocess.
 */
import "server-only";

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type VideoImportInput = {
  /** Raw video bytes (mp4/mov/webm/gif/webp/apng/etc). */
  buffer: Buffer;
  filename: string;
  /** Frames per second to extract — passed to ffmpeg's `fps=` filter. */
  fps?: number;
  /** Maximum frames to extract; longer inputs get truncated. */
  maxFrames?: number;
  /** Target width; height is computed to preserve aspect ratio (`-2` flag). */
  width?: number;
};

export type VideoImportResult = {
  /** Lottie JSON ready to validate. */
  animation: unknown;
  frame_count: number;
  duration_seconds: number;
  bytes_in: number;
  bytes_out: number;
  warnings: string[];
};

export type VideoImportErrorCode =
  | "ffmpeg-missing"
  | "ffmpeg-failed"
  | "no-frames"
  | "bad-png"
  | "io-error";

export class VideoImportError extends Error {
  constructor(
    message: string,
    public readonly code: VideoImportErrorCode,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "VideoImportError";
  }
}

const DEFAULT_FPS = 24;
const DEFAULT_MAX_FRAMES = 240;
const DEFAULT_WIDTH = 400;

/**
 * Parse the IHDR chunk of a PNG buffer to extract width/height. The PNG file
 * format always opens with the 8-byte signature followed by the IHDR chunk:
 *   - 4 bytes length (== 13)
 *   - 4 bytes type ('IHDR')
 *   - 4 bytes width (big-endian)
 *   - 4 bytes height (big-endian)
 * We only need width/height so a manual parse beats pulling in pngjs.
 */
function readPngDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.length < 24) {
    throw new VideoImportError("PNG too short to contain IHDR", "bad-png");
  }
  // Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] !== 0x89 ||
    buf[1] !== 0x50 ||
    buf[2] !== 0x4e ||
    buf[3] !== 0x47 ||
    buf[4] !== 0x0d ||
    buf[5] !== 0x0a ||
    buf[6] !== 0x1a ||
    buf[7] !== 0x0a
  ) {
    throw new VideoImportError("Buffer does not start with PNG signature", "bad-png");
  }
  // Chunk header at offset 8: 4-byte length, 4-byte type. IHDR data starts at 16.
  const type = buf.subarray(12, 16).toString("ascii");
  if (type !== "IHDR") {
    throw new VideoImportError(`Expected IHDR chunk, got ${type}`, "bad-png");
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/** Generate a temp directory under os.tmpdir() with a random suffix. */
async function makeTempDir(prefix: string): Promise<string> {
  const dir = path.join(os.tmpdir(), `${prefix}-${randomBytes(6).toString("hex")}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Run ffmpeg, capturing stderr for error reporting. Resolves on exit code 0. */
function runFfmpeg(args: string[]): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      reject(
        new VideoImportError(
          `Failed to spawn ffmpeg: ${e instanceof Error ? e.message : String(e)}`,
          "ffmpeg-missing",
        ),
      );
      return;
    }

    const stderrChunks: string[] = [];
    child.stdout.on("data", () => {
      // ffmpeg writes status to stderr; stdout is empty when -f isn't pipe.
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk.toString("utf8"));
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new VideoImportError(
            "ffmpeg not found on PATH. Install ffmpeg (`brew install ffmpeg` on macOS) to use video imports.",
            "ffmpeg-missing",
          ),
        );
        return;
      }
      reject(
        new VideoImportError(`ffmpeg spawn error: ${err.message}`, "ffmpeg-failed"),
      );
    });

    child.on("close", (code: number | null) => {
      const stderr = stderrChunks.join("");
      if (code !== 0) {
        reject(
          new VideoImportError(
            `ffmpeg exited ${code}: ${stderr.split("\n").slice(-5).join("\n").trim() || "(no stderr)"}`,
            "ffmpeg-failed",
            stderr,
          ),
        );
        return;
      }
      resolve({ stderr });
    });
  });
}

/**
 * Convert a video / animated image buffer to a Lottie JSON. See module
 * docstring for the size caveat.
 */
export async function convertVideoToLottie(
  opts: VideoImportInput,
): Promise<VideoImportResult> {
  const fps = clampNumber(opts.fps ?? DEFAULT_FPS, 1, 120);
  const maxFrames = clampNumber(opts.maxFrames ?? DEFAULT_MAX_FRAMES, 1, 1200);
  const width = clampNumber(opts.width ?? DEFAULT_WIDTH, 16, 4096);
  const warnings: string[] = [];
  const bytesIn = opts.buffer.length;

  // Stage 1: lay the input out on disk for ffmpeg.
  const workDir = await makeTempDir("ovi-import");
  const inExt = inferInputExtension(opts.filename);
  const inputPath = path.join(workDir, `input${inExt}`);
  const framesDir = path.join(workDir, "frames");
  await fs.mkdir(framesDir);

  try {
    await fs.writeFile(inputPath, opts.buffer);

    // Stage 2: extract frames as PNG. The `scale=W:-2` flag makes ffmpeg pick
    // an even height that preserves aspect ratio. `-frame_pts 1` avoids
    // collisions when ffmpeg dedups identical frames.
    const filter = `fps=${fps},scale=${width}:-2:flags=lanczos`;
    const ffmpegArgs = [
      "-y",
      "-i",
      inputPath,
      "-vf",
      filter,
      "-vframes",
      String(maxFrames),
      "-frame_pts",
      "1",
      path.join(framesDir, "frame_%04d.png"),
    ];

    await runFfmpeg(ffmpegArgs);

    // Stage 3: gather frames, sorted by name (ffmpeg pads to 4 digits).
    const entries = (await fs.readdir(framesDir))
      .filter((n) => n.endsWith(".png"))
      .sort();

    if (entries.length === 0) {
      throw new VideoImportError(
        "ffmpeg produced no frames — check that the input is a recognized media file",
        "no-frames",
      );
    }

    if (entries.length >= maxFrames) {
      warnings.push(
        `Truncated to maxFrames=${maxFrames}; longer inputs are clipped.`,
      );
    }

    // Stage 4: build the Lottie JSON. One asset + one layer per frame.
    const assets: unknown[] = [];
    const layers: unknown[] = [];

    let inferredHeight = 0;
    let bytesOut = 0;

    for (let i = 0; i < entries.length; i++) {
      const filePath = path.join(framesDir, entries[i]);
      const png = await fs.readFile(filePath);
      const { width: pngW, height: pngH } = readPngDimensions(png);
      if (i === 0) {
        inferredHeight = pngH;
      }
      const id = `img_${String(i + 1).padStart(4, "0")}`;
      const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
      bytesOut += dataUrl.length;

      assets.push({
        id,
        w: pngW,
        h: pngH,
        u: "",
        p: dataUrl,
        e: 1,
      });

      layers.push({
        ddd: 0,
        ind: i + 1,
        ty: 2,
        nm: `frame ${i + 1}`,
        refId: id,
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [pngW / 2, pngH / 2, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        ip: i,
        op: i + 1,
        st: 0,
        bm: 0,
      });
    }

    const frameCount = entries.length;
    const animation = {
      v: "5.12.0",
      fr: fps,
      ip: 0,
      op: frameCount,
      w: width,
      h: inferredHeight,
      nm: opts.filename || "imported video",
      ddd: 0,
      assets,
      layers,
      meta: {
        g: "open-lottie-ui video-import",
      },
    };

    return {
      animation,
      frame_count: frameCount,
      duration_seconds: frameCount / fps,
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      warnings,
    };
  } finally {
    // Cleanup — best-effort.
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function inferInputExtension(filename: string): string {
  const lower = filename.toLowerCase();
  const idx = lower.lastIndexOf(".");
  if (idx === -1) return "";
  const ext = lower.slice(idx);
  // Allow a known set; default to a generic extension that ffmpeg can demux.
  const allowed = [".mp4", ".mov", ".webm", ".gif", ".webp", ".apng", ".png", ".m4v", ".mkv", ".avi"];
  return allowed.includes(ext) ? ext : "";
}
