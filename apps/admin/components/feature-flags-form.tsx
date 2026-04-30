"use client";

import { useRef, useState } from "react";

export type FeatureFlagItem = {
  flag: string;
  title: string;
  description: string;
  enabled: boolean;
  /** Optional name of the host tool this flag depends on (e.g. "ffmpeg"). */
  hostTool?: string;
  /** Whether the host tool was detected. `undefined` = no tool dependency. */
  hostToolFound?: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_FLASH_MS = 1500;

/**
 * Client-side toggles for feature flags. Each toggle PUTs `/api/settings`
 * with `{ enable_<flag>: bool }` on change. Renders a "host tool: detected
 * | missing" hint next to flags that have a host-tool dependency.
 */
export function FeatureFlagsForm({ items }: { items: FeatureFlagItem[] }) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.flag, i.enabled])),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persist(flag: string, value: boolean) {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [flag]: value }),
      });
      const text = await res.text();
      let json: { error?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Server returned ${res.status} (non-JSON)`);
      }
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSaveState("saved");
      if (flashRef.current) clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setSaveState("idle"), SAVED_FLASH_MS);
    } catch (e) {
      setSaveState("error");
      setErrorMsg(e instanceof Error ? e.message : String(e));
      // Roll back optimistic flip on error.
      setState((prev) => ({ ...prev, [flag]: !value }));
    }
  }

  function onToggle(flag: string, next: boolean) {
    setState((prev) => ({ ...prev, [flag]: next }));
    void persist(flag, next);
  }

  return (
    <>
      {items.map((item) => {
        const enabled = state[item.flag] ?? false;
        const hasTool = typeof item.hostToolFound === "boolean";
        const toolDetected = item.hostToolFound === true;
        return (
          <div
            key={item.flag}
            className="border-b border-[var(--color-border)] py-2 last:border-0 last:pb-0 first:pt-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="mt-0.5 text-xs text-[var(--color-fg-muted)]">
                  {item.description}
                </div>
                {hasTool && item.hostTool && (
                  <div className="mt-1 text-[10px] font-mono text-[var(--color-fg-faint)]">
                    host tool {item.hostTool}:{" "}
                    <span
                      className={
                        toolDetected
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-fg-faint)]"
                      }
                    >
                      {toolDetected ? "detected" : "missing"}
                    </span>
                  </div>
                )}
              </div>
              <Toggle
                ariaLabel={`Toggle ${item.title}`}
                checked={enabled}
                onChange={(next) => onToggle(item.flag, next)}
              />
            </div>
          </div>
        );
      })}

      <div className="mt-2 flex h-5 items-center justify-end pt-2 text-xs">
        {saveState === "saving" && (
          <span className="text-[var(--color-fg-muted)]">Saving…</span>
        )}
        {saveState === "saved" && (
          <span className="text-[var(--color-success)]">✓ Saved</span>
        )}
        {saveState === "error" && (
          <span className="text-[var(--color-danger)]">
            ✗ {errorMsg ?? "Save failed"}
          </span>
        )}
      </div>
    </>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev-2)]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
