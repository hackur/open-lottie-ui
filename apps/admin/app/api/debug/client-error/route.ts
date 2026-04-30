import { NextResponse } from "next/server";
import { recordError } from "@/lib/error-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/debug/client-error
 *
 * Best-effort capture for errors raised inside React error boundaries, so
 * the /__debug ring buffer reflects both server- and client-side crashes.
 * The body is shaped by `components/route-error.tsx`.
 */
export async function POST(req: Request) {
  let payload: { route?: string; message?: string; stack?: string; digest?: string | null } = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const message = String(payload.message ?? "Unknown client error");
  const stack = String(payload.stack ?? "");
  const route = payload.route ? `client:${payload.route}` : "client";
  const synthetic = Object.assign(new Error(message), { stack });
  recordError(synthetic, route, { digest: payload.digest ?? null });
  return NextResponse.json({ ok: true });
}
