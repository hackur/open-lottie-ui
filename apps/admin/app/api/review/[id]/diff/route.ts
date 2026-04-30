/**
 * GET /api/review/[id]/diff
 *
 * Renders both the base and the generation through `inlottie`, runs `pixelmatch`
 * over a fixed sample of frames, and returns a per-frame diff summary plus the
 * peak ratio. Per-frame PNG bytes are written to `.cache/diff/<gen>/<n>.png` so
 * the sibling `frame/<n>` route can serve them as `image/png`.
 *
 * Errors:
 *   400 — generation has no `base_id` (diff requires a remix)
 *   404 — generation or base library entry not found
 *   503 — `inlottie` missing or unable to render headless
 */

import path from "node:path";
import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";

import { data, diff as diffMod, hash, PATHS } from "@open-lottie/lottie-tools";
import { withErrorCapture } from "@/lib/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorCapture<{ params: Promise<{ id: string }> }>(
  "GET /api/review/[id]/diff",
  async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  let gen;
  try {
    gen = await data.getGeneration(decoded);
  } catch {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  if (!gen.meta.base_id) {
    return NextResponse.json(
      { error: "Diff requires a remix" },
      { status: 400 },
    );
  }

  let baseAnimation: unknown;
  try {
    baseAnimation = await data.getLibraryAnimation(gen.meta.base_id);
  } catch {
    return NextResponse.json(
      { error: `Base library entry not found: ${gen.meta.base_id}` },
      { status: 404 },
    );
  }

  let genAnimation: unknown;
  try {
    genAnimation = await data.getGenerationFinalAnimation(decoded);
  } catch {
    return NextResponse.json(
      { error: "Generation has no final animation yet" },
      { status: 404 },
    );
  }

  const baseHash = hash.contentHash(baseAnimation);
  const genHash = hash.contentHash(genAnimation);

  let result: Awaited<ReturnType<typeof diffMod.diffAnimations>>;
  try {
    result = await diffMod.diffAnimations({
      baseAnimation,
      genAnimation,
      baseHash,
      genHash,
      frameCount: 6,
      width: 200,
    });
  } catch (e) {
    if (e instanceof diffMod.RendererUnavailableError) {
      return NextResponse.json(
        {
          error: "inlottie renderer unavailable",
          detail: e.message,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Diff failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  // Write per-frame diff PNGs to the gen-scoped diff cache so the sibling
  // `frame/<n>` route can stream them.
  const cacheDir = path.join(PATHS.cache, "diff", decoded);
  await fs.mkdir(cacheDir, { recursive: true });
  await Promise.all(
    result.frameDiffs.map((d) =>
      fs.writeFile(path.join(cacheDir, `${d.frame}.png`), d.diffPng),
    ),
  );

  const peakPct = (result.maxRatio * 100).toFixed(1);
  return NextResponse.json({
    frames: result.frames,
    frame_diffs: result.frameDiffs.map((d) => ({
      frame: d.frame,
      ratio: Number(d.ratio.toFixed(6)),
      mismatch_pixels: d.mismatchPixels,
    })),
    max_ratio: Number(result.maxRatio.toFixed(6)),
    peak_frame: result.peakFrame,
    width: result.width,
    height: result.height,
    summary: `${peakPct}% changed peak`,
  });
  },
);
