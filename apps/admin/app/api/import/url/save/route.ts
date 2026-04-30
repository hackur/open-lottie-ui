import path from "node:path";
import { promises as fs } from "node:fs";

import { NextResponse } from "next/server";
import { data, validator } from "@open-lottie/lottie-tools";

import { scrapeUrl } from "@/lib/url-scrape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/import/url/save
 * Body: `{ url: string, filename?: string }`
 *
 * Re-fetches the URL via {@link scrapeUrl}, validates it as Lottie, and
 * creates a Tier-1 generation with `model="url-import"`. Bypasses the library
 * write path on purpose — every URL import flows through the human review
 * queue. Returns `{ id }` for the resulting generation.
 *
 * - 400 if URL invalid / no Lottie returned.
 * - 503 if fetch fails entirely.
 */
export async function POST(req: Request): Promise<Response> {
  let body: { url?: unknown; filename?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const filenameIn =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim()
      : null;

  if (!url) {
    return NextResponse.json({ error: "Missing `url`" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "URL must start with http:// or https://" },
      { status: 400 },
    );
  }

  let assets;
  try {
    assets = await scrapeUrl(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  // Pick the asset that matches the requested URL exactly, else the only one
  // with a preview, else the first one.
  const exact = assets.find((a) => a.url === url) ?? null;
  const preferred = exact ?? assets.find((a) => a.preview) ?? assets[0] ?? null;
  if (!preferred || !preferred.preview) {
    return NextResponse.json(
      { error: "URL did not yield a valid Lottie animation" },
      { status: 400 },
    );
  }

  const animation = preferred.preview as Record<string, unknown>;

  // Sanity re-validate — cheap, catches anything weird that snuck past.
  const smoke = validator.smokeCheck(animation);
  if (!smoke.ok) {
    return NextResponse.json(
      { error: `not-valid-lottie: missing ${smoke.missing.join(",")}` },
      { status: 400 },
    );
  }

  let hostname = "url";
  try {
    hostname = new URL(url).hostname || "url";
  } catch {
    // keep fallback
  }

  const filename = filenameIn ?? preferred.filename;

  const promptSummary = `Imported from ${hostname}`;
  const promptMd = [
    `# URL import`,
    "",
    `**Source URL**: ${url}`,
    `**Asset URL**: ${preferred.url}`,
    `**Filename**: ${filename}`,
    `**Bytes**: ${preferred.size_bytes ?? "(unknown)"}`,
    `**Content-Type**: ${preferred.content_type}`,
    "",
    "## Notes",
    `- Fetched and validated via the URL-scrape pipeline.`,
    `- No LLM was involved.`,
    `- Awaits human review before promotion to library.`,
    "",
  ].join("\n");

  const gen = await data.createGeneration({
    prompt_summary: promptSummary,
    tier: 1,
    template_id: null,
    model: "url-import",
    base_id: null,
    prompt_markdown: promptMd,
  });

  await data.writeGenerationVersion(gen.id, 1, animation);
  const entry = await data.getGeneration(gen.id);
  await fs.copyFile(
    path.join(entry.dir, "v1.json"),
    path.join(entry.dir, "final.json"),
  );

  const validation = validator.validate(animation);

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
    plugin: "url-import",
    source_url: url,
    asset_url: preferred.url,
    bytes_in: preferred.size_bytes ?? null,
    content_type: preferred.content_type,
  });
  await data.appendDecision({
    gen: gen.id,
    action: "validated",
    ok: validation.valid,
    errors: validation.errors.length,
  });

  return NextResponse.json({ id: gen.id });
}
