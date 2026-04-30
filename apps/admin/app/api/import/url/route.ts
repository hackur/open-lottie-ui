import { NextResponse } from "next/server";

import { scrapeUrl, type ScrapedAsset } from "@/lib/url-scrape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Don't ship preview blobs over a hundred KB inline — keep responses lean. */
const PREVIEW_INLINE_MAX_BYTES = 100 * 1024;

/**
 * POST /api/import/url
 *
 * Body: `{ url: string }`. Returns `{ assets: ScrapedAsset[] }`.
 *
 * - 400 if the URL is missing / not http(s).
 * - 503 if the fetch fails outright (DNS, timeout, abort).
 *
 * Local-only by default (no CORS headers; lives behind 127.0.0.1 dev server).
 */
export async function POST(req: Request): Promise<Response> {
  let body: { url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Missing `url`" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "URL must start with http:// or https://" },
      { status: 400 },
    );
  }

  let assets: ScrapedAsset[];
  try {
    assets = await scrapeUrl(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  // Strip oversized previews from the wire payload.
  const lite = assets.map((a) => {
    if (
      a.preview &&
      typeof a.size_bytes === "number" &&
      a.size_bytes > PREVIEW_INLINE_MAX_BYTES
    ) {
      const { preview: _omit, ...rest } = a;
      void _omit;
      return rest as ScrapedAsset;
    }
    return a;
  });

  return NextResponse.json({ assets: lite });
}
