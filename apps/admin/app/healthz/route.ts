import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";
import { detectTools } from "@/lib/detect-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [library, generations, tools] = await Promise.all([
    data.listLibrary().catch(() => []),
    data.listGenerations().catch(() => []),
    detectTools(),
  ]);
  return NextResponse.json({
    ok: true,
    library_count: library.length,
    generations_count: generations.length,
    tools: Object.fromEntries(
      tools.map((t) => [t.name, { found: t.found, version: t.version, path: t.resolvedPath }]),
    ),
  });
}
