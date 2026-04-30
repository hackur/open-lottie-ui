import { NextResponse } from "next/server";
import { clearErrors } from "@/lib/error-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/debug/clear-errors — empties the in-memory ring buffer.
 * Used by the "Clear errors" button on /__debug.
 */
export async function POST() {
  clearErrors();
  return NextResponse.json({ ok: true });
}
