import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  const parsed = raw ? Number(raw) : 50;
  const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(500, parsed)) : 50;
  const entries = await data.tailDecisions(limit);
  return NextResponse.json({ entries });
}
