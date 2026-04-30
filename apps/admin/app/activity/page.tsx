import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Read up to this many decisions from disk before applying filters. We keep
 * "200" as the visible cap to match the previous UX, but pull a wider window
 * so a filter that matches sparsely still surfaces something interesting.
 */
const SCAN_LIMIT = 1000;
const VISIBLE_LIMIT = 200;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; gen?: string }>;
}) {
  const sp = await searchParams;
  const actionFilter = (sp.action || "").trim();
  const genFilter = (sp.gen || "").trim().toLowerCase();
  const filtersActive = Boolean(actionFilter || genFilter);

  const all = await data.tailDecisions(SCAN_LIMIT);
  // tailDecisions returns oldest → newest at the end; show newest first.
  const reversed = [...all].reverse();

  // Build the action dropdown options from the *unfiltered* set so the user
  // never gets stuck in a filter with an empty dropdown.
  const actionCounts = new Map<string, number>();
  for (const e of all) {
    const a = String(e.action || "");
    if (!a) continue;
    actionCounts.set(a, (actionCounts.get(a) ?? 0) + 1);
  }
  const actionOptions = Array.from(actionCounts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  // Apply filters.
  const filtered = reversed.filter((e) => {
    if (actionFilter && String(e.action) !== actionFilter) return false;
    if (genFilter && !String(e.gen).toLowerCase().includes(genFilter)) {
      return false;
    }
    return true;
  });
  const visible = filtered.slice(0, VISIBLE_LIMIT);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {filtersActive ? (
              <>
                {filtered.length} match
                {filtered.length === 1 ? "" : "es"} of {all.length} decision
                {all.length === 1 ? "" : "s"}
              </>
            ) : (
              <>
                Last {visible.length} decision{visible.length === 1 ? "" : "s"}{" "}
                from <code className="font-mono text-xs">decisions.jsonl</code>
              </>
            )}
          </p>
        </div>
      </div>

      <form
        method="GET"
        action="/activity"
        className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 text-xs"
      >
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--color-fg-muted)]">action</span>
          <select
            name="action"
            defaultValue={actionFilter}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
          >
            <option value="">all</option>
            {actionOptions.map(([a, n]) => (
              <option key={a} value={a}>
                {a} ({n})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-[var(--color-fg-muted)]">gen</span>
          <input
            type="text"
            name="gen"
            defaultValue={genFilter}
            placeholder="substring of gen-id"
            className="w-48 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-1 text-[var(--color-accent-fg)]"
        >
          Apply
        </button>
        {filtersActive && (
          <Link
            href="/activity"
            className="rounded border border-[var(--color-border)] px-2 py-1 text-[var(--color-fg-muted)] hover:border-[var(--color-fg-muted)]"
          >
            Clear
          </Link>
        )}
      </form>

      {visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-fg-muted)]">
          {filtersActive
            ? "No activity matches the current filters."
            : "No activity yet. Once you generate or approve something it'll show up here."}
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
              {visible.map((e, i) => {
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
