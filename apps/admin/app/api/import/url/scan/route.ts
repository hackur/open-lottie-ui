import { NextResponse } from "next/server";

import {
  fetchAndExtract,
  scanCandidates,
  type ScannedAsset,
} from "@/lib/asset-scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Strip the `preview` blob from results that are too big to ship inline. */
const PREVIEW_INLINE_MAX_BYTES = 100 * 1024;

/**
 * POST /api/import/url/scan
 * Body: `{ url: string }`
 *
 * Fetches the page, extracts Lottie candidates, fetches + validates each.
 * Caps: 30 assets, 5MB per asset, 50MB total.
 *
 * Returns `{ ok, page_url, candidates, scanned }`. `preview` is stripped from
 * any scanned entry whose body is over 100KB to keep the response payload
 * sane — the client can re-fetch on demand if it really needs the JSON.
 */
export async function POST(req: Request): Promise<Response> {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const pageUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!pageUrl) {
    return NextResponse.json({ error: "Missing `url`" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(pageUrl)) {
    return NextResponse.json(
      { error: "URL must start with http:// or https://" },
      { status: 400 },
    );
  }

  let extracted;
  try {
    extracted = await fetchAndExtract(pageUrl);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not fetch page: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 504 },
    );
  }

  const scanned = await scanCandidates(extracted.candidates, {
    inlineHtml: extracted.html,
  });

  // Strip oversized preview blobs from the wire response.
  const lite: ScannedAsset[] = scanned.map((s) => {
    if (s.preview && typeof s.bytes === "number" && s.bytes > PREVIEW_INLINE_MAX_BYTES) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { preview: _omit, ...rest } = s;
      return rest;
    }
    return s;
  });

  return NextResponse.json({
    ok: true,
    page_url: pageUrl,
    candidates: extracted.candidates,
    scanned: lite,
  });
}
