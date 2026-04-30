"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

/**
 * Video / GIF / WebP / APNG → Lottie import flow.
 *
 * Posts to /api/import/video which extracts frames via ffmpeg and embeds each
 * as a base64-PNG image layer. The result is *raster-Lottie* — bigger than the
 * source — so the UI is unsubtle about the tradeoff.
 */
const ACCEPT = ".mp4,.mov,.webm,.gif,.webp,.apng,video/*,image/gif,image/webp,image/apng";

export function ImportVideo() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(24);
  const [maxFrames, setMaxFrames] = useState(240);
  const [width, setWidth] = useState(400);

  const onDrop = useCallback((ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    setDragOver(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) setFile(f);
  }, []);

  async function submit() {
    if (!file) {
      setError("Pick a video, GIF, WebP, or APNG to import.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const qs = new URLSearchParams({
        fps: String(fps),
        maxFrames: String(maxFrames),
        width: String(width),
      });
      const res = await fetch(`/api/import/video?${qs.toString()}`, {
        method: "POST",
        body: fd,
      });
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
      <div className="rounded-md border border-[var(--color-warning)] bg-[color-mix(in_oklch,var(--color-warning)_10%,transparent)] p-4 text-sm text-[var(--color-warning)]">
        <strong className="font-semibold">Heads up — raster-Lottie ahead.</strong>{" "}
        This embeds each frame as an image — the resulting Lottie file will be
        larger than the source video. Use only for short loops where you
        specifically need a Lottie format.
      </div>

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
        <div className="text-2xl">▶</div>
        <div className="mt-2 text-sm text-[var(--color-fg-muted)]">
          {file ? (
            <>
              Selected: <code className="font-mono text-[var(--color-fg)]">{file.name}</code>{" "}
              ({(file.size / 1024).toFixed(1)} KB)
            </>
          ) : (
            <>Drop a video / GIF / WebP / APNG here, or pick one below.</>
          )}
        </div>
        <div className="mt-4">
          <label className="cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-4 py-2 text-sm hover:border-[var(--color-accent)]">
            Choose file
            <input
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) setFile(f);
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumberField
          label="fps"
          hint="6–60 frames/sec"
          value={fps}
          min={6}
          max={60}
          onChange={setFps}
        />
        <NumberField
          label="max frames"
          hint="Cap on extracted frames"
          value={maxFrames}
          min={1}
          max={1200}
          onChange={setMaxFrames}
        />
        <NumberField
          label="width"
          hint="Pixel width; height auto-scales"
          value={width}
          min={100}
          max={2000}
          onChange={setWidth}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={submitting || !file}
          className="rounded-md bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-50"
        >
          {submitting ? "Importing…" : "Import video"}
        </button>
        {error && <span className="text-sm text-[var(--color-danger)]">{error}</span>}
      </div>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            onChange(Math.max(min, Math.min(max, n)));
          }
        }}
        className="w-full font-mono text-sm"
      />
      <div className="mt-1 text-[10px] text-[var(--color-fg-faint)]">{hint}</div>
    </div>
  );
}
