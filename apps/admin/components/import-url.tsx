"use client";

import { useState } from "react";
import { clsx } from "clsx";

import { LottiePlayer } from "@/components/lottie-player";

type AssetCandidate = {
  url: string;
  source: string;
  format: "json" | "lottie" | "unknown";
};

type ScannedAsset = {
  candidate: AssetCandidate;
  ok: boolean;
  reason?: string;
  bytes?: number;
  intrinsic?: { fr: number; w: number; h: number; ip: number; op: number; layer_count: number };
  preview?: unknown;
  contentHash?: string;
};

type ScanResponse = {
  ok: true;
  page_url: string;
  candidates: AssetCandidate[];
  scanned: ScannedAsset[];
};

const LICENSE_OPTIONS = [
  { value: "unknown", label: "Unknown (default — set per asset)" },
  { value: "CC0-1.0", label: "CC0-1.0 (public domain)" },
  { value: "MIT", label: "MIT" },
  { value: "CC-BY-4.0", label: "CC-BY-4.0 (attribution required)" },
  { value: "CC-BY-SA-4.0", label: "CC-BY-SA-4.0" },
  { value: "CC-BY-NC-4.0", label: "CC-BY-NC-4.0" },
  { value: "proprietary-paid", label: "Proprietary / paid" },
];

export function ImportUrl() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  async function scan() {
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/import/url/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Scan failed (${res.status})`);
      }
      setResult(json as ScanResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }

  const validCount = result?.scanned.filter((s) => s.ok).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[var(--color-warning,orange)] bg-[color-mix(in_oklch,orange_8%,transparent)] p-3 text-xs text-[var(--color-fg-muted)]">
        <strong className="text-[var(--color-fg)]">License:</strong> respect the
        source&apos;s terms. This tool defaults to <code>unknown</code> — set it
        correctly per asset before importing. We do not bulk-mirror any service
        that prohibits it (LottieFiles, Lordicon, etc.).
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
          Page URL to scan
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page-with-lotties"
            className="flex-1 font-mono text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim() && !scanning) scan();
            }}
          />
          <button
            onClick={scan}
            disabled={scanning || !url.trim()}
            className="rounded-md bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
          >
            {scanning ? "Scanning…" : "Scan"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-danger)] bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="text-sm text-[var(--color-fg-muted)]">
            Found <strong className="text-[var(--color-fg)]">{result.candidates.length}</strong>{" "}
            candidate{result.candidates.length === 1 ? "" : "s"} on{" "}
            <code className="font-mono text-[var(--color-fg)]">{result.page_url}</code>
            {" — "}
            <strong className="text-[var(--color-fg)]">{validCount}</strong> validated as Lottie.
          </div>

          {result.scanned.length === 0 && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 text-center text-sm text-[var(--color-fg-muted)]">
              No Lottie references found in the page HTML. Try a page that embeds a{" "}
              <code className="font-mono">&lt;lottie-player&gt;</code> or links to a{" "}
              <code className="font-mono">.json</code> / <code className="font-mono">.lottie</code> file.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {result.scanned.map((s) => (
              <ScannedCard key={s.candidate.url} scanned={s} pageUrl={result.page_url} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScannedCard({
  scanned,
  pageUrl,
}: {
  scanned: ScannedAsset;
  pageUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [licenseId, setLicenseId] = useState("unknown");
  const [title, setTitle] = useState("");
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  const c = scanned.candidate;
  const formatColor =
    c.format === "json"
      ? "text-[var(--color-success,#3a3)]"
      : c.format === "lottie"
        ? "text-[var(--color-accent)]"
        : "text-[var(--color-fg-muted)]";

  async function doImport() {
    setImporting(true);
    setImportErr(null);
    try {
      const res = await fetch("/api/import/url/fetch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          asset_url: c.url,
          page_url: pageUrl,
          license_id: licenseId,
          title: title.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `Import failed (${res.status})`);
      }
      setImported(json.library_id);
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className={clsx(
        "rounded-lg border p-3",
        scanned.ok
          ? "border-[var(--color-border)] bg-[var(--color-bg-elev)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev)] opacity-60",
      )}
    >
      <div className="aspect-square overflow-hidden rounded-md bg-[var(--color-bg-elev-2)]">
        {scanned.ok && scanned.preview ? (
          <LottiePlayer animationData={scanned.preview} loop autoplay />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-[var(--color-fg-muted)]">
            {scanned.reason ?? "no-preview"}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={clsx("font-mono uppercase", formatColor)}>{c.format}</span>
        <span className="text-[var(--color-fg-faint)]">{c.source}</span>
      </div>

      <div className="mt-1 break-all font-mono text-[10px] text-[var(--color-fg-muted)]" title={c.url}>
        {c.url}
      </div>

      {scanned.ok && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--color-fg-muted)]">
          {scanned.intrinsic && (
            <span>
              {scanned.intrinsic.w}×{scanned.intrinsic.h} · {scanned.intrinsic.fr}fps ·{" "}
              {scanned.intrinsic.layer_count} layers
            </span>
          )}
          {typeof scanned.bytes === "number" && (
            <span>{Math.round(scanned.bytes / 1024)} KB</span>
          )}
        </div>
      )}

      {scanned.ok && !imported && (
        <div className="mt-3">
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="w-full rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)]"
            >
              Import…
            </button>
          ) : (
            <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)]">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="(auto from URL)"
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)]">
                  License
                </label>
                <select
                  value={licenseId}
                  onChange={(e) => setLicenseId(e.target.value)}
                  className="w-full text-xs"
                >
                  {LICENSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={doImport}
                  disabled={importing}
                  className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
                >
                  {importing ? "Importing…" : "Confirm"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  disabled={importing}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
              {importErr && (
                <div className="text-[10px] text-[var(--color-danger)]">{importErr}</div>
              )}
            </div>
          )}
        </div>
      )}

      {imported && (
        <div className="mt-3 rounded-md border border-[var(--color-success,#3a3)] bg-[color-mix(in_oklch,#3a3_10%,transparent)] p-2 text-xs">
          <span className="text-[var(--color-success,#3a3)]">✓ Imported</span>{" "}
          <a
            href={`/library/${encodeURIComponent(imported)}`}
            className="font-mono text-[var(--color-accent)] underline"
          >
            {imported}
          </a>
        </div>
      )}
    </div>
  );
}
