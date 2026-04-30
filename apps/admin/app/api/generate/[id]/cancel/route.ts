import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";
import { processRegistry } from "@open-lottie/claude-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  let gen;
  try {
    gen = await data.getGeneration(decoded);
  } catch {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }
  if (gen.meta.status !== "running") {
    return NextResponse.json(
      { error: `Cannot cancel — generation is ${gen.meta.status}` },
      { status: 400 },
    );
  }

  try {
    const reg = processRegistry.get(decoded);
    if (reg) {
      try {
        reg.kill();
      } catch {
        /* process may already be dead */
      }
    }
    await data.setGenerationStatus(decoded, "cancelled");
    await data.appendDecision({ gen: decoded, action: "cancelled", by: "local-user" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
