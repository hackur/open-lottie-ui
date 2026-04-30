import fs from "node:fs/promises";
import { PATHS, plugins } from "@open-lottie/lottie-tools";
import { detectTools } from "@/lib/detect-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Settings = {
  default_model?: string;
  default_tier?: number;
  default_renderer?: "lottie-web" | "dotlottie-web";
  default_export?: "json" | "lottie";
  library_path?: string;
};

export default async function SettingsPage() {
  const settings = await loadSettings();
  const tools = await detectTools();
  const enabledPlugins = plugins.listPlugins();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Local-only — read from <code className="font-mono text-xs">.config/settings.json</code>.
      </p>

      <Section title="Paths">
        <Row label="Repo root" value={<code className="font-mono text-xs">{PATHS.root}</code>} />
        <Row label="Library" value={<code className="font-mono text-xs">{PATHS.library}</code>} />
        <Row label="Generations" value={<code className="font-mono text-xs">{PATHS.generations}</code>} />
        <Row label="Decisions" value={<code className="font-mono text-xs">{PATHS.decisions}</code>} />
      </Section>

      <Section title="Defaults">
        <Row label="Model" value={settings.default_model ?? "claude-opus-4-7"} />
        <Row label="Tier" value={String(settings.default_tier ?? 1)} />
        <Row label="Renderer" value={settings.default_renderer ?? "lottie-web"} />
        <Row label="Export format" value={settings.default_export ?? "lottie"} />
      </Section>

      <Section title="Host capabilities">
        {tools.map((t) => (
          <Row
            key={t.name}
            label={t.name}
            value={
              <span className={t.found ? "text-[var(--color-success)]" : "text-[var(--color-fg-faint)]"}>
                {t.found ? `✓ ${t.version || "found"}` : "✗ not found"}
              </span>
            }
          />
        ))}
      </Section>

      <Section title="Active plugins (M1: hardcoded)">
        {enabledPlugins.map((p) => (
          <Row
            key={p.id}
            label={p.title}
            value={
              <span className="text-xs text-[var(--color-fg-muted)]">
                <code className="font-mono">{p.id}</code> · {p.surfaces.join(", ")}
              </span>
            }
          />
        ))}
      </Section>

      <p className="mt-6 text-xs text-[var(--color-fg-faint)]">
        M1 settings are read-only. Edit <code className="font-mono">.config/settings.json</code> by hand for now.
      </p>
    </div>
  );
}

async function loadSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(PATHS.settings, "utf8");
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">{title}</div>
      <div className="space-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
