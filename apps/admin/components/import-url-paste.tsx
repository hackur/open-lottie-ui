"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

import { LottiePlayer } from "@/components/lottie-player";

/**
 * Paste-URL flow for /import.
 *
 * Talks to:
 *   - POST /api/import/url       — scan and return candidate assets
 *   - POST /api/import/url/save  — fetch + persist a single asset as a Tier-1
 *                                  generation (queued for review).
 *
 * Lighter-weight than the page-scan variant; this one accepts a direct .json /
 * .lottie URL OR a webpage to scan, and offers per-asset Import buttons. If
 * the scan returns exactly one asset, it auto-imports.
 */
type ScrapedAsset = {
  url: string;
  filename: string;
  size_bytes: number | null;
  content_type: string;
  preview?: unknown;
};

export function ImportUrlPaste() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<ScrapedAsset[] | null>(null);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);

  async function scan() {
    setScanning(true);
    setError(null);
    setAssets(null);
    try {
      const res = await fetch("/api/import/url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Scan failed (${res.status})`);
      }
      const result = json.assets as ScrapedAsset[];
      setAssets(result);
      // Auto-import when there's exactly one.
      if (result.length === 1 && result[0]?.preview) {
        await save(result[0].url, result[0].filename);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  }

  async function save(assetUrl: string, filename?: string) {
    setSavingUrl(assetUrl);
    setError(null);
    try {
      const res = await fetch("/api/import/url/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: assetUrl, filename }),
      });
      const json = await res.json();
      if (!res.ok || !json.id) {
        throw new Error(json.error ?? `Save failed (${res.status})`);
      }
      router.push(`/review/${encodeURIComponent(json.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSavingUrl(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
          URL (direct .json / .lottie or a webpage to scan)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/animation.json"
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

      {assets && (
        <div className="space-y-3">
          <div className="text-sm text-[var(--color-fg-muted)]">
            Found <strong className="text-[var(--color-fg)]">{assets.length}</strong>{" "}
            asset{assets.length === 1 ? "" : "s"}.
          </div>

          {assets.length === 0 && (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-6 text-center text-sm text-[var(--color-fg-muted)]">
              No Lottie content discovered at that URL.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {assets.map((a) => (
              <AssetRow
                key={a.url}
                asset={a}
                saving={savingUrl === a.url}
                onImport={() => save(a.url, a.filename)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetRow({
  asset,
  saving,
  onImport,
}: {
  asset: ScrapedAsset;
  saving: boolean;
  onImport: () => void;
}) {
  const sizeKb = asset.size_bytes != null ? `${Math.round(asset.size_bytes / 1024)} KB` : "size unknown";
  return (
    <div
      className={clsx(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3",
        !asset.preview && "opacity-70",
      )}
    >
      <div className="aspect-square overflow-hidden rounded-md bg-[var(--color-bg-elev-2)]">
        {asset.preview ? (
          <LottiePlayer animationData={asset.preview} loop autoplay />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-[var(--color-fg-muted)]">
            no preview
          </div>
        )}
      </div>
      <div className="mt-2 break-all font-mono text-[10px] text-[var(--color-fg-muted)]" title={asset.url}>
        {asset.url}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--color-fg-faint)]">
        <span className="truncate">{asset.filename}</span>
        <span>{sizeKb}</span>
      </div>
      <div className="mt-1 text-[10px] text-[var(--color-fg-faint)]">
        {asset.content_type}
      </div>
      <button
        onClick={onImport}
        disabled={saving}
        className="mt-3 w-full rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
      >
        {saving ? "Importing…" : "Import"}
      </button>
    </div>
  );
}
