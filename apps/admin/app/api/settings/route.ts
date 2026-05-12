import { NextResponse } from "next/server";
import { loadSettings, saveSettings, SettingsValidationError } from "@/lib/settings";
import { invalidateToolsCache } from "@/lib/detect-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await loadSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const next = await saveSettings(body as Record<string, unknown>);
    // Settings changes (especially feature-flag toggles) may correlate with
    // the user installing/enabling host tools — drop the 60s detectTools()
    // cache so the next /settings render re-probes immediately.
    invalidateToolsCache();
    return NextResponse.json(next);
  } catch (e) {
    if (e instanceof SettingsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
