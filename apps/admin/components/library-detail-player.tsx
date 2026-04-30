"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { LottiePlayer } from "@/components/lottie-player";

type Renderer = "lottie-web" | "dotlottie-web";

export function LibraryDetailPlayer({ animation }: { animation: unknown }) {
  const [renderer, setRenderer] = useState<Renderer>("lottie-web");

  return (
    <div>
      <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-1 text-xs">
        {(["lottie-web", "dotlottie-web"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRenderer(r)}
            className={clsx(
              "rounded px-3 py-1 transition-colors",
              renderer === r
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <LottiePlayer animationData={animation} renderer={renderer} controls />
    </div>
  );
}
