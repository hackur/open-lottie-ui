import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { data, validator } from "@open-lottie/lottie-tools";
import {
  convertVideoToLottie,
  VideoImportError,
} from "@/lib/video-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 50 MB hard cap on input bytes — see CLAUDE.md / spec for the size warning. */
const MAX_INPUT_BYTES = 50 * 1024 * 1024;

/**
 * POST /api/import/video
 *
 * Accepts a video / GIF / WebP / APNG via either:
 *   - `multipart/form-data` with a single `file` field, or
 *   - a raw body with `content-type: video/...` (or `image/gif`, `image/webp`).
 *
 * Optional query params: `fps`, `maxFrames`, `width` — passed through to the
 * importer (see `apps/admin/lib/video-import.ts`).
 *
 * Returns `{ id, frame_count, bytes_in, bytes_out, warnings }`.
 */
export async function POST(req: Request): Promise<Response> {
  const ct = req.headers.get("content-type") || "";
  const url = new URL(req.url);
  const fps = parseOptionalInt(url.searchParams.get("fps"));
  const maxFrames = parseOptionalInt(url.searchParams.get("maxFrames"));
  const width = parseOptionalInt(url.searchParams.get("width"));

  let buffer: Buffer | null = null;
  let filename = "imported.mp4";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "multipart upload missing `file` field" },
          { status: 400 },
        );
      }
      filename = file.name || filename;
      buffer = Buffer.from(await file.arrayBuffer());
    } else if (
      ct.startsWith("video/") ||
      ct.startsWith("image/gif") ||
      ct.startsWith("image/webp") ||
      ct.startsWith("image/apng") ||
      ct.startsWith("application/octet-stream")
    ) {
      const ab = await req.arrayBuffer();
      buffer = Buffer.from(ab);
      filename =
        url.searchParams.get("filename") ||
        defaultFilenameFromContentType(ct, filename);
    } else {
      return NextResponse.json(
        {
          error: `Unsupported content-type: ${ct || "(empty)"}. Use multipart/form-data or video/*, image/gif, image/webp, image/apng.`,
        },
        { status: 415 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to read body: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  if (!buffer || buffer.length === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  if (buffer.length > MAX_INPUT_BYTES) {
    return NextResponse.json(
      {
        error: `Input too large: ${buffer.length} bytes (cap is ${MAX_INPUT_BYTES}). Trim the source video before importing.`,
      },
      { status: 413 },
    );
  }

  let result;
  try {
    result = await convertVideoToLottie({
      buffer,
      filename,
      fps,
      maxFrames,
      width,
    });
  } catch (e) {
    if (e instanceof VideoImportError) {
      const status = e.code === "ffmpeg-missing" ? 503 : 500;
      return NextResponse.json(
        { error: e.message, code: e.code, stderr: e.stderr },
        { status },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const validation = validator.validate(result.animation);

  const promptSummary = `Imported from ${filename}`;
  const gen = await data.createGeneration({
    prompt_summary: promptSummary,
    tier: 1,
    template_id: null,
    model: "video-import",
    base_id: null,
    prompt_markdown: importPromptMd({
      filename,
      bytesIn: result.bytes_in,
      bytesOut: result.bytes_out,
      frameCount: result.frame_count,
      fps: fps ?? 24,
      width: width ?? 400,
      warnings: result.warnings,
    }),
  });

  await data.writeGenerationVersion(gen.id, 1, result.animation);
  const entry = await data.getGeneration(gen.id);
  await fs.copyFile(
    path.join(entry.dir, "v1.json"),
    path.join(entry.dir, "final.json"),
  );

  await data.updateGenerationMeta(gen.id, {
    final_version: 1,
    versions: [
      { v: 1, validated: validation.valid, errors_count: validation.errors.length },
    ],
    validation: { ok: validation.valid, errors: validation.errors as unknown[] },
    cost_usd: 0,
    num_turns: 0,
  });
  await data.setGenerationStatus(gen.id, "pending-review");

  await data.appendDecision({
    gen: gen.id,
    action: "created",
    tier: 1,
    plugin: "video-import",
    filename,
    bytes_in: result.bytes_in,
    bytes_out: result.bytes_out,
    frame_count: result.frame_count,
  });
  await data.appendDecision({
    gen: gen.id,
    action: "validated",
    ok: validation.valid,
    errors: validation.errors.length,
  });

  return NextResponse.json({
    id: gen.id,
    frame_count: result.frame_count,
    bytes_in: result.bytes_in,
    bytes_out: result.bytes_out,
    warnings: result.warnings,
  });
}

function parseOptionalInt(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function defaultFilenameFromContentType(ct: string, fallback: string): string {
  if (ct.startsWith("image/gif")) return "imported.gif";
  if (ct.startsWith("image/webp")) return "imported.webp";
  if (ct.startsWith("image/apng")) return "imported.apng";
  if (ct.startsWith("video/mp4")) return "imported.mp4";
  if (ct.startsWith("video/webm")) return "imported.webm";
  if (ct.startsWith("video/quicktime")) return "imported.mov";
  return fallback;
}

function importPromptMd(opts: {
  filename: string;
  bytesIn: number;
  bytesOut: number;
  frameCount: number;
  fps: number;
  width: number;
  warnings: string[];
}): string {
  const ratio = opts.bytesIn > 0 ? (opts.bytesOut / opts.bytesIn).toFixed(2) : "n/a";
  return [
    "# Video import",
    "",
    `**Plugin**: \`video-import\` (ffmpeg → embedded PNG frames in Lottie image layers)`,
    `**File**: \`${opts.filename}\``,
    `**Frames**: ${opts.frameCount} @ ${opts.fps} fps`,
    `**Width**: ${opts.width}px`,
    `**Size**: ${opts.bytesIn} bytes in → ${opts.bytesOut} bytes out (${ratio}× of source)`,
    "",
    "## Notes",
    "- Each frame is base64-PNG embedded in `assets[]` (`e: 1`).",
    "- One `ty: 2` image layer per frame; playback is sequential at the configured fps.",
    "- This is *raster-Lottie* — the file is a passthrough of the source video frames, not a vector animation.",
    "- No LLM was involved.",
    ...(opts.warnings.length
      ? ["", "## Warnings", ...opts.warnings.map((w) => `- ${w}`)]
      : []),
    "",
  ].join("\n");
}
