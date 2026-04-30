import path from "node:path";
import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";
import { data, hash, PATHS, validator } from "@open-lottie/lottie-tools";

import { fetchAndExtract, scanCandidates } from "@/lib/asset-scraper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_MAX = 40;
const HASH_TAIL_LEN = 8;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, SLUG_MAX) || "asset"
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function deriveTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
    const stripped = last.replace(/\.(json|lottie)$/i, "");
    if (stripped) return stripped.replace(/[-_]+/g, " ").trim();
    return u.hostname;
  } catch {
    return "imported-asset";
  }
}

/**
 * POST /api/import/url/fetch
 * Body:
 * ```ts
 * {
 *   asset_url: string;
 *   page_url?: string;
 *   license_id?: string;
 *   attribution_text?: string;
 *   title?: string;
 *   tags?: string[];
 * }
 * ```
 *
 * Re-fetches the asset (don't trust client-supplied bytes), validates it, and
 * writes a fresh `library/import_<YYYY-MM-DD>_<slug>_<short-hash>/` entry.
 */
export async function POST(req: Request): Promise<Response> {
  let body: {
    asset_url?: unknown;
    page_url?: unknown;
    license_id?: unknown;
    attribution_text?: unknown;
    title?: unknown;
    tags?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const assetUrl =
    typeof body.asset_url === "string" ? body.asset_url.trim() : "";
  if (!assetUrl) {
    return NextResponse.json({ error: "Missing `asset_url`" }, { status: 400 });
  }
  const pageUrl = typeof body.page_url === "string" ? body.page_url : null;
  const licenseId =
    typeof body.license_id === "string" && body.license_id.trim()
      ? body.license_id.trim()
      : "unknown";
  const attributionText =
    typeof body.attribution_text === "string" && body.attribution_text.trim()
      ? body.attribution_text.trim()
      : null;
  const titleIn =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : null;
  const tagsIn = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string")
    : [];

  // Inline-json candidates need page-side context; reject anything fancy.
  const isInline = assetUrl.includes("#inline-");
  let scanned;
  try {
    if (isInline) {
      if (!pageUrl) {
        return NextResponse.json(
          { error: "page_url is required for inline-json assets" },
          { status: 400 },
        );
      }
      const extracted = await fetchAndExtract(pageUrl);
      const found = extracted.candidates.find((c) => c.url === assetUrl);
      if (!found) {
        return NextResponse.json(
          { error: "inline-json candidate not found on page" },
          { status: 404 },
        );
      }
      const results = await scanCandidates([found], { inlineHtml: extracted.html });
      scanned = results[0];
    } else {
      const results = await scanCandidates(
        [
          {
            url: assetUrl,
            source: "anchor",
            format: assetUrl.endsWith(".lottie")
              ? "lottie"
              : assetUrl.endsWith(".json")
                ? "json"
                : "unknown",
          },
        ],
      );
      scanned = results[0];
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  if (!scanned || !scanned.ok || !scanned.preview) {
    return NextResponse.json(
      { error: scanned?.reason ?? "asset failed validation" },
      { status: 400 },
    );
  }

  const animation = scanned.preview as Record<string, unknown>;

  const title = titleIn ?? deriveTitleFromUrl(assetUrl);
  const slug = slugify(title);
  const contentHash =
    scanned.contentHash ?? hash.contentHash(animation);
  const shortHash = contentHash.replace(/^sha256:/, "").slice(0, HASH_TAIL_LEN);
  const libraryId = `import_${todayIso()}_${slug}_${shortHash}`;

  if (await data.libraryEntryExists(libraryId)) {
    return NextResponse.json(
      { error: `library entry already exists: ${libraryId}` },
      { status: 409 },
    );
  }

  // Sanity re-validate (smoke). Cheap, catches anything weird that snuck past
  // the scanner.
  const smoke = validator.smokeCheck(animation);
  if (!smoke.ok) {
    return NextResponse.json(
      {
        error: `not-valid-lottie: missing ${smoke.missing.join(",")}`,
      },
      { status: 400 },
    );
  }

  const intrinsic = hash.intrinsics(animation);

  const targetDir = path.join(PATHS.library, libraryId);
  await fs.mkdir(targetDir, { recursive: true });
  await data.writeJsonAtomic(path.join(targetDir, "animation.json"), animation);

  const isCcByLike = /^CC-BY/i.test(licenseId);

  const meta = {
    id: libraryId,
    title,
    tags: tagsIn,
    source: "import" as const,
    source_url: assetUrl,
    license_id: licenseId,
    license_url: null,
    attribution_required: isCcByLike,
    attribution_text: attributionText,
    imported_at: new Date().toISOString(),
    imported_by: "open-lottie-ui-scraper",
    content_hash: contentHash,
    intrinsic: {
      fr: intrinsic.fr,
      ip: intrinsic.ip,
      op: intrinsic.op,
      w: intrinsic.w,
      h: intrinsic.h,
      layer_count: intrinsic.layer_count,
      size_bytes: intrinsic.size_bytes,
    },
    from_generation: null,
  };

  await data.saveLibraryMeta(libraryId, meta);

  await data.appendDecision({
    gen: libraryId,
    action: "imported_from_url",
    page_url: pageUrl,
    asset_url: assetUrl,
    license_id: licenseId,
    bytes: scanned.bytes ?? null,
    format: scanned.candidate.format,
  });

  return NextResponse.json({ ok: true, library_id: libraryId });
}
