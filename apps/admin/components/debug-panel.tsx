"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

type DebugData = {
  id: string;
  status: string;
  tier: number;
  model: string;
  session_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  cost_usd: number | null;
  num_turns: number | null;
  versions: { v: number; validated: boolean; errors_count: number }[];
  validation_errors: unknown[];
  persisted_events: Array<{ ts: string; elapsed_ms: number; event: { kind: string; [k: string]: unknown } }>;
  live_buffer: Array<{ kind: string; [k: string]: unknown }> | null;
  live_buffer_count: number;
  transcript: string | null;
  transcript_chars: number;
};

const KIND_TONE: Record<string, string> = {
  init: "var(--color-fg-muted)",
  text: "var(--color-fg)",
  tool_use: "var(--color-warning)",
  result: "var(--color-success)",
  error: "var(--color-danger)",
  raw: "var(--color-fg-faint)",
};

export function DebugPanel({ id, isRunning }: { id: string; isRunning: boolean }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DebugData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const res = await fetch(`/api/generate/${encodeURIComponent(id)}/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DebugData;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
      if (!cancelled && isRunning) {
        timer = setTimeout(fetchOnce, 1000);
      }
    };

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, open, isRunning]);

  return (
    <div className="mt-6 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-xs uppercase tracking-wider text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        <span>{open ? "▾" : "▸"} Debug</span>
        <span className="text-[var(--color-fg-faint)]">{data ? `${data.persisted_events.length} events · ${data.transcript_chars} chars` : "…"}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] p-4 text-xs">
          {error && (
            <div className="mb-2 rounded border border-[var(--color-danger)] px-2 py-1 text-[var(--color-danger)]">
              {error}
            </div>
          )}
          {data ? (
            <div className="space-y-3">
              <Summary data={data} />
              {data.persisted_events.length > 0 && <EventLog events={data.persisted_events} />}
              {data.live_buffer && data.live_buffer.length !== data.persisted_events.length && (
                <div className="text-[var(--color-warning)]">
                  Live buffer has {data.live_buffer.length} events; persisted has {data.persisted_events.length}.
                  Difference may indicate the events.ndjson writer is behind.
                </div>
              )}
              {data.validation_errors.length > 0 && <ValidationErrors errors={data.validation_errors} />}
              {data.transcript && <TranscriptPreview text={data.transcript} />}
            </div>
          ) : (
            <div className="text-[var(--color-fg-faint)]">Loading…</div>
          )}
        </div>
      )}
    </div>
  );
}

function Summary({ data }: { data: DebugData }) {
  const elapsed = data.duration_ms ?? (data.ended_at
    ? new Date(data.ended_at).getTime() - new Date(data.started_at).getTime()
    : Date.now() - new Date(data.started_at).getTime());
  return (
    <div className="grid grid-cols-2 gap-2 font-mono text-[10px] sm:grid-cols-4">
      <Stat label="status" value={data.status} />
      <Stat label="tier" value={String(data.tier)} />
      <Stat label="model" value={data.model} />
      <Stat label="session" value={data.session_id ? data.session_id.slice(0, 12) + "…" : "—"} />
      <Stat label="elapsed" value={`${(elapsed / 1000).toFixed(1)}s`} />
      <Stat label="turns" value={String(data.num_turns ?? 0)} />
      <Stat label="cost" value={data.cost_usd != null ? `$${data.cost_usd.toFixed(4)}` : "—"} />
      <Stat label="versions" value={data.versions.map((v) => `v${v.v}${v.validated ? "✓" : "✗"}`).join(",")} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[var(--color-border)] px-2 py-1">
      <div className="text-[var(--color-fg-faint)]">{label}</div>
      <div className="truncate text-[var(--color-fg)]">{value}</div>
    </div>
  );
}

function EventLog({ events }: { events: DebugData["persisted_events"] }) {
  return (
    <details className="rounded border border-[var(--color-border)]">
      <summary className="cursor-pointer px-2 py-1 text-[var(--color-fg-muted)]">
        events.ndjson — {events.length} entries
      </summary>
      <div className="scrollbar-thin max-h-72 overflow-auto p-2 font-mono text-[10px]">
        {events.map((e, i) => (
          <div key={i} className="flex gap-2 py-0.5">
            <span className="w-12 shrink-0 text-[var(--color-fg-faint)]">+{e.elapsed_ms}ms</span>
            <span
              className="w-16 shrink-0 font-medium"
              style={{ color: KIND_TONE[e.event.kind] ?? "var(--color-fg)" }}
            >
              {e.event.kind}
            </span>
            <span className={clsx("flex-1 truncate text-[var(--color-fg)]")}>
              {summarize(e.event)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}

function summarize(ev: { kind: string; [k: string]: unknown }): string {
  if (ev.kind === "text") return `text(${(ev.text as string)?.length ?? 0}): ${String(ev.text).slice(0, 100)}`;
  if (ev.kind === "tool_use") return `tool=${ev.tool} input=${JSON.stringify(ev.input).slice(0, 60)}`;
  if (ev.kind === "result") return `success=${ev.success} cost=$${Number(ev.costUsd).toFixed(4)} turns=${ev.numTurns} ${ev.durationMs}ms`;
  if (ev.kind === "init") return `sessionId=${ev.sessionId}`;
  if (ev.kind === "error") return `message=${ev.message}`;
  if (ev.kind === "raw") return JSON.stringify(ev.value).slice(0, 120);
  return JSON.stringify(ev).slice(0, 120);
}

function ValidationErrors({ errors }: { errors: unknown[] }) {
  return (
    <details className="rounded border border-[var(--color-warning)]">
      <summary className="cursor-pointer px-2 py-1 text-[var(--color-warning)]">
        validation errors — {errors.length}
      </summary>
      <pre className="scrollbar-thin max-h-72 overflow-auto p-2 font-mono text-[10px]">
        {JSON.stringify(errors, null, 2)}
      </pre>
    </details>
  );
}

function TranscriptPreview({ text }: { text: string }) {
  return (
    <details className="rounded border border-[var(--color-border)]">
      <summary className="cursor-pointer px-2 py-1 text-[var(--color-fg-muted)]">
        transcript.md — {text.length} chars
      </summary>
      <pre className="scrollbar-thin max-h-96 overflow-auto whitespace-pre-wrap p-2 font-mono text-[10px]">
        {text}
      </pre>
    </details>
  );
}
