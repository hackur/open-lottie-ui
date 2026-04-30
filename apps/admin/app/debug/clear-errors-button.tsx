"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Posts /api/debug/clear-errors then refreshes the parent server component
 * so the empty ring buffer is reflected in the UI immediately.
 */
export function ClearErrorsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/debug/clear-errors", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("clear-errors failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy || pending}
      className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
    >
      {busy || pending ? "Clearing…" : "Clear errors"}
    </button>
  );
}
