/**
 * Review skeleton — pulsing rows mirroring the grouped status sections.
 */
export default function ReviewLoading() {
  return (
    <div>
      <div className="mb-1 h-7 w-24 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
      <div className="mb-6 h-4 w-40 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, sec) => (
          <section key={sec}>
            <div className="mb-3 h-3 w-32 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: 3 }).map((_, row) => (
                <div
                  key={row}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3"
                >
                  <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[var(--color-bg-elev-2)]" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
