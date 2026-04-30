import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  try {
    const gen = await data.getGeneration(decoded);
    if (gen.meta.status !== "pending-review") {
      return NextResponse.json(
        { error: `Cannot approve generation in status ${gen.meta.status}` },
        { status: 400 },
      );
    }
    const slug = slugify(gen.meta.prompt_summary || gen.meta.template_id || "untitled");
    const promoted = await data.promoteGenerationToLibrary(decoded, {
      slug,
      title: gen.meta.prompt_summary || gen.meta.template_id || "untitled",
      tags: tagsFromMeta(gen.meta),
      license_id: "MIT",
      license_url: null,
      attribution_required: false,
      attribution_text: null,
      imported_by: "open-lottie-ui",
      source: "generation",
    });
    await data.setGenerationStatus(decoded, "approved");
    await data.appendDecision({ gen: decoded, action: "approve", by: "local-user" });
    await data.appendDecision({
      gen: decoded,
      action: "committed",
      library_id: promoted.id,
    });
    return NextResponse.json({ library_id: promoted.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "untitled"
  );
}

function tagsFromMeta(meta: { template_id: string | null; tier: number }): string[] {
  const tags: string[] = ["generated"];
  if (meta.template_id) tags.push(meta.template_id);
  tags.push(`tier-${meta.tier}`);
  return tags;
}
