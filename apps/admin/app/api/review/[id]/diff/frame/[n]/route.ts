/**
 * GET /api/review/[id]/diff/frame/[n]
 *
 * Streams the cached diff PNG for `frame n` of generation `id`. Reads from
 * `.cache/diff/<gen-id>/<n>.png`, populated by the sibling `…/diff` route on
 * its first call. If the cache file is missing we return 404 — the client
 * should hit `…/diff` first.
 */

import path from "node:path";
import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";

import { PATHS } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; n: string }> },
) {
  const { id, n } = await params;
  const genId = decodeURIComponent(id);
  const frame = Number.parseInt(n, 10);
  if (!Number.isFinite(frame) || frame < 0) {
    return NextResponse.json({ error: "Invalid frame number" }, { status: 400 });
  }

  const target = path.join(PATHS.cache, "diff", genId, `${frame}.png`);
  let buf: Buffer;
  try {
    buf = await fs.readFile(target);
  } catch {
    return NextResponse.json(
      { error: "Diff PNG not cached. Call /api/review/<id>/diff first." },
      { status: 404 },
    );
  }

  // Web `Response` wants a `BodyInit` over `ArrayBuffer` (not the
  // `SharedArrayBuffer`-tolerant `ArrayBufferLike` that Node's `Buffer`
  // surfaces). Copy bytes into a fresh ArrayBuffer to satisfy the typings.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return new Response(ab, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=300",
    },
  });
}
