"use client";

import { useEffect, useRef, useState } from "react";
import { LottiePlayer } from "@/components/lottie-player";

type ValidationError = {
  instancePath?: string;
  schemaPath?: string;
  keyword?: string;
  message?: string;
  params?: Record<string, unknown>;
};

type RenderResponse =
  | { ok: true; lottie: Record<string, unknown> }
  | { ok: false; error?: string; errors?: ValidationError[] };

type Props = {
  templateId: string | null;
  params: Record<string, unknown>;
};

export function GeneratePreview({ templateId, params }: Props) {
  const [lottie, setLottie] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  // Serialize the inputs so the debounced effect only refires on real changes.
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!templateId) {
      setLottie(null);
      setErrors(null);
      setErrorText(null);
      setLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/templates/${encodeURIComponent(templateId)}/render`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ params }),
          },
        );
        const text = await res.text();
        let json: RenderResponse;
        try {
          json = JSON.parse(text) as RenderResponse;
        } catch {
          if (myReq !== reqIdRef.current) return;
          setErrors(null);
          setErrorText(`Server returned ${res.status}: ${text.slice(0, 200)}`);
          setLottie(null);
          return;
        }
        if (myReq !== reqIdRef.current) return;
        if (json.ok) {
          setLottie(json.lottie);
          setErrors(null);
          setErrorText(null);
        } else if (json.errors) {
          setErrors(json.errors);
          setErrorText(null);
          // Keep the previous successful render visible so the user has context
          // while they fix the broken field.
        } else {
          setErrors(null);
          setErrorText(json.error ?? `Request failed (${res.status})`);
        }
      } catch (e) {
        if (myReq !== reqIdRef.current) return;
        setErrors(null);
        setErrorText(e instanceof Error ? e.message : String(e));
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, paramsKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs uppercase tracking-wider text-[var(--color-fg-faint)]">
          Live preview
        </label>
        {loading && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)]">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-fg-faint)] border-t-transparent"
            />
            rendering…
          </span>
        )}
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        {lottie ? (
          <LottiePlayer animationData={lottie} controls />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-md bg-[var(--color-bg-elev-2)] text-xs text-[var(--color-fg-faint)]">
            {templateId
              ? loading
                ? "Rendering…"
                : "Adjust params to render"
              : "Pick a template to preview"}
          </div>
        )}
      </div>

      {errors && errors.length > 0 && (
        <div className="rounded-md border border-[var(--color-danger)] bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-danger)]">
          <div className="mb-1 font-medium">Validation failed</div>
          <ul className="space-y-1 font-mono">
            {errors.map((e, i) => (
              <li key={i}>
                <span>{e.instancePath || "(root)"}</span>
                {e.message ? <span> — {e.message}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorText && (
        <div className="rounded-md border border-[var(--color-danger)] bg-[color-mix(in_oklch,var(--color-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {errorText}
        </div>
      )}
    </div>
  );
}
