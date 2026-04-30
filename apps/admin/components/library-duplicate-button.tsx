"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LibraryDuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/library/${encodeURIComponent(id)}/duplicate`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok || !json.id) {
        throw new Error(json.error || `Duplicate failed (${res.status})`);
      }
      router.push(`/library/${encodeURIComponent(json.id)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-center text-xs hover:border-[var(--color-accent)] disabled:opacity-50"
      >
        {busy ? "Duplicating…" : "⎘ Duplicate"}
      </button>
      {error && (
        <span className="text-[10px] text-[var(--color-danger)]">{error}</span>
      )}
    </div>
  );
}
