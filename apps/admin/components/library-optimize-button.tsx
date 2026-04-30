"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LibraryOptimizeButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(id)}/optimize`, {
        method: "POST",
      });
      const text = await res.text();
      let json: { id?: string; error?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server returned ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok || !json.id) {
        throw new Error(json.error ?? "Optimize failed");
      }
      router.push(`/review/${encodeURIComponent(json.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        disabled={busy}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-center text-xs hover:border-[var(--color-accent)] disabled:opacity-50"
      >
        {busy ? "Optimizing…" : "⚙ Optimize (python-lottie)"}
      </button>
      {error && (
        <span className="text-[10px] text-[var(--color-danger)]">{error}</span>
      )}
    </div>
  );
}
