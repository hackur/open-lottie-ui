"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

export function ImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    setDragOver(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) {
      setFile(f);
      setPasted("");
    }
  }, []);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        res = await fetch("/api/import/svg", { method: "POST", body: fd });
      } else if (pasted.trim()) {
        res = await fetch("/api/import/svg", {
          method: "POST",
          headers: { "content-type": "image/svg+xml" },
          body: pasted,
        });
      } else {
        throw new Error("Provide an SVG file or paste markup.");
      }

      const text = await res.text();
      let json: { id?: string; error?: string; code?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server returned ${res.status} (${res.statusText}): ${text.slice(0, 200)}`);
      }
      if (!res.ok || !json.id) {
        throw new Error(json.error ?? "Import failed");
      }
      router.push(`/review/${encodeURIComponent(json.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={clsx(
          "rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          dragOver
            ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)]"
            : "border-[var(--color-border)] bg-[var(--color-bg-elev)]",
        )}
      >
        <div className="text-2xl">↥</div>
        <div className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {file ? (
            <>
              Selected: <code className="font-mono text-[var(--color-fg)]">{file.name}</code>{" "}
              ({file.size} bytes)
            </>
          ) : (
            <>Drop an SVG here, or pick one below.</>
          )}
        </div>
        <div className="mt-4">
          <label className="cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-4 py-2 text-sm hover:border-[var(--color-accent)]">
            Choose file
            <input
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) {
                  setFile(f);
                  setPasted("");
                }
              }}
            />
          </label>
          {file && (
            <button
              onClick={() => setFile(null)}
              className="ml-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-3 py-2 text-xs text-[var(--color-fg-muted)] hover:border-[var(--color-danger)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
          …or paste SVG markup
        </label>
        <textarea
          value={pasted}
          onChange={(e) => {
            setPasted(e.target.value);
            if (e.target.value.trim()) setFile(null);
          }}
          rows={8}
          placeholder='<svg xmlns="http://www.w3.org/2000/svg" ...>'
          className="w-full font-mono text-xs"
          disabled={Boolean(file)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={submitting || (!file && !pasted.trim())}
          className="rounded-md bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
        >
          {submitting ? "Importing…" : "Import SVG"}
        </button>
        {error && <span className="text-sm text-[var(--color-danger)]">{error}</span>}
      </div>
    </div>
  );
}
