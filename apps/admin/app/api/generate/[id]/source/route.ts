import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { data } from "@open-lottie/lottie-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/generate/[id]/source
 *
 * Returns the original inputs of a generation, suitable for prefilling the
 * /generate form during edit-and-retry. Reads from meta.json first (where
 * Tier-1 params and Tier-3 prompt are stashed at creation), falling back to
 * parsing prompt.md for older generations that pre-date the stash fields.
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

  const meta = gen.meta;
  const out: {
    id: string;
    tier: number;
    template_id: string | null;
    params: Record<string, unknown> | null;
    prompt: string | null;
    base_id: string | null;
    prompt_summary: string;
  } = {
    id: meta.id,
    tier: meta.tier,
    template_id: meta.template_id,
    params: meta.params ?? null,
    prompt: meta.prompt_text ?? null,
    base_id: meta.base_id,
    prompt_summary: meta.prompt_summary,
  };

  // Fall back to prompt.md if the stash fields are missing (older meta.json).
  if (meta.tier === 1 && out.params == null) {
    out.params = await parseTier1ParamsFromPromptMd(gen.dir);
  }
  if (meta.tier === 3 && (out.prompt == null || out.prompt === "")) {
    out.prompt = await parseTier3PromptFromPromptMd(gen.dir);
  }

  return NextResponse.json(out);
}

async function parseTier1ParamsFromPromptMd(dir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(dir, "prompt.md"), "utf8");
    // The default prompt.md template wraps the user-supplied markdown in a
    // blockquote (each line prefixed with "> "). Strip that prefix before
    // searching for the JSON block.
    const md = raw
      .split("\n")
      .map((l) => (l.startsWith("> ") ? l.slice(2) : l.startsWith(">") ? l.slice(1) : l))
      .join("\n");
    const match = /## Params\s*\n```json\s*\n([\s\S]*?)\n```/i.exec(md);
    if (!match) return null;
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function parseTier3PromptFromPromptMd(dir: string): Promise<string | null> {
  try {
    const md = await fs.readFile(path.join(dir, "prompt.md"), "utf8");
    // Find the "## User text" section, take subsequent lines that begin with "> "
    const idx = md.indexOf("## User text");
    if (idx === -1) return null;
    const tail = md.slice(idx + "## User text".length);
    const lines = tail.split("\n");
    const collected: string[] = [];
    let started = false;
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (line.startsWith("> ")) {
        collected.push(line.slice(2));
        started = true;
      } else if (line.startsWith(">")) {
        collected.push(line.slice(1));
        started = true;
      } else if (started && line.trim() === "") {
        // blank line ends the blockquote
        break;
      } else if (started) {
        break;
      }
    }
    if (collected.length === 0) return null;
    return collected.join("\n");
  } catch {
    return null;
  }
}
