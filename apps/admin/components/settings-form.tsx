"use client";

import { useEffect, useRef, useState } from "react";

export type AppSettings = {
  default_model: string;
  default_tier: 1 | 3;
  default_renderer: "lottie-web" | "dotlottie-web";
  default_export_format: "json" | "lottie";
  max_repair_attempts: number;
  concurrent_generations: number;
  theme: "system" | "dark" | "light";
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 300;
const SAVED_FLASH_MS = 1500;

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const [settings, setSettings] = useState<AppSettings>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounce timer + a "skip first effect" guard so we don't save the initial.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist(settings);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  async function persist(next: AppSettings) {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
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
    }
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      <Field label="Model">
        <select
          value={settings.default_model}
          onChange={(e) => update("default_model", e.target.value)}
          className="text-sm"
        >
          <option value="claude-opus-4-7">Opus 4.7 (best)</option>
          <option value="claude-sonnet-4-6">Sonnet 4.6 (fast)</option>
          <option value="claude-haiku-4-5-20251001">Haiku 4.5 (cheapest)</option>
        </select>
      </Field>

      <Field label="Tier">
        <select
          value={String(settings.default_tier)}
          onChange={(e) => update("default_tier", Number(e.target.value) as 1 | 3)}
          className="text-sm"
        >
          <option value="1">1 — Template (deterministic)</option>
          <option value="3">3 — Prompt (Claude CLI)</option>
        </select>
      </Field>

      <Field label="Renderer">
        <select
          value={settings.default_renderer}
          onChange={(e) =>
            update("default_renderer", e.target.value as AppSettings["default_renderer"])
          }
          className="text-sm"
        >
          <option value="lottie-web">lottie-web</option>
          <option value="dotlottie-web">dotlottie-web</option>
        </select>
      </Field>

      <Field label="Export format">
        <select
          value={settings.default_export_format}
          onChange={(e) =>
            update(
              "default_export_format",
              e.target.value as AppSettings["default_export_format"],
            )
          }
          className="text-sm"
        >
          <option value="lottie">.lottie</option>
          <option value="json">.json</option>
        </select>
      </Field>

      <Field label="Max repair attempts">
        <input
          type="number"
          min={0}
          max={5}
          step={1}
          value={settings.max_repair_attempts}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 0 && n <= 5) update("max_repair_attempts", n);
          }}
          className="w-20 text-sm"
        />
      </Field>

      <Field label="Concurrent generations">
        <input
          type="number"
          min={1}
          max={10}
          step={1}
          value={settings.concurrent_generations}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= 10) update("concurrent_generations", n);
          }}
          className="w-20 text-sm"
        />
      </Field>

      <Field label="Theme">
        <select
          value={settings.theme}
          onChange={(e) => update("theme", e.target.value as AppSettings["theme"])}
          className="text-sm"
        >
          <option value="system">System</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </Field>

      <div className="mt-2 flex h-5 items-center justify-end text-xs">
        {saveState === "saving" && (
          <span className="text-[var(--color-fg-muted)]">Saving…</span>
        )}
        {saveState === "saved" && (
          <span className="text-[var(--color-success)]">✓ Saved</span>
        )}
        {saveState === "error" && (
          <span className="text-[var(--color-danger)]">✗ {errorMsg ?? "Save failed"}</span>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
