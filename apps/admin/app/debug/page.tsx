import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";
import { processRegistry } from "@open-lottie/claude-driver";
import { detectTools } from "@/lib/detect-tools";
import { loadSettings } from "@/lib/settings";
import { getFlags } from "@/lib/feature-flags";
import { tailErrors } from "@/lib/error-log";
import { buildDebugSnapshot, type DebugSnapshot } from "../api/debug/snapshot";
import { ClearErrorsButton } from "./clear-errors-button";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IS_PROD = process.env.NODE_ENV === "production";

export default async function DebugPage() {
  const snapshot = await buildDebugSnapshot({
    data,
    processRegistry,
    detectTools,
    loadSettings,
    getFlags,
    tailErrors,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Debug</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Local-only snapshot. Generated{" "}
            <code className="font-mono text-xs">{snapshot.now}</code> · pid{" "}
            <code className="font-mono text-xs">{snapshot.env.pid}</code> · uptime{" "}
            <code className="font-mono text-xs">{snapshot.env.uptime_s}s</code> ·{" "}
            <code className="font-mono text-xs">{snapshot.env.memory_mb} MB</code> RSS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/debug"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Raw JSON
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ToolsPanel tools={snapshot.tools} />
        <FlagsPanel flags={snapshot.flags} />
        <GenerationsPanel counts={snapshot.generations} libraryCount={snapshot.library_count} />
        <ProcessRegistryPanel
          size={snapshot.process_registry_size}
          procs={snapshot.process_registry}
        />
      </div>

      <RecentErrorsPanel errors={snapshot.recent_errors} />
      <RecentDecisionsPanel decisions={snapshot.recent_decisions} />
    </div>
  );
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function ToolsPanel({ tools }: { tools: DebugSnapshot["tools"] }) {
  const entries = Object.entries(tools);
  return (
    <Panel title="Host tools">
      <ul className="space-y-1 text-sm">
        {entries.map(([name, info]) => (
          <li key={name} className="flex items-baseline justify-between gap-2">
            <code className="font-mono text-xs">{name}</code>
            <span
              className={
                info.found
                  ? "truncate text-xs text-[var(--color-success)]"
                  : "text-xs text-[var(--color-fg-faint)]"
              }
              title={info.path}
            >
              {info.found ? `✓ ${info.version || "found"}` : "✗ not found"}
            </span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-xs text-[var(--color-fg-faint)]">(no tools detected)</li>
        )}
      </ul>
    </Panel>
  );
}

function FlagsPanel({ flags }: { flags: Record<string, boolean> }) {
  const entries = Object.entries(flags);
  return (
    <Panel
      title="Feature flags"
      action={
        <Link href="/settings" className="text-xs text-[var(--color-accent)] hover:underline">
          edit →
        </Link>
      }
    >
      <ul className="space-y-1 text-sm">
        {entries.map(([key, value]) => (
          <li key={key} className="flex items-baseline justify-between gap-2">
            <code className="font-mono text-xs">{key}</code>
            <span
              className={
                value ? "text-xs text-[var(--color-success)]" : "text-xs text-[var(--color-fg-faint)]"
              }
            >
              {value ? "on" : "off"}
            </span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-xs text-[var(--color-fg-faint)]">(no flags)</li>
        )}
      </ul>
    </Panel>
  );
}

function GenerationsPanel({
  counts,
  libraryCount,
}: {
  counts: DebugSnapshot["generations"];
  libraryCount: number;
}) {
  const rows: Array<[label: string, n: number, tone?: string]> = [
    ["Library entries", libraryCount, "var(--color-fg)"],
    ["Generations · total", counts.total],
    ["· running", counts.running, "var(--color-warning)"],
    ["· pending review", counts.pending_review, "var(--color-accent)"],
    ["· approved", counts.approved, "var(--color-success)"],
    ["· rejected", counts.rejected, "var(--color-fg-muted)"],
    ["· failed validation", counts.failed_validation, "var(--color-danger)"],
    ["· failed render", counts.failed_render, "var(--color-danger)"],
    ["· cancelled", counts.cancelled, "var(--color-fg-muted)"],
  ];
  return (
    <Panel title="Library / generations">
      <ul className="space-y-1 text-sm">
        {rows.map(([label, n, tone]) => (
          <li key={label} className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-[var(--color-fg-muted)]">{label}</span>
            <span
              className="font-mono text-xs"
              style={tone ? { color: tone } : undefined}
            >
              {n}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ProcessRegistryPanel({
  size,
  procs,
}: {
  size: number;
  procs: DebugSnapshot["process_registry"];
}) {
  return (
    <Panel title={`Process registry (${size})`}>
      {procs.length === 0 ? (
        <p className="text-xs text-[var(--color-fg-faint)]">No live Claude-driver processes.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {procs.map((p) => (
            <li key={p.id} className="rounded border border-[var(--color-border)] px-2 py-1">
              <div className="flex items-baseline justify-between gap-2">
                <code className="truncate font-mono text-xs">{p.id}</code>
                <span
                  className="text-[10px] uppercase"
                  style={{
                    color:
                      p.status === "running" ? "var(--color-warning)" : "var(--color-fg-muted)",
                  }}
                >
                  {p.status}
                </span>
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] text-[var(--color-fg-faint)]">
                <span>{p.buffered_events} events</span>
                <span>{(p.age_ms / 1000).toFixed(1)}s old</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentErrorsPanel({ errors }: { errors: DebugSnapshot["recent_errors"] }) {
  return (
    <section className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
          Recent errors ({errors.length})
        </h2>
        <ClearErrorsButton />
      </header>
      {errors.length === 0 ? (
        <p className="text-xs text-[var(--color-fg-faint)]">No errors recorded.</p>
      ) : (
        <ol className="space-y-2">
          {errors.map((e, i) => (
            <li
              key={i}
              className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-2"
            >
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-mono text-[var(--color-fg-muted)]">{e.ts}</span>
                {e.context && (
                  <code className="truncate font-mono text-[var(--color-accent)]">{e.context}</code>
                )}
              </div>
              <div className="mt-1 text-sm text-[var(--color-danger)]">{e.message}</div>
              {e.data != null && (
                <pre className="scrollbar-thin mt-1 max-h-24 overflow-auto rounded bg-[var(--color-bg-elev-2)] p-1 font-mono text-[10px] text-[var(--color-fg-muted)]">
                  {safeStringify(e.data)}
                </pre>
              )}
              {!IS_PROD && e.stack && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)]">
                    stack
                  </summary>
                  <pre className="scrollbar-thin mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-bg-elev-2)] p-1 font-mono text-[10px] text-[var(--color-fg-muted)]">
                    {e.stack}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RecentDecisionsPanel({
  decisions,
}: {
  decisions: DebugSnapshot["recent_decisions"];
}) {
  return (
    <section className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
          Recent decisions ({decisions.length})
        </h2>
        <Link href="/activity" className="text-xs text-[var(--color-accent)] hover:underline">
          full log →
        </Link>
      </header>
      {decisions.length === 0 ? (
        <p className="text-xs text-[var(--color-fg-faint)]">No decisions yet.</p>
      ) : (
        <ol className="space-y-1">
          {decisions.map((d, i) => (
            <li
              key={i}
              className="grid grid-cols-[8rem_6rem_1fr] gap-2 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
            >
              <code className="truncate font-mono text-[var(--color-fg-muted)]">
                {String(d.ts ?? "").slice(0, 19).replace("T", " ")}
              </code>
              <code className="truncate font-mono text-[var(--color-accent)]">
                {String(d.action ?? "?")}
              </code>
              <code className="truncate font-mono text-[var(--color-fg)]">{summarizeDecision(d)}</code>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function summarizeDecision(d: Record<string, unknown>): string {
  const omit = new Set(["ts", "gen", "action", "by"]);
  const parts: string[] = [];
  if (d.gen != null) parts.push(`gen=${String(d.gen)}`);
  for (const [k, v] of Object.entries(d)) {
    if (omit.has(k)) continue;
    if (v == null || v === "") continue;
    if (typeof v === "object") parts.push(`${k}=${safeStringify(v).slice(0, 40)}`);
    else parts.push(`${k}=${String(v).slice(0, 40)}`);
  }
  return parts.join(" · ");
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
