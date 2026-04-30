"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  id: string;
  initialTags: string[];
};

/**
 * Inline tag editor for library/[id]. Click a chip's × to remove; type into the
 * trailing input + Enter to add. Each commit PATCHes /api/library/<id>/meta
 * with the entire new tags array (the route is idempotent).
 *
 * Chips themselves are still links to /library?tag=<t> when not in remove
 * mode — the × control is a separate button so a click on the chip body
 * navigates as before.
 */
export function LibraryTagEditor({ id, initialTags }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function commit(nextTags: string[]) {
    // Optimistic local update.
    setTags(nextTags);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(id)}/meta`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags: nextTags }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        tags?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`);
      // Server normalizes (trim/dedupe). Trust it as the new source of truth.
      if (Array.isArray(json.tags)) setTags(json.tags);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Roll back to the value that was on screen before the optimistic write.
      setTags(initialTags);
    } finally {
      setBusy(false);
    }
  }

  function removeTag(t: string) {
    if (busy) return;
    void commit(tags.filter((x) => x !== t));
  }

  function addTag(raw: string) {
    const t = raw.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setDraft("");
      return;
    }
    setDraft("");
    void commit([...tags, t]);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft("");
      inputRef.current?.blur();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      // Pop the last chip on backspace from an empty input — common pattern.
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="group inline-flex items-center overflow-hidden rounded-md border border-[var(--color-border)] text-xs text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
          >
            <Link
              href={`/library?tag=${encodeURIComponent(t)}`}
              className="px-2 py-0.5"
            >
              {t}
            </Link>
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => removeTag(t)}
              disabled={busy}
              className="border-l border-[var(--color-border)] px-1.5 py-0.5 text-[var(--color-fg-faint)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-danger)] disabled:opacity-40"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => {
            if (draft.trim()) addTag(draft);
          }}
          placeholder={tags.length ? "+ tag" : "add tag"}
          disabled={busy}
          className="min-w-20 flex-1 rounded-md border border-dashed border-[var(--color-border)] bg-transparent px-2 py-0.5 text-xs text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-faint)] focus:border-[var(--color-accent)] disabled:opacity-50"
        />
      </div>
      {error && (
        <div className="mt-2 text-[10px] text-[var(--color-danger)]">{error}</div>
      )}
    </div>
  );
}
