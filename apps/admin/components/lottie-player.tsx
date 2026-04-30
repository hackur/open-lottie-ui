"use client";

import { useEffect, useRef, useState } from "react";

type Renderer = "lottie-web" | "dotlottie-web";

type Props = {
  animationData: unknown;
  renderer?: Renderer;
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  /** External controlled frame for syncing two players. If set, autoplay is ignored. */
  controlledFrame?: number;
  onFrame?: (frame: number, totalFrames: number) => void;
};

export function LottiePlayer({
  animationData,
  renderer = "lottie-web",
  autoplay = true,
  loop = true,
  controls = false,
  className,
  controlledFrame,
  onFrame,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<{ destroy: () => void; goToAndStop?: (f: number, isFrame?: boolean) => void; play?: () => void; pause?: () => void; setSpeed?: (s: number) => void; totalFrames?: number; addEventListener?: (ev: string, cb: (e: { currentTime?: number }) => void) => void; removeEventListener?: (ev: string, cb: (e: { currentTime?: number }) => void) => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [total, setTotal] = useState(0);
  const [playing, setPlaying] = useState(autoplay);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!hostRef.current || !animationData) return;
    const host = hostRef.current;
    host.innerHTML = "";

    (async () => {
      try {
        if (renderer === "lottie-web") {
          const lottie = (await import("lottie-web")).default;
          const anim = lottie.loadAnimation({
            container: host,
            renderer: "svg",
            loop,
            autoplay: controlledFrame === undefined ? autoplay : false,
            animationData,
          });
          if (cancelled) {
            anim.destroy();
            return;
          }
          animRef.current = anim as unknown as typeof animRef.current;
          const totalFrames = (anim as unknown as { totalFrames: number }).totalFrames;
          setTotal(Math.round(totalFrames));
          const onEnter = (e: { currentTime?: number }) => {
            const f = Math.round(e.currentTime ?? 0);
            setFrame(f);
            onFrame?.(f, Math.round(totalFrames));
          };
          (anim as unknown as { addEventListener: (ev: string, cb: (e: { currentTime?: number }) => void) => void }).addEventListener("enterFrame", onEnter);
        } else {
          const { DotLottie } = await import("@lottiefiles/dotlottie-web");
          const canvas = document.createElement("canvas");
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          host.appendChild(canvas);
          const player = new DotLottie({
            canvas,
            data: animationData as Record<string, unknown>,
            autoplay: controlledFrame === undefined ? autoplay : false,
            loop,
          });
          if (cancelled) {
            player.destroy();
            return;
          }
          animRef.current = {
            destroy: () => player.destroy(),
            goToAndStop: (f: number) => player.setFrame(f),
            play: () => player.play(),
            pause: () => player.pause(),
            totalFrames: player.totalFrames,
          };
          setTotal(Math.round(player.totalFrames || 0));
          player.addEventListener("frame", (e) => {
            setFrame(Math.round(e.currentFrame));
            onFrame?.(Math.round(e.currentFrame), Math.round(player.totalFrames || 0));
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load animation");
      }
    })();

    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationData, renderer, loop]);

  // Controlled-frame sync (for side-by-side review)
  useEffect(() => {
    if (controlledFrame === undefined) return;
    animRef.current?.goToAndStop?.(controlledFrame, true);
  }, [controlledFrame]);

  function togglePlay() {
    if (!animRef.current) return;
    if (playing) animRef.current.pause?.();
    else animRef.current.play?.();
    setPlaying(!playing);
  }

  return (
    <div className={className}>
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[var(--color-bg-elev-2)]">
        <div ref={hostRef} className="h-full w-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
      </div>
      {controls && (
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-fg-muted)]">
          <button
            onClick={togglePlay}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-[var(--color-fg)]"
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <span className="font-mono">
            {frame} / {total}
          </span>
          {total > 0 && (
            <input
              type="range"
              min={0}
              max={total}
              value={frame}
              onChange={(e) => {
                const f = Number(e.target.value);
                animRef.current?.pause?.();
                setPlaying(false);
                animRef.current?.goToAndStop?.(f, true);
                setFrame(f);
              }}
              className="flex-1"
            />
          )}
        </div>
      )}
    </div>
  );
}
