"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { clsx } from "clsx";
import { LottiePlayer } from "@/components/lottie-player";
import { LicenseBadge } from "@/components/license-badge";
import { GlaxnimateCardButton } from "@/components/glaxnimate-card-button";

type Entry = {
  id: string;
  meta: {
    title: string;
    tags: string[];
    license_id: string;
    source?: string;
  };
};

type Facet = { value: string; count: number };

type Sort = "newest" | "oldest" | "title";

type Props = {
  entries: Entry[];
  animations: (unknown | null)[];
  tags: Facet[];
  sources: Facet[];
  initialQuery?: string;
  initialTag?: string;
  initialSource?: string;
  initialSort?: Sort;
  page: number;
  pageSize: number;
  totalFiltered: number;
  totalPages: number;
  enableGlaxnimate?: boolean;
};

/**
 * Renders a static PNG thumb (cheap, cached on disk) by default, and
 * swaps to a live `LottiePlayer` on hover or focus. If the thumb endpoint
 * 404s — typically because `inlottie` isn't installed — silently falls
 * back to the live player so the page still works end-to-end.
 */
function LibraryCardMedia({
  id,
  animationData,
}: {
  id: string;
  animationData: unknown | null;
}) {
  const [thumbBroken, setThumbBroken] = useState(false);
  const [live, setLive] = useState(false);

  const showLive = (live || thumbBroken) && animationData != null;
  const thumbUrl = `/api/library/${encodeURIComponent(id)}/thumb`;

  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-md bg-[var(--color-bg-elev-2)]"
      onMouseEnter={() => setLive(true)}
      onFocus={() => setLive(true)}
    >
      {showLive ? (
        <LottiePlayer animationData={animationData} renderer="lottie-web" />
      ) : !thumbBroken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
          onError={() => setThumbBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-fg-faint)]">
          no animation
        </div>
      )}
    </div>
  );
}

export function LibraryGrid({
  entries,
  animations,
  tags,
  sources,
  initialQuery = "",
  initialTag = "",
  initialSource = "",
  initialSort = "newest",
  page,
  pageSize,
  totalFiltered,
  totalPages,
  enableGlaxnimate = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);

  // Keep the input in sync if the URL changes from elsewhere (e.g. pagination).
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function buildUrl(next: Partial<{ q: string; tag: string; source: string; sort: string; page: number }>) {
    const params = new URLSearchParams(searchParams.toString());
    const setOrDel = (key: string, val: string | number | undefined) => {
      if (val === undefined) return;
      const s = String(val);
      if (s && s !== "0") params.set(key, s);
      else params.delete(key);
    };
    setOrDel("q", next.q !== undefined ? next.q : undefined);
    setOrDel("tag", next.tag !== undefined ? next.tag : undefined);
    setOrDel("source", next.source !== undefined ? next.source : undefined);
    setOrDel("sort", next.sort !== undefined ? next.sort : undefined);
    setOrDel("page", next.page !== undefined ? next.page : undefined);
    const qs = params.toString();
    return qs ? `/library?${qs}` : "/library";
  }

  function navigate(next: Parameters<typeof buildUrl>[0]) {
    const url = buildUrl(next);
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  }

  // Debounce search input → URL.
  useEffect(() => {
    if (query === initialQuery) return;
    const handle = setTimeout(() => {
      navigate({ q: query, page: 1 });
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filterActive = Boolean(initialQuery.trim() || initialTag || initialSource);

  function onTagClick(t: string) {
    navigate({ tag: initialTag === t ? "" : t, page: 1 });
  }

  function onSourceChange(s: string) {
    navigate({ source: s, page: 1 });
  }

  function onSortChange(s: string) {
    navigate({ sort: s, page: 1 });
  }

  function clearFilters() {
    setQuery("");
    navigate({ q: "", tag: "", source: "", page: 1 });
  }

  const rangeStart = entries.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = (page - 1) * pageSize + entries.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, id, or tag…"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm placeholder:text-[var(--color-fg-faint)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <select
            value={initialSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            aria-label="Filter by source"
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.value} ({s.count})
              </option>
            ))}
          </select>
          <select
            value={initialSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            aria-label="Sort order"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const selected = initialTag === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onTagClick(t.value)}
                  className={clsx(
                    "rounded-md border px-2 py-0.5 text-xs transition-colors",
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                      : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]",
                  )}
                >
                  {t.value}
                  <span className="ml-1 text-[10px] opacity-70">{t.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-fg-muted)]">
        <span>
          {totalFiltered === 0
            ? "0 results"
            : `${rangeStart}–${rangeEnd} of ${totalFiltered}`}
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

      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-fg-muted)]">
          No animations match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {entries.map((entry, i) => (
            <Link
              key={entry.id}
              href={`/library/${encodeURIComponent(entry.id)}`}
              className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 transition-colors hover:border-[var(--color-accent)]"
            >
              <div className="relative">
                <LibraryCardMedia id={entry.id} animationData={animations[i]} />
                {enableGlaxnimate && <GlaxnimateCardButton id={entry.id} />}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <div className="truncate text-sm font-medium">{entry.meta.title || entry.id}</div>
                <LicenseBadge id={entry.meta.license_id} />
              </div>
              <div className="mt-1 truncate text-xs text-[var(--color-fg-muted)]">
                {entry.meta.tags?.slice(0, 4).join(" · ") || "—"}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          buildUrl={(p) => buildUrl({ page: p })}
        />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  buildUrl,
}: {
  page: number;
  totalPages: number;
  buildUrl: (p: number) => string;
}) {
  const pages = pageRange(page, totalPages);
  return (
    <nav className="flex items-center justify-center gap-1 pt-2 text-sm" aria-label="Pagination">
      <PageLink href={buildUrl(Math.max(1, page - 1))} disabled={page <= 1}>
        ← Prev
      </PageLink>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-[var(--color-fg-faint)]">
            …
          </span>
        ) : (
          <PageLink key={p} href={buildUrl(p)} current={p === page}>
            {p}
          </PageLink>
        ),
      )}
      <PageLink href={buildUrl(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
        Next →
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
}) {
  const className = clsx(
    "min-w-[2rem] rounded-md border px-2.5 py-1 text-center transition-colors",
    current
      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
      : "border-[var(--color-border)] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) {
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} scroll={false} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}
