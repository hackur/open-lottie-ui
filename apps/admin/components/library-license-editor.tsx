"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LicenseBadge } from "@/components/license-badge";

export type LicenseOption = {
  id: string;
  name: string;
  attribution_required: boolean | null;
  url: string | null;
};

type Props = {
  id: string;
  initial: {
    license_id: string;
    attribution_required: boolean;
    attribution_text: string | null;
  };
  options: LicenseOption[];
  /** True if the entry's `source === "seed"` — we still allow edits, but warn. */
  isSeed: boolean;
};

/**
 * Inline editor for `meta.license_id` + attribution fields.
 *
 * - Read mode: badge + a small "edit" affordance.
 * - Write mode: a `<select>` of license options + (when attribution is
 *   required) an attribution-text input. Save PATCHes the meta.
 *
 * Picking a license whose registry entry has `attribution_required === true`
 * auto-flips `attribution_required` on the meta so the user gets a single
 * coherent state. They can still toggle it off explicitly via the checkbox.
 */
export function LibraryLicenseEditor({ id, initial, options, isSeed }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [licenseId, setLicenseId] = useState(initial.license_id);
  const [attributionRequired, setAttributionRequired] = useState(
    initial.attribution_required,
  );
  const [attributionText, setAttributionText] = useState(
    initial.attribution_text ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whenever the chosen license changes, prefill `attribution_required` from
  // the registry. We only auto-set when the user hasn't manually fiddled
  // since opening the editor — which is approximated by "user just changed
  // license, so blow away their previous attribution toggle." Simpler than
  // tracking a dirty flag and matches user intent in practice.
  useEffect(() => {
    if (!editing) return;
    const opt = options.find((o) => o.id === licenseId);
    if (opt && opt.attribution_required !== null) {
      setAttributionRequired(opt.attribution_required);
    }
    // We deliberately don't depend on `editing` going false → no reset.
  }, [licenseId, editing, options]);

  function reset() {
    setLicenseId(initial.license_id);
    setAttributionRequired(initial.attribution_required);
    setAttributionText(initial.attribution_text ?? "");
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const opt = options.find((o) => o.id === licenseId);
      const res = await fetch(`/api/library/${encodeURIComponent(id)}/meta`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          license_id: licenseId,
          license_url: opt?.url ?? null,
          attribution_required: attributionRequired,
          attribution_text: attributionRequired
            ? attributionText.trim() || null
            : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `Save failed (${res.status})`);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <LicenseBadge id={initial.license_id} />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[10px] text-[var(--color-fg-faint)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline"
        >
          edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-2">
      <select
        value={licenseId}
        onChange={(e) => setLicenseId(e.target.value)}
        disabled={busy}
        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.id} — {o.name}
          </option>
        ))}
      </select>

      {isSeed && licenseId !== "CC0-1.0" && (
        <div className="text-[10px] text-[var(--color-warning)]">
          Seed entries are typically CC0-1.0. You can change this anyway.
        </div>
      )}

      <label className="flex items-center gap-2 text-[10px] text-[var(--color-fg-muted)]">
        <input
          type="checkbox"
          checked={attributionRequired}
          onChange={(e) => setAttributionRequired(e.target.checked)}
          disabled={busy}
        />
        Attribution required
      </label>

      {attributionRequired && (
        <input
          type="text"
          value={attributionText}
          onChange={(e) => setAttributionText(e.target.value)}
          disabled={busy}
          placeholder="© Name (https://...)"
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
        />
      )}

      {error && (
        <div className="text-[10px] text-[var(--color-danger)]">{error}</div>
      )}

      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            reset();
            setEditing(false);
          }}
          disabled={busy}
          className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:border-[var(--color-fg-muted)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded border border-[var(--color-accent)] bg-[var(--color-accent)] px-2 py-0.5 text-[10px] text-[var(--color-accent-fg)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
