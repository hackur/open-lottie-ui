"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "launching" }
  | { kind: "launched"; pid?: number }
  | { kind: "missing"; installUrl?: string }
  | { kind: "error"; message: string };

type Props = {
  id: string;
};

export function GlaxnimateButton({ id }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onClick() {
    setStatus({ kind: "launching" });
    try {
      const res = await fetch(
        `/api/library/${encodeURIComponent(id)}/glaxnimate`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        pid?: number;
        error?: string;
        install_url?: string;
      };
      if (res.status === 503) {
        setStatus({
          kind: "missing",
          installUrl: json.install_url || "https://glaxnimate.org/",
        });
        return;
      }
      if (!res.ok || !json.ok) {
        setStatus({
          kind: "error",
          message: json.error || `Request failed (${res.status})`,
        });
        return;
      }
      setStatus({ kind: "launched", pid: json.pid });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={status.kind === "launching"}
        className="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-center text-xs hover:border-[var(--color-accent)] disabled:opacity-60"
      >
        {status.kind === "launching" ? "Opening…" : "Edit in Glaxnimate"}
      </button>

      {status.kind === "launched" && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs text-[var(--color-fg-muted)]">
          Opened in Glaxnimate
          {typeof status.pid === "number" && (
            <>
              {" "}
              <code className="font-mono text-[10px]">pid {status.pid}</code>
            </>
          )}
          . Come back here when you're done — we&apos;ll watch for changes for
          30 minutes and queue any saves for review.
        </div>
      )}

      {status.kind === "missing" && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs text-[var(--color-fg-muted)]">
          Glaxnimate not detected. Install from{" "}
          <a
            className="text-[var(--color-accent)] underline"
            href={status.installUrl || "https://glaxnimate.org/"}
            target="_blank"
            rel="noreferrer"
          >
            glaxnimate.org
          </a>
          .
        </div>
      )}

      {status.kind === "error" && (
        <div className="rounded-md border border-[var(--color-danger)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {status.message}
        </div>
      )}
    </div>
  );
}
