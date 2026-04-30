import { detectTools } from "@/lib/detect-tools";

export async function HostStatus() {
  const tools = await detectTools();
  return (
    <div className="flex items-center gap-3 text-xs">
      {tools.map((t) => (
        <span
          key={t.name}
          className="flex items-center gap-1 text-[var(--color-fg-muted)]"
          title={t.found ? t.version || "found" : "not found on PATH"}
        >
          <span className={t.found ? "text-[var(--color-success)]" : "text-[var(--color-fg-faint)]"}>
            {t.found ? "✓" : "✗"}
          </span>
          {t.name}
        </span>
      ))}
    </div>
  );
}
