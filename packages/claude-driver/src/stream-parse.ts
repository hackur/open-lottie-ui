import type { DriverEvent } from "./types.ts";

/**
 * Parse a single ndjson line emitted by `claude --output-format stream-json`
 * into zero-or-more {@link DriverEvent}s.
 *
 * Returns an array because one assistant line can carry multiple content
 * blocks (text + tool_use + text + ...). Unrecognized lines surface as
 * `{ kind: "raw" }` so we never silently drop information.
 */
export function parseLine(line: string): DriverEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    // Non-JSON line on stdout (shouldn't happen with --output-format
    // stream-json, but be defensive — surface as raw text rather than crash).
    return [{ kind: "raw", value: trimmed }];
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    return [{ kind: "raw", value }];
  }

  switch (value.type) {
    case "system":
      return parseSystem(value);
    case "assistant":
      return parseAssistant(value);
    case "result":
      return parseResult(value);
    default:
      return [{ kind: "raw", value }];
  }
}

/**
 * Parse an entire async iterable of stdout lines into a stream of
 * {@link DriverEvent}s.
 */
export async function* parseStream(lines: AsyncIterable<string>): AsyncIterable<DriverEvent> {
  for await (const line of lines) {
    for (const ev of parseLine(line)) {
      yield ev;
    }
  }
}

function parseSystem(value: Record<string, unknown>): DriverEvent[] {
  if (value.subtype === "init" && typeof value.session_id === "string") {
    return [{ kind: "init", sessionId: value.session_id }];
  }
  return [{ kind: "raw", value }];
}

function parseAssistant(value: Record<string, unknown>): DriverEvent[] {
  const message = value.message;
  if (!isRecord(message) || !Array.isArray(message.content)) {
    return [{ kind: "raw", value }];
  }

  const out: DriverEvent[] = [];
  for (const block of message.content) {
    if (!isRecord(block)) continue;
    if (block.type === "text" && typeof block.text === "string") {
      out.push({ kind: "text", text: block.text });
    } else if (block.type === "tool_use" && typeof block.name === "string") {
      out.push({ kind: "tool_use", tool: block.name, input: block.input });
    } else {
      out.push({ kind: "raw", value: block });
    }
  }
  if (out.length === 0) return [{ kind: "raw", value }];
  return out;
}

function parseResult(value: Record<string, unknown>): DriverEvent[] {
  const success = value.subtype === "success";
  const text = typeof value.result === "string" ? value.result : "";
  const costUsd = typeof value.total_cost_usd === "number" ? value.total_cost_usd : 0;
  const numTurns = typeof value.num_turns === "number" ? value.num_turns : 0;
  const durationMs = typeof value.duration_ms === "number" ? value.duration_ms : 0;
  return [{ kind: "result", success, text, costUsd, numTurns, durationMs }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
