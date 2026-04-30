import { clsx } from "clsx";

export function LicenseBadge({ id }: { id: string }) {
  const tone = toneFor(id);
  return (
    <span
      className={clsx(
        "inline-block rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none",
        tone === "open" && "border-[var(--color-success)] text-[var(--color-success)]",
        tone === "permissive" && "border-[var(--color-accent)] text-[var(--color-accent)]",
        tone === "share-alike" && "border-[var(--color-warning)] text-[var(--color-warning)]",
        tone === "restrict" && "border-[var(--color-danger)] text-[var(--color-danger)]",
        tone === "unknown" && "border-[var(--color-border-strong)] text-[var(--color-fg-muted)]",
      )}
      title={`License: ${id}`}
    >
      {id}
    </span>
  );
}

function toneFor(id: string): "open" | "permissive" | "share-alike" | "restrict" | "unknown" {
  if (!id) return "unknown";
  const upper = id.toUpperCase();
  if (upper === "CC0-1.0" || upper === "MIT" || upper === "APACHE-2.0") return "open";
  if (upper.startsWith("CC-BY-4.0") || upper === "BSD-2-CLAUSE" || upper === "BSD-3-CLAUSE") return "permissive";
  if (upper.includes("SA") || upper.includes("GPL")) return "share-alike";
  if (upper.includes("NC") || upper.includes("PROPRIETARY")) return "restrict";
  return "unknown";
}
