import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ActivityPage() {
  const entries = await data.tailDecisions(200);
  // tailDecisions returns oldest → newest at the end; show newest first.
  const reversed = [...entries].reverse();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Last {entries.length} decisions from <code className="font-mono text-xs">decisions.jsonl</code>
          </p>
        </div>
      </div>

      {reversed.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-fg-muted)]">
          No activity yet. Once you generate or approve something it'll show up here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-elev-2)] text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Generation</th>
                <th className="px-3 py-2 text-left font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {reversed.map((e, i) => {
                const ts = typeof e.ts === "string" ? e.ts : "";
                const time = ts ? ts.slice(0, 19).replace("T", " ") : "—";
                const detail = decisionDetail(e);
                return (
                  <tr key={i} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-fg-muted)]">{time}</td>
                    <td className="px-3 py-2">
                      <ActionBadge action={String(e.action)} />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/review/${encodeURIComponent(String(e.gen))}`}
                        className="font-mono text-xs text-[var(--color-accent)] hover:underline"
                      >
                        {String(e.gen)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-fg-muted)]">{detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const tone =
    action === "approve" || action === "committed"
      ? "var(--color-success)"
      : action === "reject" || action.startsWith("deleted")
        ? "var(--color-danger)"
        : action === "validated"
          ? "var(--color-fg-muted)"
          : "var(--color-accent)";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span style={{ color: tone }}>●</span>
      <span>{action}</span>
    </span>
  );
}

function decisionDetail(e: Record<string, unknown>): string {
  const omit = new Set(["ts", "gen", "action", "by"]);
  const parts: string[] = [];
  for (const [k, v] of Object.entries(e)) {
    if (omit.has(k)) continue;
    if (v == null || v === "") continue;
    if (typeof v === "object") {
      parts.push(`${k}=${JSON.stringify(v).slice(0, 40)}`);
    } else {
      parts.push(`${k}=${String(v).slice(0, 40)}`);
    }
  }
  return parts.join(" · ") || "—";
}
