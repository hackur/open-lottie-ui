import { NextResponse } from "next/server";
import { markWelcomeSeen } from "@/lib/first-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await markWelcomeSeen();
  return NextResponse.json({ ok: true });
}
