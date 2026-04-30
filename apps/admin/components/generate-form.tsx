"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

type Starter = {
  id: string;
  label: string;
  prompt: string;
  tier_hint?: number;
  template_hint?: string | null;
  tags?: string[];
};

type TemplateMeta = {
  id: string;
  description: string;
  schema: Record<string, unknown>;
};

type Props = {
  starters: Starter[];
  templates: TemplateMeta[];
  initialPrompt: string;
  initialTemplateId: string | null;
  initialParams?: Record<string, unknown> | null;
  initialTier?: 1 | 3;
  remixBase: string | null;
};

export function GenerateForm({
  starters,
  templates,
  initialPrompt,
  initialTemplateId,
  initialParams,
  initialTier,
  remixBase,
}: Props) {
  const [tier, setTier] = useState<1 | 3>(initialTier ?? (initialTemplateId ? 1 : 3));
  const [prompt, setPrompt] = useState(initialPrompt);
  const [templateId, setTemplateId] = useState<string | null>(
    initialTemplateId ?? templates[0]?.id ?? null,
  );
  const [paramsByTemplate, setParamsByTemplate] = useState<Record<string, Record<string, unknown>>>(() => {
    if (initialTemplateId && initialParams) {
      return { [initialTemplateId]: { ...initialParams } };
    }
    return {};
  });
  const [model, setModel] = useState<string>("claude-opus-4-7");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  useEffect(() => {
    if (!activeTemplate) return;
    if (paramsByTemplate[activeTemplate.id]) return;
    setParamsByTemplate((prev) => ({
      ...prev,
      [activeTemplate.id]: defaultsFromSchema(activeTemplate.schema),
    }));
  }, [activeTemplate, paramsByTemplate]);

  const params = activeTemplate ? paramsByTemplate[activeTemplate.id] ?? {} : {};

  function setParam(key: string, value: unknown) {
    if (!activeTemplate) return;
    setParamsByTemplate((prev) => ({
      ...prev,
      [activeTemplate.id]: { ...(prev[activeTemplate.id] ?? {}), [key]: value },
    }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const body =
        tier === 1
          ? { tier: 1, template_id: templateId, params, prompt_summary: prompt || templateId, base_id: remixBase }
          : { tier: 3, prompt, model, base_id: remixBase };
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: { id?: string; error?: string; details?: unknown } = {};
      try {
        json = JSON.parse(text);
      } catch {
        // Non-JSON response — usually a 404 during dev-server reload or a
        // server crash. Surface the raw body so the user can see what happened.
        throw new Error(`Server returned ${res.status} (${res.statusText || "non-JSON"}): ${text.slice(0, 200)}`);
      }
      if (!res.ok || !json.id) {
        const detail = json.details ? ` — ${JSON.stringify(json.details).slice(0, 200)}` : "";
        throw new Error((json.error ?? "Generation failed") + detail);
      }
      router.push(`/review/${encodeURIComponent(json.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {remixBase && (
        <div className="rounded-md border border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_10%,transparent)] px-4 py-2 text-sm">
          Remixing <code className="font-mono text-[var(--color-accent)]">{remixBase}</code>
        </div>
      )}

      <div className="flex gap-2">
        {([1, 3] as const).map((n) => (
          <button
            key={n}
            onClick={() => setTier(n)}
            className={clsx(
              "rounded-md border px-4 py-2 text-sm",
              tier === n
                ? "border-[var(--color-accent)] bg-[color-mix(in_oklch,var(--color-accent)_15%,transparent)] text-[var(--color-fg)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg-muted)]",
            )}
          >
            Tier {n} —{" "}
            <span className="text-xs">
              {n === 1 ? "Template (deterministic)" : "Prompt (Claude CLI)"}
            </span>
          </button>
        ))}
      </div>

      {tier === 1 && activeTemplate ? (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
              Template
            </label>
            <select value={templateId ?? ""} onChange={(e) => setTemplateId(e.target.value || null)} className="w-full">
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{activeTemplate.description}</p>
          </div>
          <ParamForm schema={activeTemplate.schema} values={params} onChange={setParam} />
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
              Title (optional)
            </label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`${activeTemplate.id} variation`}
              className="w-full"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {starters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {starters.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPrompt(s.prompt)}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1 text-xs text-[var(--color-fg-muted)] hover:border-[var(--color-accent)]"
                  title={s.prompt}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the animation you want…"
            rows={6}
            className="w-full"
          />
          <div className="flex items-center gap-3 text-xs">
            <label className="text-[var(--color-fg-muted)]">Model:</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="text-xs"
            >
              <option value="claude-opus-4-7">Opus 4.7 (best)</option>
              <option value="claude-sonnet-4-6">Sonnet 4.6 (fast)</option>
              <option value="claude-haiku-4-5-20251001">Haiku 4.5 (cheapest)</option>
            </select>
            <span className="text-[var(--color-fg-faint)]">
              Tier 3 calls Claude CLI. Output expected between{" "}
              <code className="font-mono text-[10px]">&lt;lottie-json&gt;…&lt;/lottie-json&gt;</code>.
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={submitting || (tier === 3 && !prompt.trim())}
          className="rounded-md bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-[var(--color-accent-fg)]"
        >
          {submitting ? "Generating…" : tier === 1 ? "Render template" : "Send to Claude"}
        </button>
        {error && <span className="text-sm text-[var(--color-danger)]">{error}</span>}
      </div>
    </div>
  );
}

function ParamForm({
  schema,
  values,
  onChange,
}: {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const props = (schema?.properties as Record<string, Record<string, unknown>>) ?? {};
  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(props).map(([key, def]) => {
        const type = def.type as string;
        const description = def.description as string | undefined;
        const value = values[key];
        return (
          <div key={key}>
            <label className="mb-1 block text-xs text-[var(--color-fg-muted)]">
              <span className="font-mono">{key}</span>
              {description ? <span className="ml-2 text-[var(--color-fg-faint)]">— {description}</span> : null}
            </label>
            <ParamInput type={type} def={def} value={value} onChange={(v) => onChange(key, v)} />
          </div>
        );
      })}
    </div>
  );
}

function ParamInput({
  type,
  def,
  value,
  onChange,
}: {
  type: string;
  def: Record<string, unknown>;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (def.enum && Array.isArray(def.enum)) {
    return (
      <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="w-full">
        {(def.enum as unknown[]).map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    );
  }
  if (type === "integer" || type === "number") {
    return (
      <input
        type="number"
        value={value === undefined || value === null ? "" : Number(value)}
        min={def.minimum as number | undefined}
        max={def.maximum as number | undefined}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full"
      />
    );
  }
  if (type === "array") {
    const items = (def.items as Record<string, unknown> | undefined) ?? {};
    if (items.type === "number" || items.type === "integer") {
      const arr = Array.isArray(value) ? (value as number[]) : [];
      return (
        <input
          type="text"
          value={arr.join(", ")}
          onChange={(e) => {
            const parsed = e.target.value
              .split(",")
              .map((s) => Number(s.trim()))
              .filter((n) => !Number.isNaN(n));
            onChange(parsed);
          }}
          placeholder="e.g. 0.13, 0.74, 0.91, 1"
          className="w-full font-mono text-xs"
        />
      );
    }
  }
  if (type === "boolean") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    );
  }
  return (
    <input
      type="text"
      value={value === undefined || value === null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
      className="w-full"
    />
  );
}

function defaultsFromSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const props = (schema?.properties as Record<string, Record<string, unknown>>) ?? {};
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(props)) {
    if ("default" in def) {
      out[key] = def.default;
    } else if (Array.isArray(def.enum) && def.enum.length > 0) {
      out[key] = def.enum[0];
    } else if (def.type === "integer" || def.type === "number") {
      out[key] = (def as { minimum?: number }).minimum ?? 0;
    } else if (def.type === "boolean") {
      out[key] = false;
    } else if (def.type === "array") {
      out[key] = [];
    } else {
      out[key] = "";
    }
  }
  return out;
}
