import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  let meta;
  try {
    const gen = await data.getGeneration(decoded);
    meta = gen.meta;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(
        { error: `Generation not found: ${decoded}` },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  if (meta.status === "running") {
    return NextResponse.json(
      {
        error:
          "Cannot delete a running generation — cancel it first, then retry.",
      },
      { status: 400 },
    );
  }

  try {
    await data.deleteGeneration(decoded);
    await data.appendDecision({
      gen: decoded,
      action: "deleted_generation",
      by: "local-user",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json(
        { error: `Generation not found: ${decoded}` },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
