import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  let body: { codes?: string[]; note?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }
  try {
    await data.setGenerationStatus(decoded, "rejected");
    await data.appendDecision({
      gen: decoded,
      action: "reject",
      by: "local-user",
      codes: body.codes ?? [],
      note: body.note ?? "",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
