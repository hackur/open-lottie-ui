"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";

import { ImportSvg } from "@/components/import-svg";
import { ImportUrl } from "@/components/import-url";
import { ImportUrlPaste } from "@/components/import-url-paste";
import { ImportVideo } from "@/components/import-video";

type Tab = "svg-file" | "svg-paste" | "url-paste" | "url-scan" | "video";

type TabDef = {
  id: Tab;
  label: string;
  sub: string;
  /** Which feature flag this tab requires. */
  requires: "svg" | "url" | "video";
};

const ALL_TABS: ReadonlyArray<TabDef> = [
  { id: "svg-file", label: "SVG file", sub: "Drop or pick an .svg", requires: "svg" },
  { id: "svg-paste", label: "Paste SVG", sub: "Paste raw markup", requires: "svg" },
  { id: "url-paste", label: "From URL", sub: "Paste a Lottie URL", requires: "url" },
  { id: "url-scan", label: "Page scan", sub: "Crawl a webpage", requires: "url" },
  { id: "video", label: "From video / GIF", sub: "ffmpeg → embedded frames", requires: "video" },
];

type Props = {
  enableSvg: boolean;
  enableUrl: boolean;
  enableVideo: boolean;
};

/**
 * Import surface — tabbed picker over flag-gated flows. The parent server
 * component decides which categories are on; this filters the tab list and
 * picks an initial tab from whatever's available.
 */
export function ImportForm({ enableSvg, enableUrl, enableVideo }: Props) {
  const visibleTabs = useMemo(
    () =>
      ALL_TABS.filter((t) => {
        if (t.requires === "svg") return enableSvg;
        if (t.requires === "url") return enableUrl;
        if (t.requires === "video") return enableVideo;
        return false;
      }),
    [enableSvg, enableUrl, enableVideo],
  );

  const [tab, setTab] = useState<Tab>(() => visibleTabs[0]?.id ?? "svg-file");

  // If the active tab gets hidden by a flag flip, fall back to the first
  // visible one so we never render a body with no matching tab.
  const activeTab = visibleTabs.some((t) => t.id === tab)
    ? tab
    : visibleTabs[0]?.id;

  if (!activeTab) return null;

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Import source" className="flex gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 rounded-md px-3 py-2 text-left transition-colors",
              activeTab === t.id
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

      {(activeTab === "svg-file" || activeTab === "svg-paste") && <ImportSvg />}
      {activeTab === "url-paste" && <ImportUrlPaste />}
      {activeTab === "url-scan" && <ImportUrl />}
      {activeTab === "video" && <ImportVideo />}
    </div>
  );
}
