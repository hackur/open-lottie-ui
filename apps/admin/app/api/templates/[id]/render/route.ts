import { NextResponse } from "next/server";
import { templates as t } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  params?: Record<string, unknown>;
};

export async function POST(
  req: Request,
  { params: routeParams }: { params: Promise<{ id: string }> },
) {
  const { id } = await routeParams;
  const decoded = decodeURIComponent(id);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const userParams = (body.params ?? {}) as Record<string, unknown>;

  let template;
  try {
    template = await t.loadTemplate(decoded);
  } catch {
    return NextResponse.json(
      { ok: false, error: `Template not found: ${decoded}` },
      { status: 404 },
    );
  }

  const v = t.validateParams(template, userParams);
  if (!v.valid) {
    return NextResponse.json(
      { ok: false, errors: v.errors ?? [] },
      { status: 400 },
    );
  }

  try {
    const result = t.render(template, userParams);
    return NextResponse.json({ ok: true, lottie: result.lottie });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Render failed: " + (e instanceof Error ? e.message : String(e)),
      },
      { status: 500 },
    );
  }
}
