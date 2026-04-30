import Link from "next/link";
import { ImportForm } from "@/components/import-form";
import { getFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ImportPage() {
  const flags = await getFlags();
  const enableSvg = flags.enable_python_lottie;
  const enableUrl = flags.enable_url_scrape;
  const enableVideo = flags.enable_ffmpeg;
  const anyEnabled = enableSvg || enableUrl || enableVideo;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Import</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Add Lottie assets to your library. Convert an SVG via the python-lottie
        plugin, paste raw markup, or scrape a public webpage for embedded
        Lottie references.
      </p>
      {anyEnabled ? (
        <ImportForm
          enableSvg={enableSvg}
          enableUrl={enableUrl}
          enableVideo={enableVideo}
        />
      ) : (
        <ImportEmptyState />
      )}
    </div>
  );
}

function ImportEmptyState() {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-8 text-center">
      <div className="mb-2 text-sm font-medium">
        All import sources disabled.
      </div>
      <p className="text-xs text-[var(--color-fg-muted)]">
        Enable one in{" "}
        <Link
          href="/settings"
          className="text-[var(--color-accent)] underline hover:opacity-80"
        >
          Settings → Features
        </Link>
        .
      </p>
    </div>
  );
}
