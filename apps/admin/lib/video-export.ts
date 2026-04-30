import "server-only";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { diff, PATHS } from "@open-lottie/lottie-tools";

const { renderFrameFallbackEx, readAnimationHeader } = diff;

/**
 * Local "Lottie → transparent video" exporter.
 *
 * Pipeline (per ADR / sprint task #113):
 *   1. Read `[ip, op)` and intrinsic `(w, h, fr)` from the animation JSON.
 *   2. Rasterise each frame with the pure-JS fallback renderer in transparent
 *      mode. Cache the per-frame PNG under `.cache/video-frames/<hash>/...`.
 *   3. Spawn `ffmpeg` over the PNG sequence, encoding to one of:
 *        - `mov-prores`  : ProRes 4444, `yuva444p10le` — alpha-capable MOV.
 *        - `webm-vp9`    : VP9, `yuva420p` — alpha-capable WebM (web-friendly).
 *        - `gif`         : palette-with-alpha, binary mask only.
 *   4. Cache the final container under `.cache/exports/<hash>-<format>` so
 *      repeat downloads are essentially free.
 *
 * We deliberately do NOT spawn `inlottie`: the bundled v0.1.9-g build is a
 * GUI viewer and hangs the dev server. The fallback renderer handles the
 * `el` / `rc` + `fl` shape subset our M0 templates produce; anything else
 * is recorded as a `warning` and the exporter renders what it can.
 */

export type VideoExportFormat = "mov-prores" | "webm-vp9" | "gif";

export interface VideoExportOptions {
  /** Parsed Lottie animation JSON. */
  animation: unknown;
  /** Stable hash for caching (typically `meta.content_hash`). */
  contentHash: string;
  format: VideoExportFormat;
  /** Render width in CSS pixels. Defaults to `animation.w`. */
  width?: number;
  /** Frames-per-second. Defaults to `animation.fr`. */
  fps?: number;
}

export interface VideoExportResult {
  bytes: Uint8Array;
  contentType: string;
  /** Suggested filename (no path). */
  filename: string;
  /** True if the final container came straight from the on-disk cache. */
  cached: boolean;
  /** Shape `ty` strings the fallback renderer skipped (deduped). */
  warnings: string[];
}

export class VideoExportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "ffmpeg-missing"
      | "ffmpeg-failed"
      | "timeout"
      | "bad-input",
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "VideoExportError";
  }
}

/** Hard wall-clock cap for ffmpeg. Beyond this we kill the child. */
const FFMPEG_TIMEOUT_MS = 60_000;

interface FormatSpec {
  contentType: string;
  ext: string;
  /** Build the ffmpeg argv after the `-framerate F -i %04d.png` prefix. */
  encArgs(out: string): string[];
}

const FORMATS: Record<VideoExportFormat, FormatSpec> = {
  // ProRes 4444 — alpha-capable MOV; broad pro-tool compatibility (FCP, AE,
  // DaVinci). 10-bit per channel. We add `+faststart` for streamable atoms.
  "mov-prores": {
    contentType: "video/quicktime",
    ext: "mov",
    encArgs: (out) => [
      "-c:v", "prores_ks",
      "-profile:v", "4444",
      "-pix_fmt", "yuva444p10le",
      "-movflags", "+faststart",
      out,
    ],
  },
  // VP9 in a WebM container — alpha-capable, web-friendly. `auto-alt-ref 0`
  // is required by libvpx-vp9 when using `yuva420p`.
  "webm-vp9": {
    contentType: "video/webm",
    ext: "webm",
    encArgs: (out) => [
      "-c:v", "libvpx-vp9",
      "-pix_fmt", "yuva420p",
      "-b:v", "2M",
      "-auto-alt-ref", "0",
      out,
    ],
  },
  // Animated GIF with a binary alpha mask via palettegen+paletteuse. Bayer
  // dithering keeps colour bands tame; threshold 128 is the conventional
  // alpha cut-off.
  "gif": {
    contentType: "image/gif",
    ext: "gif",
    encArgs: (out) => [
      "-vf",
      "split[s0][s1];[s0]palettegen=stats_mode=full:reserve_transparent=on[p];[s1][p]paletteuse=alpha_threshold=128:dither=bayer",
      out,
    ],
  },
};

/** Locate ffmpeg on PATH. We don't lean on the `detect-tools` registry to
 * keep this module purely sync-PATH (and so we don't pop a probe spawn). */
async function resolveFfmpeg(): Promise<string | null> {
  const PATH = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of PATH) {
    if (!dir) continue;
    const p = path.join(dir, "ffmpeg");
    try {
      await fs.access(p);
      return p;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function safeHash(contentHash: string): string {
  return contentHash.replace(/[^a-zA-Z0-9_-]/g, "_");
}

interface AnimationHeader {
  ip: number;
  op: number;
  fr: number;
  w: number;
  h: number;
}

function header(animation: unknown): AnimationHeader {
  return readAnimationHeader(animation);
}

function frameDir(hash: string, width: number): string {
  // Scope by width so the image2 demuxer can use a clean `%04d.png` pattern.
  return path.join(PATHS.cache, "video-frames", safeHash(hash), `${width}w`);
}

function exportPath(hash: string, fmt: VideoExportFormat, width: number, fps: number): string {
  const spec = FORMATS[fmt];
  return path.join(
    PATHS.cache,
    "exports",
    `${safeHash(hash)}-${fmt}-${width}w-${fps}fps.${spec.ext}`,
  );
}

/**
 * Render `[ip, op)` to PNGs in `frameDir(...)`. Reuses cached frames when
 * present. Returns the absolute frame directory and the list of unsupported
 * shape types we skipped during rasterisation (deduped across frames).
 */
async function rasterise(
  animation: unknown,
  hash: string,
  width: number,
  height: number,
  ip: number,
  op: number,
): Promise<{ dir: string; warnings: string[] }> {
  const dir = frameDir(hash, width);
  await fs.mkdir(dir, { recursive: true });

  const warnings = new Set<string>();
  // image2 demuxer wants a contiguous 1-based sequence, so we re-number.
  let outIdx = 1;
  for (let f = ip; f < op; f++, outIdx++) {
    const target = path.join(dir, `${String(outIdx).padStart(4, "0")}.png`);
    try {
      await fs.access(target);
      continue; // cached
    } catch {
      /* fall through */
    }
    const { png, unsupported } = renderFrameFallbackEx(animation, f, width, height, {
      transparent: true,
    });
    for (const u of unsupported) warnings.add(u);
    await fs.writeFile(target, png);
  }
  return { dir, warnings: Array.from(warnings) };
}

/**
 * Spawn ffmpeg with a hard wall-clock timeout. Resolves to `{stdout, stderr}`
 * on success; rejects with {@link VideoExportError} otherwise.
 */
function runFfmpeg(
  bin: string,
  args: string[],
): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stderrChunks: string[] = [];
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, FFMPEG_TIMEOUT_MS);

    child.stderr.on("data", (b: Buffer) => stderrChunks.push(b.toString("utf8")));
    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        reject(
          new VideoExportError(
            "ffmpeg not found on PATH. Install with `brew install ffmpeg` (macOS).",
            "ffmpeg-missing",
          ),
        );
        return;
      }
      reject(
        new VideoExportError(
          `ffmpeg spawn failed: ${err.message}`,
          "ffmpeg-failed",
          stderrChunks.join(""),
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const stderr = stderrChunks.join("");
      if (timedOut) {
        reject(new VideoExportError(
          `ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`,
          "timeout",
          stderr,
        ));
        return;
      }
      if (code !== 0) {
        reject(new VideoExportError(
          `ffmpeg exited ${code}: ${stderr.split("\n").slice(-3).join(" / ").trim()}`,
          "ffmpeg-failed",
          stderr,
        ));
        return;
      }
      resolve({ stderr });
    });
  });
}

/**
 * Encode the PNG sequence at `frameDir/%04d@<W>.png` to `outPath` for the
 * requested format. Caller is responsible for setting up the frame dir.
 */
async function encode(
  bin: string,
  frameDirPath: string,
  fps: number,
  format: VideoExportFormat,
  outPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const inputPattern = path.join(frameDirPath, "%04d.png");
  const baseArgs = [
    "-y",
    "-framerate", String(fps),
    "-i", inputPattern,
  ];
  const args = baseArgs.concat(FORMATS[format].encArgs(outPath));
  await runFfmpeg(bin, args);
}

/** Public entry point — see module docstring. */
export async function exportVideo(
  opts: VideoExportOptions,
): Promise<VideoExportResult> {
  const ffmpegBin = await resolveFfmpeg();
  if (!ffmpegBin) {
    throw new VideoExportError(
      "ffmpeg not found on PATH. Install with `brew install ffmpeg` (macOS).",
      "ffmpeg-missing",
    );
  }

  const h = header(opts.animation);
  if (h.op <= h.ip) {
    throw new VideoExportError(
      `Animation has empty frame range (ip=${h.ip}, op=${h.op}).`,
      "bad-input",
    );
  }
  const width = opts.width ?? h.w;
  const fps = opts.fps ?? h.fr;
  const aspect = h.h / h.w;
  const renderHeight = Math.max(1, Math.round(width * aspect));

  const out = exportPath(opts.contentHash, opts.format, width, fps);
  const spec = FORMATS[opts.format];
  const filename = `${safeHash(opts.contentHash).slice(0, 16)}.${spec.ext}`;

  // Fast path — cached final container.
  let cached = false;
  try {
    await fs.access(out);
    cached = true;
  } catch {
    /* miss; encode below */
  }

  let warnings: string[] = [];
  if (!cached) {
    const ras = await rasterise(
      opts.animation,
      opts.contentHash,
      width,
      renderHeight,
      h.ip,
      h.op,
    );
    warnings = ras.warnings;
    await encode(ffmpegBin, ras.dir, fps, opts.format, out);
  }

  const bytes = await fs.readFile(out);
  return {
    bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    contentType: spec.contentType,
    filename,
    cached,
    warnings,
  };
}
