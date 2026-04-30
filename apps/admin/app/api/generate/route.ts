import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { data, templates as t, validator, hash, PATHS } from "@open-lottie/lottie-tools";
import { startTier3Generation } from "@/lib/generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tier1Body = {
  tier: 1;
  template_id: string;
  params: Record<string, unknown>;
  prompt_summary?: string;
  base_id?: string | null;
};

type Tier3Body = {
  tier: 3;
  prompt: string;
  model?: string;
  base_id?: string | null;
};

export async function POST(req: Request) {
  let body: Tier1Body | Tier3Body;
  try {
    body = (await req.json()) as Tier1Body | Tier3Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.tier === 1) {
    return await runTier1(body);
  }
  if (body.tier === 3) {
    return await runTier3(body);
  }
  return NextResponse.json({ error: "Unknown tier" }, { status: 400 });
}

async function runTier1(body: Tier1Body): Promise<Response> {
  if (!body.template_id) {
    return NextResponse.json({ error: "template_id required" }, { status: 400 });
  }
  let template;
  try {
    template = await t.loadTemplate(body.template_id);
  } catch (e) {
    return NextResponse.json({ error: `Template not found: ${body.template_id}` }, { status: 404 });
  }

  const v = t.validateParams(template, body.params);
  if (!v.valid) {
    return NextResponse.json(
      { error: "Param validation failed", details: v.errors },
      { status: 400 },
    );
  }

  let animation: unknown;
  try {
    const result = t.render(template, body.params);
    animation = result.lottie;
  } catch (e) {
    return NextResponse.json(
      { error: "Render failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 },
    );
  }

  const validation = validator.validate(animation);

  const gen = await data.createGeneration({
    prompt_summary: body.prompt_summary || `${body.template_id} render`,
    tier: 1,
    template_id: body.template_id,
    model: "deterministic",
    base_id: body.base_id ?? null,
    prompt_markdown: tier1PromptMd({ template_id: body.template_id, params: body.params, base_id: body.base_id }),
  });

  await data.writeGenerationVersion(gen.id, 1, animation);
  const entry = await data.getGeneration(gen.id);
  await fs.copyFile(
    path.join(entry.dir, "v1.json"),
    path.join(entry.dir, "final.json"),
  );

  await data.updateGenerationMeta(gen.id, {
    final_version: 1,
    versions: [{ v: 1, validated: validation.valid, errors_count: validation.errors.length }],
    validation: { ok: validation.valid, errors: validation.errors as unknown[] },
    cost_usd: 0,
    num_turns: 0,
  });
  await data.setGenerationStatus(gen.id, validation.valid ? "pending-review" : "pending-review");
  // Even if invalid, surface for review so the user can decide.

  await data.appendDecision({
    gen: gen.id,
    action: "created",
    tier: 1,
    template_id: body.template_id,
  });
  await data.appendDecision({
    gen: gen.id,
    action: "validated",
    ok: validation.valid,
    errors: validation.errors.length,
  });

  return NextResponse.json({ id: gen.id });
}

async function runTier3(body: Tier3Body): Promise<Response> {
  if (!body.prompt || !body.prompt.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  const gen = await data.createGeneration({
    prompt_summary: body.prompt.split("\n")[0].slice(0, 80),
    tier: 3,
    template_id: null,
    model: body.model ?? "claude-opus-4-7",
    base_id: body.base_id ?? null,
    prompt_markdown: tier3PromptMd({ prompt: body.prompt, model: body.model ?? "claude-opus-4-7", base_id: body.base_id }),
  });

  // Fire-and-forget; the SSE endpoint will replay events.
  startTier3Generation(gen.id, body.prompt, body.model ?? "claude-opus-4-7").catch((err) => {
    console.error("Tier 3 generation failed", err);
  });

  return NextResponse.json({ id: gen.id });
}

function tier1PromptMd(opts: { template_id: string; params: unknown; base_id?: string | null }): string {
  return [
    `# Tier-1 render`,
    ``,
    `**Template**: \`${opts.template_id}\``,
    `**Base**: ${opts.base_id ?? "(none)"}`,
    ``,
    `## Params`,
    "```json",
    JSON.stringify(opts.params, null, 2),
    "```",
    "",
  ].join("\n");
}

function tier3PromptMd(opts: { prompt: string; model: string; base_id?: string | null }): string {
  return [
    `# Tier-3 prompt`,
    ``,
    `**Model**: ${opts.model}`,
    `**Base**: ${opts.base_id ?? "(none)"}`,
    ``,
    `## User text`,
    `> ${opts.prompt.split("\n").join("\n> ")}`,
    "",
  ].join("\n");
}
