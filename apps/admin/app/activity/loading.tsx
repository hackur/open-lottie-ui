/**
 * Activity skeleton — pulsing table rows matching the decisions log layout.
 */
export default function ActivityLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="mb-2 h-7 w-32 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
      </div>
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
        <div className="bg-[var(--color-bg-elev-2)] px-3 py-2">
          <div className="h-3 w-48 animate-pulse rounded bg-[var(--color-bg)]" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[8rem_6rem_8rem_1fr] gap-3 border-t border-[var(--color-border)] px-3 py-2"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
