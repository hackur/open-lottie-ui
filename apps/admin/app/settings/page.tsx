import { PATHS, plugins } from "@open-lottie/lottie-tools";
import { detectTools } from "@/lib/detect-tools";
import { loadSettings } from "@/lib/settings";
import { FLAG_CATALOG, type FeatureFlag } from "@/lib/feature-flags";
import { SettingsForm } from "@/components/settings-form";
import {
  FeatureFlagsForm,
  type FeatureFlagItem,
} from "@/components/feature-flags-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_LABEL: Record<plugins.PluginStatus, string> = {
  "m1-enabled": "✓ enabled",
  "m1-stub": "◌ stub (M2)",
  "m1-stub-needs-tool": "⚠ needs tool",
};

const STATUS_CLASS: Record<plugins.PluginStatus, string> = {
  "m1-enabled": "text-[var(--color-success)]",
  "m1-stub": "text-[var(--color-fg-muted)]",
  "m1-stub-needs-tool": "text-[var(--color-warn,var(--color-fg-muted))]",
};

/**
 * Maps each feature flag to the host tool whose presence is required for it
 * to function. `null` means the flag has no host-tool dependency (e.g.
 * URL-scrape is purely network-based).
 */
const FLAG_TOOL_MAP: Record<FeatureFlag, string | null> = {
  enable_inlottie: "inlottie",
  enable_glaxnimate: "glaxnimate",
  enable_python_lottie: "python3",
  enable_ffmpeg: "ffmpeg",
  enable_url_scrape: null,
};

export default async function SettingsPage() {
  const settings = await loadSettings();
  const tools = await detectTools();
  const enabledPlugins = plugins.listPlugins();
  const toolStatusMap = Object.fromEntries(tools.map((t) => [t.name, t.found]));
  const allPlugins = await plugins.listPluginsWithStatus(toolStatusMap);

  const flagItems: FeatureFlagItem[] = FLAG_CATALOG.map((info) => {
    const toolName = FLAG_TOOL_MAP[info.flag];
    return {
      flag: info.flag,
      title: info.title,
      description: info.description,
      enabled: Boolean(settings[info.flag]),
      hostTool: toolName ?? undefined,
      hostToolFound: toolName ? toolStatusMap[toolName] === true : undefined,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Local-only — saved to <code className="font-mono text-xs">.config/settings.json</code>.
      </p>

      <Section title="Paths">
        <Row label="Repo root" value={<code className="font-mono text-xs">{PATHS.root}</code>} />
        <Row label="Library" value={<code className="font-mono text-xs">{PATHS.library}</code>} />
        <Row label="Generations" value={<code className="font-mono text-xs">{PATHS.generations}</code>} />
        <Row label="Decisions" value={<code className="font-mono text-xs">{PATHS.decisions}</code>} />
      </Section>

      <Section title="Defaults">
        <SettingsForm initial={settings} />
      </Section>

      <Section title="Features">
        <p className="mb-2 text-xs text-[var(--color-fg-muted)]">
          External-tool integrations. All default off — opt in to extend the
          baseline UI with renderers, editors, and import sources.
        </p>
        <FeatureFlagsForm items={flagItems} />
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

      <Section title="All plugins (manifest registry)">
        {sortByStatus(allPlugins).map((p) => (
          <PluginCard key={p.id} plugin={p} />
        ))}
        <p className="mt-2 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-fg-faint)]">
          Manifests parsed from <code className="font-mono">plugins/&lt;id&gt;/plugin.json</code>. The
          manifest-driven loader lands in M2 (ADR-007).
        </p>
      </Section>

    </div>
  );
}

const STATUS_ORDER: Record<plugins.PluginStatus, number> = {
  "m1-enabled": 0,
  "m1-stub": 1,
  "m1-stub-needs-tool": 2,
};

function sortByStatus(list: plugins.PluginManifestWithStatus[]): plugins.PluginManifestWithStatus[] {
  return [...list].sort((a, b) => {
    const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

function surfaceLabel(s: unknown): string | null {
  if (typeof s === "string") return s;
  if (s && typeof s === "object" && "type" in s && typeof (s as { type: unknown }).type === "string") {
    return (s as { type: string }).type;
  }
  return null;
}

function PluginCard({ plugin }: { plugin: plugins.PluginManifestWithStatus }) {
  const title = plugin.title ?? plugin.name ?? plugin.id;
  const surfaces = (plugin.surfaces ?? [])
    .map(surfaceLabel)
    .filter((x): x is string => Boolean(x));
  const statusLine =
    plugin.status === "m1-stub-needs-tool" && plugin.missing_tools?.length
      ? `⚠ needs ${plugin.missing_tools.join(", ")}`
      : STATUS_LABEL[plugin.status];

  return (
    <div className="border-b border-[var(--color-border)] py-2 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{title}</span>
        <span className={`text-xs ${STATUS_CLASS[plugin.status]}`}>{statusLine}</span>
      </div>
      <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
        <code className="font-mono">{plugin.id}</code>
      </div>
      {plugin.description && (
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{plugin.description}</p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {plugin.license && <Badge>{plugin.license}</Badge>}
        {plugin.external_tool_license && (
          <Badge title="External tool license">tool: {plugin.external_tool_license}</Badge>
        )}
        {surfaces.map((s) => (
          <Badge key={s} variant="muted">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Badge({
  children,
  variant = "default",
  title,
}: {
  children: React.ReactNode;
  variant?: "default" | "muted";
  title?: string;
}) {
  const cls =
    variant === "muted"
      ? "border-[var(--color-border)] text-[var(--color-fg-muted)]"
      : "border-[var(--color-border)] text-[var(--color-fg)]";
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono ${cls}`}
    >
      {children}
    </span>
  );
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
