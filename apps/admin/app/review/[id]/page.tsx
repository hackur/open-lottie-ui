import path from "node:path";
import fs from "node:fs/promises";
import { notFound } from "next/navigation";
import Link from "next/link";
import { data } from "@open-lottie/lottie-tools";
import { ReviewClient } from "@/components/review-client";
import { diagnoseTranscript } from "@/lib/diagnose-transcript";

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

  // For failed generations, surface the diagnoseTranscript() classification
  // so reviewers immediately see why the run didn't yield a Lottie tag
  // ("rate_limited", "tool_narration", "empty", "no_tag"). We prefer the
  // last `failed` decision row (written at the time of failure with the
  // canonical kind/reason/detail), and fall back to re-classifying the
  // transcript for older entries whose decisions predate the classifier.
  let failureDiag: { kind: string; reason: string; detail?: string } | null = null;
  if (
    gen.meta.status === "failed-validation" ||
    gen.meta.status === "failed-render"
  ) {
    try {
      const recent = await data.tailDecisions(2000);
      for (let i = recent.length - 1; i >= 0; i--) {
        const d = recent[i];
        if (d.gen !== decoded || d.action !== "failed") continue;
        const kind = typeof d.kind === "string" ? d.kind : null;
        const reason = typeof d.reason === "string" ? d.reason : null;
        const detail = typeof d.detail === "string" ? d.detail : undefined;
        if (kind && reason) {
          // Decision row written by the current classifier — trust it.
          failureDiag = { kind, reason, detail };
        }
        // Older decision rows predate the classifier and only carry the
        // generic "No <lottie-json> tag found" reason. Leave failureDiag
        // null so the transcript-based fallback below can produce a better
        // classification (rate_limited vs tool_narration vs no_tag).
        break;
      }
    } catch {
      /* decisions log unreadable — fall through to transcript fallback */
    }
    if (!failureDiag && transcript) {
      failureDiag = diagnoseTranscript(transcript);
    }
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
        failureDiag={failureDiag}
      />
    </div>
  );
}
