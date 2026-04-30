import { ImportForm } from "@/components/import-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Import</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Add Lottie assets to your library. Convert an SVG via the python-lottie
        plugin, paste raw markup, or scrape a public webpage for embedded
        Lottie references.
      </p>
      <ImportForm />
    </div>
  );
}
