"use client";

/**
 * Per-frame visual-diff strip for remix generations.
 *
 * Hits `/api/review/<id>/diff` once on mount, then renders the per-frame diff
 * PNGs as a horizontal strip. Mounted from `review-client.tsx` only when
 * `meta.base_id` is set.
 */

import { useEffect, useState } from "react";

interface FrameDiffApi {
  frame: number;
  ratio: number;
  mismatch_pixels: number;
}

interface DiffResponse {
  frames: number;
  frame_diffs: FrameDiffApi[];
  max_ratio: number;
  peak_frame: number;
  width: number;
  height: number;
  summary: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: DiffResponse }
  | { kind: "error"; status: number; message: string };

export function VisualDiff({ generationId }: { generationId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch(
          `/api/review/${encodeURIComponent(generationId)}/diff`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => ({}))) as
          | DiffResponse
          | { error?: string; detail?: string };
        if (cancelled) return;
        if (!res.ok) {
          const err = json as { error?: string; detail?: string };
          setState({
            kind: "error",
            status: res.status,
            message: err.detail || err.error || `HTTP ${res.status}`,
          });
          return;
        }
        setState({ kind: "ready", data: json as DiffResponse });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          status: 0,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [generationId]);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
          Visual diff
        </div>
        {state.kind === "ready" && (
          <div className="text-xs text-[var(--color-fg-muted)]">
            Peak diff:{" "}
            <span className="text-[var(--color-fg)]">
              {(state.data.max_ratio * 100).toFixed(1)}%
            </span>{" "}
            at frame{" "}
            <span className="font-mono">{state.data.peak_frame}</span>
          </div>
        )}
      </div>

      {state.kind === "loading" && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4 text-xs text-[var(--color-fg-muted)]">
          Rendering frames through inlottie…
        </div>
      )}

      {state.kind === "error" && (
        <div
          className={
            state.status === 503
              ? "rounded-md border border-[var(--color-warning)] bg-[var(--color-bg-elev)] p-3 text-xs text-[var(--color-warning)]"
              : "rounded-md border border-[var(--color-danger)] bg-[var(--color-bg-elev)] p-3 text-xs text-[var(--color-danger)]"
          }
        >
          <div className="font-medium">
            {state.status === 503
              ? "Visual diff unavailable"
              : "Visual diff failed"}
          </div>
          <div className="mt-1 text-[var(--color-fg-muted)]">{state.message}</div>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
          <ol className="flex gap-3">
            {state.data.frame_diffs.map((d) => {
              const pct = (d.ratio * 100).toFixed(1);
              const isPeak = d.frame === state.data.peak_frame;
              return (
                <li
                  key={d.frame}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <div
                    className={
                      isPeak
                        ? "rounded-md border border-[var(--color-accent)] bg-[#000]"
                        : "rounded-md border border-[var(--color-border)] bg-[#000]"
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`diff frame ${d.frame}`}
                      src={`/api/review/${encodeURIComponent(generationId)}/diff/frame/${d.frame}`}
                      width={state.data.width}
                      height={state.data.height}
                      className="block"
                      style={{
                        width: `${state.data.width}px`,
                        height: `${state.data.height}px`,
                        imageRendering: "pixelated",
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-[var(--color-fg-faint)]">
                    f{d.frame}
                  </div>
                  <div
                    className={
                      isPeak
                        ? "text-xs font-medium text-[var(--color-accent)]"
                        : "text-xs text-[var(--color-fg-muted)]"
                    }
                  >
                    {pct}%
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
