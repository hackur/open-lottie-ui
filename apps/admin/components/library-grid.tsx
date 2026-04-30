"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { LottiePlayer } from "@/components/lottie-player";
import { LicenseBadge } from "@/components/license-badge";

type Entry = {
  id: string;
  meta: {
    title: string;
    tags: string[];
    license_id: string;
  };
};

type Props = {
  entries: Entry[];
  animations: (unknown | null)[];
  initialQuery?: string;
  initialTag?: string;
};

export function LibraryGrid({ entries, animations, initialQuery = "", initialTag = "" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) {
      for (const t of e.meta.tags || []) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return counts;
  }, [entries]);

  const sortedTags = useMemo(() => {
    return Array.from(tagCounts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([t]) => t);
  }, [tagCounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const indices: number[] = [];
    entries.forEach((entry, i) => {
      if (tag && !(entry.meta.tags || []).includes(tag)) return;
      if (q) {
        const hay = `${entry.meta.title || ""} ${entry.id} ${(entry.meta.tags || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return;
      }
      indices.push(i);
    });
    return indices;
  }, [entries, query, tag]);

  const total = entries.length;
  const filterActive = Boolean(query.trim() || tag);

  function pushUrl(nextQuery: string, nextTag: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    else params.delete("q");
    if (nextTag) params.set("tag", nextTag);
    else params.delete("tag");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
    });
  }

  function onQueryChange(v: string) {
    setQuery(v);
    pushUrl(v, tag);
  }

  function onTagClick(t: string) {
    const next = tag === t ? "" : t;
    setTag(next);
    pushUrl(query, next);
  }

  function clearFilters() {
    setQuery("");
    setTag("");
    pushUrl("", "");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by title, id, or tag…"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm placeholder:text-[var(--color-fg-faint)] focus:border-[var(--color-accent)] focus:outline-none"
        />
        {sortedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sortedTags.map((t) => {
              const selected = tag === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTagClick(t)}
                  className={clsx(
                    "rounded-md border px-2 py-0.5 text-xs transition-colors",
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                      : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]",
                  )}
                >
                  {t}
                  <span className="ml-1 text-[10px] opacity-70">{tagCounts.get(t)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
        <span>
          {filtered.length} of {total}
        </span>
        {filterActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[var(--color-accent)] underline-offset-2 hover:underline"
          >
            clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-fg-muted)]">
          No animations match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {filtered.map((i) => {
            const entry = entries[i];
            if (!entry) return null;
            return (
              <Link
                key={entry.id}
                href={`/library/${encodeURIComponent(entry.id)}`}
                className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 transition-colors hover:border-[var(--color-accent)]"
              >
                {animations[i] ? (
                  <LottiePlayer animationData={animations[i]} renderer="lottie-web" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-md bg-[var(--color-bg-elev-2)] text-xs text-[var(--color-fg-faint)]">
                    no animation
                  </div>
                )}
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <div className="truncate text-sm font-medium">{entry.meta.title || entry.id}</div>
                  <LicenseBadge id={entry.meta.license_id} />
                </div>
                <div className="mt-1 truncate text-xs text-[var(--color-fg-muted)]">
                  {entry.meta.tags?.slice(0, 4).join(" · ") || "—"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
