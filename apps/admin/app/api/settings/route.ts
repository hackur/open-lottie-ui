import { NextResponse } from "next/server";
import { loadSettings, saveSettings, SettingsValidationError } from "@/lib/settings";

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
