"use client";

import { useEffect, useState } from "react";

/**
 * Shared client error boundary surface used by every per-route `error.tsx`.
 * Shows the message + (in dev) the stack, a "Try again" button bound to the
 * Next.js-provided `reset()` callback, and a "Copy details" button that puts
 * a JSON blob with route + message + stack onto the clipboard.
 */
export function RouteError({
  route,
  error,
  reset,
}: {
  route: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isProd = process.env.NODE_ENV === "production";

  useEffect(() => {
    // Surface to the dev console too — the ring-buffer fetch happens via the
    // /api/__client-error endpoint below.
    console.error(`[${route}]`, error);
    // Best-effort POST so server-side ring buffer captures client crashes too.
    void fetch("/api/debug/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        route,
        message: error.message,
        stack: error.stack ?? "",
        digest: error.digest ?? null,
      }),
    }).catch(() => {});
  }, [error, route]);

  const onCopy = async () => {
    const blob = JSON.stringify(
      {
        route,
        message: error.message,
        stack: error.stack ?? "",
        digest: error.digest ?? null,
        ts: new Date().toISOString(),
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in insecure contexts; fall back to a textarea.
      const ta = document.createElement("textarea");
      ta.value = blob;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="rounded-md border border-[var(--color-danger)] bg-[color-mix(in_oklch,var(--color-danger)_8%,transparent)] p-5">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-danger)]">
          <span>●</span>
          <span>{route} crashed</span>
        </div>
        <h2 className="mb-3 break-words text-lg font-medium text-[var(--color-fg)]">
          {error.message || "Unknown error"}
        </h2>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={reset}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-fg)]"
          >
            Try again
          </button>
          <button
            onClick={onCopy}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            {copied ? "Copied!" : "Copy details"}
          </button>
          <a
            href="/debug"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Open /debug
          </a>
        </div>
        {error.digest && (
          <div className="mb-2 text-xs text-[var(--color-fg-faint)]">
            digest: <code className="font-mono">{error.digest}</code>
          </div>
        )}
        {!isProd && error.stack && (
          <details open>
            <summary className="cursor-pointer text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
              stack
            </summary>
            <pre className="scrollbar-thin mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-[var(--color-bg-elev-2)] p-3 font-mono text-[10px] text-[var(--color-fg-muted)]">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
