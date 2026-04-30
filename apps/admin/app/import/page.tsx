import { ImportForm } from "@/components/import-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Import</h1>
      <p className="mb-6 text-sm text-[var(--color-fg-muted)]">
        Convert an SVG into a Lottie via the python-lottie plugin (deterministic, no LLM).
        The import is saved as a Tier-1 generation pending your review.
      </p>
      <ImportForm />
    </div>
  );
}
