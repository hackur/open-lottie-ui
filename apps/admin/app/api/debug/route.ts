import { NextResponse } from "next/server";
import { data } from "@open-lottie/lottie-tools";
import { processRegistry } from "@open-lottie/claude-driver";
import { detectTools } from "@/lib/detect-tools";
import { loadSettings } from "@/lib/settings";
import { getFlags } from "@/lib/feature-flags";
import { tailErrors } from "@/lib/error-log";
import { buildDebugSnapshot } from "./snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/debug — dev-mode system snapshot.
 *
 * Surfaces tool detection, settings, feature flags, library/generation
 * counts, the live process registry size, recent decisions, and the most
 * recent ring-buffer errors. Used by the /__debug page and by `curl` for
 * quick inspection.
 *
 * Stack traces are gated by `NODE_ENV !== "production"`.
 */
export async function GET() {
  const snapshot = await buildDebugSnapshot({
    data,
    processRegistry,
    detectTools,
    loadSettings,
    getFlags,
    tailErrors,
  });
  return NextResponse.json(snapshot);
}
