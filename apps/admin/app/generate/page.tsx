import fs from "node:fs/promises";
import { PATHS, templates as t } from "@open-lottie/lottie-tools";
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
  searchParams: Promise<{ prompt?: string; remix?: string; template?: string }>;
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

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Generate</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Pick a template (Tier 1, deterministic) or write a freeform prompt for Claude to author (Tier 3).
      </p>

      <GenerateForm
        starters={starters}
        templates={templates}
        initialPrompt={sp.prompt ?? ""}
        initialTemplateId={sp.template ?? null}
        remixBase={sp.remix ?? null}
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
