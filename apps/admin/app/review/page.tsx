import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";
import type { GenerationEntry, GenerationStatus } from "@open-lottie/lottie-tools/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_GROUPS: Array<{ id: GenerationStatus | "running"; label: string; tone: string }> = [
  { id: "running", label: "In progress", tone: "var(--color-warning)" },
  { id: "pending-review", label: "Ready for review", tone: "var(--color-accent)" },
  { id: "failed-validation", label: "Failed", tone: "var(--color-danger)" },
  { id: "approved", label: "Approved", tone: "var(--color-success)" },
  { id: "rejected", label: "Rejected", tone: "var(--color-fg-muted)" },
];

export default async function ReviewPage() {
  const all = await data.listGenerations();
  const by: Record<string, GenerationEntry[]> = {};
  for (const e of all) {
    const k = e.meta.status;
    (by[k] ||= []).push(e);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Review</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        {all.length} generation{all.length === 1 ? "" : "s"} on disk
      </p>
      <div className="space-y-8">
        {STATUS_GROUPS.map((g) => {
          const items = by[g.id] || [];
          if (items.length === 0) return null;
          return (
            <section key={g.id}>
              <h2 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                <span style={{ color: g.tone }}>●</span>
                <span className="text-[var(--color-fg-muted)]">{g.label}</span>
                <span className="text-[var(--color-fg-faint)]">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {items.map((it) => (
                  <Link
                    key={it.id}
                    href={`/review/${encodeURIComponent(it.id)}`}
                    className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{it.meta.prompt_summary || it.id}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-fg-muted)]">
                        <code className="font-mono">{it.id}</code>
                        <span>tier {it.meta.tier}</span>
                        {it.meta.template_id && <span className="text-[var(--color-accent)]">{it.meta.template_id}</span>}
                        {it.meta.cost_usd != null && it.meta.cost_usd > 0 && <span>${it.meta.cost_usd.toFixed(4)}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-[var(--color-fg-faint)]">→</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
        {all.length === 0 && (
          <div className="rounded-md border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-fg-muted)]">
            No generations yet.{" "}
            <Link href="/generate" className="text-[var(--color-accent)] underline">
              Try one
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}
