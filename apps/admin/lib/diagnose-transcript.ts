/**
 * Classify why a generation transcript didn't contain a `<lottie-json>`
 * block, so the activity log can distinguish "Claude rate-limited" from
 * "model narrated instead of emitting JSON" from "transcript empty".
 *
 * Detected today:
 *   - rate_limited   — CLI returned a usage-limit banner.
 *   - empty          — driver exited without producing text.
 *   - tool_narration — model described work it claims to have done (file
 *                      writes, etc.) instead of emitting the JSON tag. Tools
 *                      are blocked by the driver, so anything mentioning
 *                      `created`, `saved`, `wrote ...` is hallucinated.
 *   - no_tag         — generic fallback.
 *
 * No server-only imports — safe to use from tests and shared code.
 */
export type TranscriptDiagnosis = {
  kind: "rate_limited" | "empty" | "tool_narration" | "no_tag";
  reason: string;
  detail?: string;
};

export function diagnoseTranscript(text: string): TranscriptDiagnosis {
  const t = text.trim();
  if (!t) return { kind: "empty", reason: "Empty transcript (driver returned no text)" };

  const lower = t.toLowerCase();
  if (
    lower.includes("you've hit your limit") ||
    lower.includes("you have hit your limit") ||
    lower.includes("usage limit") ||
    /resets?\s+\d{1,2}(:\d{2})?\s*(am|pm)/i.test(t)
  ) {
    // Pull a short timestamp tail like "resets 11:50pm (America/Los_Angeles)".
    const reset = /(resets?\s+[^\n]{0,80})/i.exec(t)?.[1]?.trim();
    return {
      kind: "rate_limited",
      reason: "Claude usage limit reached",
      detail: reset || t.slice(0, 120),
    };
  }

  if (
    /\b(created|saved|wrote|written|generated)\b[\s\S]{0,40}\.(json|js|ts|py)/i.test(t) ||
    /`[^`]+\.json`\s+(is|has been)\s+(created|saved|written|generated)/i.test(t)
  ) {
    return {
      kind: "tool_narration",
      reason: "Model described file writes instead of emitting <lottie-json>",
      detail: t.slice(0, 160).replace(/\s+/g, " "),
    };
  }

  return {
    kind: "no_tag",
    reason: "No <lottie-json> tag found",
    detail: t.slice(-160).replace(/\s+/g, " "),
  };
}
