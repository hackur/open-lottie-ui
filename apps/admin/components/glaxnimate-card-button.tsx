"use client";

import { useState, type MouseEvent } from "react";
import { clsx } from "clsx";

type Status =
  | { kind: "idle" }
  | { kind: "launching" }
  | { kind: "launched" }
  | { kind: "error"; message: string };

/**
 * Compact "Edit in Glaxnimate" affordance for library cards. The card itself
 * is a Link, so we stop click + keydown propagation here and never navigate.
 */
export function GlaxnimateCardButton({ id }: { id: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setStatus({ kind: "launching" });
    try {
      const res = await fetch(
        `/api/library/${encodeURIComponent(id)}/glaxnimate`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setStatus({
          kind: "error",
          message: json.error || `HTTP ${res.status}`,
        });
        setTimeout(() => setStatus({ kind: "idle" }), 4000);
        return;
      }
      setStatus({ kind: "launched" });
      setTimeout(() => setStatus({ kind: "idle" }), 2500);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      setTimeout(() => setStatus({ kind: "idle" }), 4000);
    }
  }

  const label =
    status.kind === "launching"
      ? "Opening…"
      : status.kind === "launched"
        ? "Opened ✓"
        : status.kind === "error"
          ? status.message.slice(0, 24)
          : "Edit in Glaxnimate";

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => e.stopPropagation()}
      disabled={status.kind === "launching"}
      title="Open this animation in Glaxnimate"
      className={clsx(
        "absolute right-1.5 top-1.5 z-10 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]/85 px-2 py-1 text-[10px] font-medium backdrop-blur transition-opacity",
        "opacity-0 group-hover:opacity-100 focus:opacity-100",
        status.kind === "error" &&
          "border-[var(--color-danger)] text-[var(--color-danger)] opacity-100",
        status.kind === "launched" &&
          "border-[var(--color-accent)] text-[var(--color-accent)] opacity-100",
        status.kind === "launching" && "opacity-100",
      )}
    >
      {label}
    </button>
  );
}
