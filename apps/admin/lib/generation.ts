import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { data, validator } from "@open-lottie/lottie-tools";
import { generate, processRegistry, startRegistered, type DriverEvent } from "@open-lottie/claude-driver";

/**
 * Spawns the Claude CLI driver for a Tier-3 generation, streams events,
 * extracts the final Lottie JSON, validates, and updates the generation
 * meta + status. SSE consumers read replay events via the registry.
 */
export async function startTier3Generation(
  genId: string,
  prompt: string,
  model: string,
): Promise<void> {
  const handle = startRegistered(genId, { prompt, model: model as never });

  const allText: string[] = [];
  let finalText = "";
  let costUsd = 0;
  let numTurns = 0;
  let durationMs = 0;
  let success = false;

  try {
    for await (const ev of handle.events) {
      if (ev.kind === "init") {
        // Persist the session id so the audit trail captures which Claude
        // session produced this generation. Fire-and-forget — the meta will
        // be re-written on the result event with the real numbers.
        void data.updateGenerationMeta(genId, { session_id: ev.sessionId });
      }
      if (ev.kind === "text") allText.push(ev.text);
      if (ev.kind === "result") {
        finalText = ev.text;
        costUsd = ev.costUsd;
        numTurns = ev.numTurns;
        durationMs = ev.durationMs;
        success = ev.success;
      }
    }
  } catch (e) {
    await data.setGenerationStatus(genId, "failed-validation");
    await data.appendDecision({
      gen: genId,
      action: "failed",
      reason: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const fullText = finalText || allText.join("");
  const json = extractLottieJson(fullText);
  if (!json) {
    await data.updateGenerationMeta(genId, {
      cost_usd: costUsd,
      num_turns: numTurns,
      duration_ms: durationMs,
    });
    await data.setGenerationStatus(genId, "failed-validation");
    await data.appendDecision({ gen: genId, action: "failed", reason: "No <lottie-json> tag found" });
    // Stash the raw transcript for debugging
    const dir = path.join((await data.getGeneration(genId)).dir);
    await fs.writeFile(path.join(dir, "transcript.md"), fullText, "utf8");
    return;
  }

  const v = validator.validate(json);
  await data.writeGenerationVersion(genId, 1, json);
  const dir = path.join((await data.getGeneration(genId)).dir);
  await fs.copyFile(path.join(dir, "v1.json"), path.join(dir, "final.json"));
  await fs.writeFile(path.join(dir, "transcript.md"), fullText, "utf8");

  await data.updateGenerationMeta(genId, {
    final_version: 1,
    versions: [{ v: 1, validated: v.valid, errors_count: v.errors.length }],
    validation: { ok: v.valid, errors: v.errors as unknown[] },
    cost_usd: costUsd,
    num_turns: numTurns,
    duration_ms: durationMs,
  });
  await data.setGenerationStatus(genId, "pending-review");
  await data.appendDecision({ gen: genId, action: "created", model, cost_usd: costUsd });
  await data.appendDecision({
    gen: genId,
    action: "validated",
    ok: v.valid,
    errors: v.errors.length,
  });
  void success;
}

function extractLottieJson(text: string): unknown | null {
  // Try fenced tag first
  const tagMatch = /<lottie-json>([\s\S]*?)<\/lottie-json>/i.exec(text);
  const candidate = tagMatch ? tagMatch[1] : findJsonBlock(text);
  if (!candidate) return null;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    return null;
  }
}

function findJsonBlock(text: string): string | null {
  // Look for ```json ... ``` first
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenceMatch) return fenceMatch[1];
  // Fall back to first { ... last } heuristic — only if it parses
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  return text.slice(firstBrace, lastBrace + 1);
}

export { processRegistry };
