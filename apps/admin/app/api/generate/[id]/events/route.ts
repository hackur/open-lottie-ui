import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { data } from "@open-lottie/lottie-tools";
import { processRegistry } from "@open-lottie/claude-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug endpoint — returns the persisted event log + live registry buffer
 * for a generation. Used by the /review/[id] debug panel.
 */
export async function GET(
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

  const eventsPath = path.join(gen.dir, "events.ndjson");
  let persistedRaw = "";
  try {
    persistedRaw = await fs.readFile(eventsPath, "utf8");
  } catch {
    /* no events.ndjson yet — fine for Tier-1 */
  }
  const persisted = persistedRaw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { malformed: true, raw: line };
      }
    });

  let transcript: string | null = null;
  try {
    transcript = await fs.readFile(path.join(gen.dir, "transcript.md"), "utf8");
  } catch {
    /* none */
  }

  const reg = processRegistry.get(decoded);
  const liveBuffer = reg?.buffer ?? null;

  return NextResponse.json({
    id: decoded,
    status: gen.meta.status,
    tier: gen.meta.tier,
    model: gen.meta.model,
    session_id: gen.meta.session_id,
    started_at: gen.meta.started_at,
    ended_at: gen.meta.ended_at,
    duration_ms: gen.meta.duration_ms,
    cost_usd: gen.meta.cost_usd,
    num_turns: gen.meta.num_turns,
    versions: gen.meta.versions,
    validation_errors: gen.meta.validation?.errors ?? [],
    persisted_events: persisted,
    live_buffer: liveBuffer,
    live_buffer_count: liveBuffer?.length ?? 0,
    transcript,
    transcript_chars: transcript?.length ?? 0,
  });
}
