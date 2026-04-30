import path from "node:path";
import fs from "node:fs/promises";
import { PATHS, data, templates as t } from "@open-lottie/lottie-tools";
import { GenerateForm } from "@/components/generate-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Starter = {
  id: string;
  label: string;
  prompt: string;
  tier_hint?: number;
  template_hint?: string | null;
  tags?: string[];
};

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; remix?: string; template?: string; retry?: string }>;
}) {
  const sp = await searchParams;

  const starters = await loadStarters();
  const templateIds = await t.listTemplates();
  const templateMetas = await Promise.all(
    templateIds.map(async (id) => {
      try {
        const tmpl = await t.loadTemplate(id);
        return { id, description: tmpl.description ?? "", schema: tmpl.params_schema as Record<string, unknown> };
      } catch {
        return null;
      }
    }),
  );
  const templates = templateMetas.filter((x): x is NonNullable<typeof x> => x != null);

  // Edit-and-retry: load the original generation's source and prefill the form.
  let initialPrompt = sp.prompt ?? "";
  let initialTemplateId = sp.template ?? null;
  let initialParams: Record<string, unknown> | null = null;
  let initialTier: 1 | 3 = initialTemplateId ? 1 : 3;
  let remixBase = sp.remix ?? null;
  let retrySource: { id: string; tier: number; template_id: string | null } | null = null;

  if (sp.retry) {
    const source = await loadRetrySource(sp.retry);
    if (source) {
      retrySource = { id: source.id, tier: source.tier, template_id: source.template_id };
      if (source.tier === 1) {
        initialTier = 1;
        initialTemplateId = source.template_id ?? initialTemplateId;
        initialParams = source.params;
        initialPrompt = source.prompt_summary || initialPrompt;
      } else if (source.tier === 3) {
        initialTier = 3;
        initialPrompt = source.prompt ?? initialPrompt;
      }
      // Preserve the original base if not already passed via ?remix=
      if (!remixBase && source.base_id) remixBase = source.base_id;
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Generate</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Pick a template (Tier 1, deterministic) or write a freeform prompt for Claude to author (Tier 3).
      </p>

      {retrySource && (
        <div className="mb-4 rounded-md border border-[var(--color-warning)] bg-[color-mix(in_oklch,var(--color-warning)_10%,transparent)] px-4 py-2 text-sm">
          Retrying <code className="font-mono text-[var(--color-warning)]">{retrySource.id}</code> — tweak the inputs below and re-submit.
        </div>
      )}

      <GenerateForm
        starters={starters}
        templates={templates}
        initialPrompt={initialPrompt}
        initialTemplateId={initialTemplateId}
        initialParams={initialParams}
        initialTier={initialTier}
        remixBase={remixBase}
      />
    </div>
  );
}

async function loadStarters(): Promise<Starter[]> {
  try {
    const raw = await fs.readFile(PATHS.starterPrompts, "utf8");
    const parsed = JSON.parse(raw) as { starters?: Starter[] };
    return parsed.starters ?? [];
  } catch {
    return [];
  }
}

type RetrySource = {
  id: string;
  tier: number;
  template_id: string | null;
  params: Record<string, unknown> | null;
  prompt: string | null;
  base_id: string | null;
  prompt_summary: string;
};

async function loadRetrySource(retryId: string): Promise<RetrySource | null> {
  try {
    const gen = await data.getGeneration(retryId);
    const meta = gen.meta;
    const source: RetrySource = {
      id: meta.id,
      tier: meta.tier,
      template_id: meta.template_id,
      params: meta.params ?? null,
      prompt: meta.prompt_text ?? null,
      base_id: meta.base_id,
      prompt_summary: meta.prompt_summary,
    };

    if (meta.tier === 1 && source.params == null) {
      source.params = await parseTier1ParamsFromPromptMd(gen.dir);
    }
    if (meta.tier === 3 && !source.prompt) {
      source.prompt = await parseTier3PromptFromPromptMd(gen.dir);
    }
    return source;
  } catch {
    return null;
  }
}

async function parseTier1ParamsFromPromptMd(dir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(dir, "prompt.md"), "utf8");
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
