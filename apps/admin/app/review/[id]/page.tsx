import path from "node:path";
import fs from "node:fs/promises";
import { notFound } from "next/navigation";
import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";
import { ReviewClient } from "@/components/review-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);

  let gen;
  try {
    gen = await data.getGeneration(decoded);
  } catch {
    notFound();
  }

  let animation: unknown = null;
  try {
    animation = await data.getGenerationFinalAnimation(decoded);
  } catch {
    /* may not exist yet for in-flight generations */
  }

  let baseAnimation: unknown = null;
  if (gen.meta.base_id) {
    try {
      baseAnimation = await data.getLibraryAnimation(gen.meta.base_id);
    } catch {
      /* base may have been deleted */
    }
  }

  let transcript: string | null = null;
  try {
    transcript = await fs.readFile(path.join(gen.dir, "transcript.md"), "utf8");
  } catch {
    /* tier 1 has no transcript */
  }

  return (
    <div>
      <div className="mb-4 text-sm text-[var(--color-fg-muted)]">
        <Link href="/review" className="hover:text-[var(--color-fg)]">← Review queue</Link>
      </div>
      <ReviewClient
        meta={gen.meta}
        animation={animation}
        baseAnimation={baseAnimation}
        transcript={transcript}
      />
    </div>
  );
}
