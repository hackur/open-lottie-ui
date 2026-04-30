"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  title?: string;
};

export function LibraryDeleteButton({ id, title }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res
        .json()
        .catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      router.push("/library");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="block w-full rounded-md border border-[var(--color-danger)] px-3 py-2 text-center text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)]"
      >
        Delete entry
      </button>
      {error && (
        <div className="mt-2 text-xs text-[var(--color-danger)]">{error}</div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)]">
          <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
            <div className="mb-2 text-sm font-medium">Delete library entry?</div>
            <div className="mb-4 text-xs text-[var(--color-fg-muted)]">
              This removes <code className="font-mono">{title || id}</code> from
              your library. The directory{" "}
              <code className="font-mono">library/{id}/</code> will be deleted.
              This cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={busy}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={busy}
                className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg)]"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
