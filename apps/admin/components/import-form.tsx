"use client";

import { useState } from "react";
import { clsx } from "clsx";

import { ImportSvg } from "@/components/import-svg";
import { ImportUrl } from "@/components/import-url";
import { ImportUrlPaste } from "@/components/import-url-paste";

type Tab = "svg-file" | "svg-paste" | "url-paste" | "url-scan";

const TABS: ReadonlyArray<{ id: Tab; label: string; sub: string }> = [
  { id: "svg-file", label: "SVG file", sub: "Drop or pick an .svg" },
  { id: "svg-paste", label: "Paste SVG", sub: "Paste raw markup" },
  { id: "url-paste", label: "From URL", sub: "Paste a Lottie URL" },
  { id: "url-scan", label: "Page scan", sub: "Crawl a webpage" },
];

/**
 * Import surface — tabbed picker over three flows. The two SVG tabs share an
 * underlying form (one renders the file zone, the other the textarea).
 */
export function ImportForm() {
  const [tab, setTab] = useState<Tab>("svg-file");

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Import source" className="flex gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 rounded-md px-3 py-2 text-left transition-colors",
              tab === t.id
                ? "bg-[var(--color-bg-elev-2)] text-[var(--color-fg)]"
                : "text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)]",
            )}
          >
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-fg-faint)]">
              {t.sub}
            </div>
          </button>
        ))}
      </div>

      {(tab === "svg-file" || tab === "svg-paste") && <ImportSvg />}
      {tab === "url" && <ImportUrl />}
    </div>
  );
}
