import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import { data, validator } from "@open-lottie/lottie-tools";
import { processRegistry, startRegistered } from "@open-lottie/claude-driver";

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
  const startedAt = Date.now();
  const dir = (await data.getGeneration(genId)).dir;
  const eventsPath = path.join(dir, "events.ndjson");

  const log = (msg: string, extra?: unknown) => {
    const line = extra !== undefined
      ? `[gen ${genId} +${Date.now() - startedAt}ms] ${msg} ${JSON.stringify(extra)}`
      : `[gen ${genId} +${Date.now() - startedAt}ms] ${msg}`;
    console.log(line);
  };

  const recordEvent = async (ev: unknown) => {
    try {
      await fs.appendFile(
        eventsPath,
        JSON.stringify({ ts: new Date().toISOString(), elapsed_ms: Date.now() - startedAt, event: ev }) + "\n",
        "utf8",
      );
    } catch {
      /* best-effort logging; don't crash the generation if disk write fails */
    }
  };

  log("startTier3Generation", { model, promptPreview: prompt.slice(0, 80) });

  const handle = startRegistered(genId, { prompt, model });

  const allText: string[] = [];
  let finalText = "";
  let costUsd = 0;
  let numTurns = 0;
  let durationMs = 0;
  let success = false;
  let toolUseCount = 0;
  let textChunks = 0;

  try {
    for await (const ev of handle.events) {
      void recordEvent(ev);
      if (ev.kind === "init") {
        void data.updateGenerationMeta(genId, { session_id: ev.sessionId });
        log("init", { sessionId: ev.sessionId });
      }
      if (ev.kind === "text") {
        allText.push(ev.text);
        textChunks++;
      }
      if (ev.kind === "tool_use") {
        toolUseCount++;
        log("tool_use", { tool: ev.tool });
      }
      if (ev.kind === "error") {
        log("driver-error", { message: ev.message });
      }
      if (ev.kind === "result") {
        finalText = ev.text;
        costUsd = ev.costUsd;
        numTurns = ev.numTurns;
        durationMs = ev.durationMs;
        success = ev.success;
        log("result", { success, cost: costUsd, turns: numTurns, durationMs, textLength: ev.text.length });
      }
    }
  } catch (e) {
    log("event-loop-crashed", { error: e instanceof Error ? e.message : String(e) });
    await data.setGenerationStatus(genId, "failed-validation");
    await data.appendDecision({
      gen: genId,
      action: "failed",
      reason: e instanceof Error ? e.message : String(e),
    });
    return;
  }
  log("event-loop-finished", { textChunks, toolUseCount, finalTextLength: finalText.length });

  const fullText = finalText || allText.join("");
  await fs.writeFile(path.join(dir, "transcript.md"), fullText, "utf8");
  const json = extractLottieJson(fullText);
  if (!json) {
    log("no-lottie-tag", { transcriptLength: fullText.length, sampleStart: fullText.slice(0, 200), sampleEnd: fullText.slice(-200) });
    await data.updateGenerationMeta(genId, {
      cost_usd: costUsd,
      num_turns: numTurns,
      duration_ms: durationMs,
    });
    await data.setGenerationStatus(genId, "failed-validation");
    await data.appendDecision({ gen: genId, action: "failed", reason: "No <lottie-json> tag found" });
    return;
  }

  const v1 = validator.validate(json);
  await data.writeGenerationVersion(genId, 1, json);
  log("v1-validated", { valid: v1.valid, errorCount: v1.errors.length });

  const versions: { v: number; validated: boolean; errors_count: number }[] = [
    { v: 1, validated: v1.valid, errors_count: v1.errors.length },
  ];
  let finalJson = json;
  let finalValidation = v1;
  let finalVersion = 1;

  // Repair attempt: if v1 failed and we have errors, ask Claude to fix them.
  // M1 caps at 1 repair attempt; controlled by MAX_REPAIRS.
  const MAX_REPAIRS = 1;
  let totalCost = costUsd;
  let totalTurns = numTurns;
  let totalDuration = durationMs;
  let repairAttempt = 0;
  while (!finalValidation.valid && repairAttempt < MAX_REPAIRS) {
    repairAttempt++;
    const repairPrompt = buildRepairPrompt(prompt, finalJson, finalValidation.errors);
    await data.appendDecision({
      gen: genId,
      action: "repair_started",
      attempt: repairAttempt,
      errors: finalValidation.errors.length,
    });
    const repaired = await runRepair(genId, repairPrompt, model);
    if (repaired.json) {
      const v = validator.validate(repaired.json);
      finalVersion = repairAttempt + 1;
      await data.writeGenerationVersion(genId, finalVersion, repaired.json);
      versions.push({ v: finalVersion, validated: v.valid, errors_count: v.errors.length });
      finalJson = repaired.json;
      finalValidation = v;
    }
    totalCost += repaired.costUsd;
    totalTurns += repaired.numTurns;
    totalDuration += repaired.durationMs;
    if (repaired.transcript) {
      await fs.appendFile(
        path.join(dir, "transcript.md"),
        `\n\n---\n\n# Repair v${finalVersion}\n\n${repaired.transcript}`,
        "utf8",
      );
    }
  }

  await fs.copyFile(path.join(dir, `v${finalVersion}.json`), path.join(dir, "final.json"));

  await data.updateGenerationMeta(genId, {
    final_version: finalVersion,
    versions,
    validation: { ok: finalValidation.valid, errors: finalValidation.errors as unknown[] },
    cost_usd: totalCost,
    num_turns: totalTurns,
    duration_ms: totalDuration,
  });
  await data.setGenerationStatus(genId, "pending-review");
  await data.appendDecision({ gen: genId, action: "created", model, cost_usd: totalCost });
  await data.appendDecision({
    gen: genId,
    action: "validated",
    ok: finalValidation.valid,
    errors: finalValidation.errors.length,
    version: finalVersion,
  });
  log("done", { finalVersion, valid: finalValidation.valid, totalCost, totalDuration });
  void success;
}

function buildRepairPrompt(originalPrompt: string, lastJson: unknown, errors: unknown[]): string {
  return [
    "Your previous response did not validate. Apply ONLY the listed fixes and re-emit the corrected Lottie JSON inside <lottie-json>...</lottie-json>.",
    "",
    "Original request:",
    `> ${originalPrompt.split("\n").join("\n> ")}`,
    "",
    "Last attempt:",
    "<lottie-json>",
    JSON.stringify(lastJson),
    "</lottie-json>",
    "",
    "Validator errors:",
    "<validator-errors>",
    JSON.stringify(errors, null, 2),
    "</validator-errors>",
  ].join("\n");
}

async function runRepair(
  genId: string,
  prompt: string,
  model: string,
): Promise<{ json: unknown | null; transcript: string; costUsd: number; numTurns: number; durationMs: number }> {
  const repairId = `${genId}_repair`;
  const handle = startRegistered(repairId, { prompt, model });
  const allText: string[] = [];
  let finalText = "";
  let costUsd = 0;
  let numTurns = 0;
  let durationMs = 0;
  try {
    for await (const ev of handle.events) {
      if (ev.kind === "text") allText.push(ev.text);
      if (ev.kind === "result") {
        finalText = ev.text;
        costUsd = ev.costUsd;
        numTurns = ev.numTurns;
        durationMs = ev.durationMs;
      }
    }
  } catch {
    // Repair failed entirely; caller treats as no-op.
  }
  const fullText = finalText || allText.join("");
  return {
    json: extractLottieJson(fullText),
    transcript: fullText,
    costUsd,
    numTurns,
    durationMs,
  };
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
