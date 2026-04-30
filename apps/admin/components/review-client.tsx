"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LottiePlayer } from "@/components/lottie-player";
import { VisualDiff } from "@/components/visual-diff";
import { DebugPanel } from "@/components/debug-panel";
import { clsx } from "clsx";
import type { GenerationMeta } from "@open-lottie/lottie-tools/data";

const REJECT_CODES: { code: string; label: string }[] = [
  { code: "wrong-color", label: "Wrong color" },
  { code: "wrong-shape", label: "Wrong shape" },
  { code: "too-fast", label: "Too fast" },
  { code: "too-slow", label: "Too slow" },
  { code: "wrong-easing", label: "Wrong easing" },
  { code: "looks-broken", label: "Looks broken" },
  { code: "off-prompt", label: "Off-prompt" },
];

type Props = {
  meta: GenerationMeta;
  animation: unknown;
  baseAnimation: unknown;
  transcript: string | null;
};

export function ReviewClient({ meta, animation, baseAnimation, transcript }: Props) {
  const router = useRouter();
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [rejectCodes, setRejectCodes] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [frame, setFrame] = useState(0);

  const isDeletable =
    meta.status === "rejected" ||
    meta.status === "failed-validation" ||
    meta.status === "cancelled";

  useEffect(() => {
    if (meta.status !== "running") return;
    const evt = new EventSource(`/api/generate/${encodeURIComponent(meta.id)}/stream`);
    evt.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.kind === "text") setStreamLog((s) => [...s, ev.text]);
        else if (ev.kind === "result") {
          evt.close();
          router.refresh();
        }
      } catch {
        /* skip non-json */
      }
    };
    evt.addEventListener("end", () => {
      evt.close();
      router.refresh();
    });
    evt.addEventListener("error", () => {
      evt.close();
    });
    return () => evt.close();
  }, [meta.status, meta.id, router]);

  // Keyboard shortcuts: a = approve, r = reject
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (meta.status !== "pending-review") return;
      if (e.key === "a") void approve();
      else if (e.key === "r") setShowReject(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.status]);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/generate/${encodeURIComponent(meta.id)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as { library_id?: string; error?: string };
      if (!res.ok || !json.library_id) throw new Error(json.error || "Approve failed");
      router.push(`/library/${encodeURIComponent(json.library_id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function editAndRetry() {
    const params = new URLSearchParams({ retry: meta.id });
    if (meta.base_id) params.set("remix", meta.base_id);
    router.push(`/generate?${params.toString()}`);
  }

  async function reject() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/generate/${encodeURIComponent(meta.id)}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codes: rejectCodes, note: rejectNote }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Reject failed");
      router.push("/review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/generate/${encodeURIComponent(meta.id)}/cancel`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Cancel failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteGen() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/generate/${encodeURIComponent(meta.id)}`, {
        method: "DELETE",
      });
      const json = (await res
        .json()
        .catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Delete failed");
      router.push("/review");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const validation = meta.validation;
  const errors = (validation?.errors ?? []) as Array<{ path?: string; message?: string; keyword?: string }>;

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.prompt_summary || meta.id}</h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--color-fg-muted)]">
            <code className="font-mono">{meta.id}</code>
            <span>tier {meta.tier}</span>
            {meta.template_id && <span className="text-[var(--color-accent)]">{meta.template_id}</span>}
            {meta.cost_usd != null && meta.cost_usd > 0 && <span>${meta.cost_usd.toFixed(4)}</span>}
            <StatusPill status={meta.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {meta.status === "running" && (
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-md border border-[var(--color-warning)] px-4 py-2 text-sm text-[var(--color-warning)]"
            >
              Cancel
            </button>
          )}
          {meta.status === "pending-review" && (
            <>
              <button
                onClick={editAndRetry}
                disabled={busy}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-fg)]"
              >
                Edit and retry
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={busy}
                className="rounded-md border border-[var(--color-danger)] px-4 py-2 text-sm text-[var(--color-danger)]"
              >
                Reject <kbd className="ml-2">r</kbd>
              </button>
              <button
                onClick={approve}
                disabled={busy}
                className="rounded-md bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-[var(--color-bg)]"
              >
                Approve <kbd className="ml-2">a</kbd>
              </button>
            </>
          )}
          {(meta.status === "rejected" || meta.status === "failed-validation") && (
            <button
              onClick={editAndRetry}
              disabled={busy}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
            >
              Edit and retry
            </button>
          )}
          {isDeletable && (
            <button
              onClick={() => setShowDelete(true)}
              disabled={busy}
              className="rounded-md border border-[var(--color-danger)] px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)]"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-[var(--color-danger)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {meta.status === "running" && (
        <LiveStream model={meta.model} log={streamLog} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
            {meta.base_id ? `Base — ${meta.base_id}` : "Base — (blank)"}
          </div>
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
            {baseAnimation ? (
              <LottiePlayer animationData={baseAnimation} controlledFrame={frame} />
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-[var(--color-fg-faint)]">
                no base
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">Generation</div>
          <div className="rounded-md border border-[var(--color-accent)] bg-[var(--color-bg-elev)] p-3">
            {animation ? (
              <LottiePlayer
                animationData={animation}
                controls
                onFrame={(f) => setFrame(f)}
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-[var(--color-fg-faint)]">
                {meta.status === "running" ? "generating…" : "no animation"}
              </div>
            )}
          </div>
        </div>
      </div>

      {meta.base_id && animation != null ? (
        <VisualDiff generationId={meta.id} />
      ) : null}

      <DebugPanel id={meta.id} isRunning={meta.status === "running"} />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">Validation</div>
          <div
            className={clsx(
              "rounded-md border p-3 text-sm",
              validation.ok
                ? "border-[var(--color-success)] text-[var(--color-success)]"
                : "border-[var(--color-warning)]",
            )}
          >
            {validation.ok ? (
              <span>✓ Valid against lottie-spec subset.</span>
            ) : (
              <div>
                <div className="font-medium text-[var(--color-warning)]">{errors.length} errors</div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--color-fg-muted)]">
                  {errors.slice(0, 6).map((e, i) => (
                    <li key={i}>
                      <code className="font-mono text-[var(--color-warning)]">{e.path || ""}</code> — {e.message}
                    </li>
                  ))}
                  {errors.length > 6 && <li>…and {errors.length - 6} more</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">Render</div>
          <div className="rounded-md border border-[var(--color-border)] p-3 text-sm text-[var(--color-fg-muted)]">
            {meta.render?.total_frames ? (
              <span>
                {meta.render.total_frames} frames sampled · {meta.render.blank_frames} blank
              </span>
            ) : (
              <span className="text-[var(--color-fg-faint)]">render check not run (M1)</span>
            )}
          </div>
        </div>
      </div>

      {transcript && (
        <div className="mt-6">
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            {showTranscript ? "Hide" : "Show"} Claude transcript
          </button>
          {showTranscript && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-xs">
              {transcript}
            </pre>
          )}
        </div>
      )}

      {showDelete && isDeletable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)]">
          <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
            <div className="mb-2 text-sm font-medium">Delete generation?</div>
            <div className="mb-4 text-xs text-[var(--color-fg-muted)]">
              This removes <code className="font-mono">generations/{meta.id}/</code>{" "}
              from disk including the Claude transcript and all versions. The
              decisions log keeps a permanent record of the deletion. This
              cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                disabled={busy}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteGen}
                disabled={busy}
                className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-bg)]"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReject && meta.status === "pending-review" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)]">
          <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
            <div className="mb-3 text-sm font-medium">Reason for rejection</div>
            <div className="mb-3 flex flex-wrap gap-2">
              {REJECT_CODES.map((c) => (
                <button
                  key={c.code}
                  onClick={() =>
                    setRejectCodes((codes) =>
                      codes.includes(c.code) ? codes.filter((k) => k !== c.code) : [...codes, c.code],
                    )
                  }
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs",
                    rejectCodes.includes(c.code)
                      ? "border-[var(--color-danger)] text-[var(--color-danger)]"
                      : "border-[var(--color-border)] text-[var(--color-fg-muted)]",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Note (optional, fed into next prompt)"
              className="w-full"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowReject(false)}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                disabled={busy}
                className="rounded-md bg-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-fg)]"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveStream({ model, log }: { model: string; log: string[] }) {
  const ref = useRef<HTMLPreElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  const text = log.join("");
  const charCount = text.length;
  return (
    <div className="mb-6 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          </span>
          Live stream
        </div>
        <div className="text-[10px] font-mono text-[var(--color-fg-faint)]">
          {model} · {charCount} chars
        </div>
      </div>
      <pre
        ref={ref}
        className="scrollbar-thin max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--color-fg)]"
      >
        {text || <span className="text-[var(--color-fg-faint)]">Waiting for Claude…</span>}
      </pre>
    </div>
  );
}

function StatusPill({ status }: { status: GenerationMeta["status"] }) {
  const tone =
    status === "approved"
      ? "var(--color-success)"
      : status === "rejected"
        ? "var(--color-fg-muted)"
        : status === "failed-validation" || status === "failed-render"
          ? "var(--color-danger)"
          : status === "pending-review"
            ? "var(--color-accent)"
            : "var(--color-warning)";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ color: tone }}>●</span>
      <span>{status}</span>
    </span>
  );
}
