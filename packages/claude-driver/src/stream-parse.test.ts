import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine } from "./stream-parse.ts";

test("parses system init", () => {
  const events = parseLine(
    JSON.stringify({ type: "system", subtype: "init", session_id: "sess-123", model: "claude-opus-4-7" }),
  );
  assert.deepEqual(events, [{ kind: "init", sessionId: "sess-123" }]);
});

test("parses assistant text block", () => {
  const events = parseLine(
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "hello" }] },
    }),
  );
  assert.deepEqual(events, [{ kind: "text", text: "hello" }]);
});

test("parses assistant with mixed content blocks", () => {
  const events = parseLine(
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "part 1" },
          { type: "tool_use", name: "Read", input: { path: "/tmp/x" } },
          { type: "text", text: "part 2" },
        ],
      },
    }),
  );
  assert.deepEqual(events, [
    { kind: "text", text: "part 1" },
    { kind: "tool_use", tool: "Read", input: { path: "/tmp/x" } },
    { kind: "text", text: "part 2" },
  ]);
});

test("parses result success", () => {
  const events = parseLine(
    JSON.stringify({
      type: "result",
      subtype: "success",
      result: "<lottie-json>{}</lottie-json>",
      total_cost_usd: 0.012,
      num_turns: 1,
      duration_ms: 4321,
    }),
  );
  assert.deepEqual(events, [
    {
      kind: "result",
      success: true,
      text: "<lottie-json>{}</lottie-json>",
      costUsd: 0.012,
      numTurns: 1,
      durationMs: 4321,
    },
  ]);
});

test("parses result error", () => {
  const events = parseLine(
    JSON.stringify({
      type: "result",
      subtype: "error",
      result: "",
      total_cost_usd: 0.001,
      num_turns: 0,
      duration_ms: 100,
    }),
  );
  assert.equal(events.length, 1);
  assert.equal(events[0]!.kind, "result");
  if (events[0]!.kind === "result") {
    assert.equal(events[0]!.success, false);
  }
});

test("unknown type falls through as raw", () => {
  const obj = { type: "user", message: { role: "user", content: [] } };
  const events = parseLine(JSON.stringify(obj));
  assert.deepEqual(events, [{ kind: "raw", value: obj }]);
});

test("non-JSON line yields raw", () => {
  const events = parseLine("not json at all");
  assert.deepEqual(events, [{ kind: "raw", value: "not json at all" }]);
});

test("empty line yields nothing", () => {
  assert.deepEqual(parseLine(""), []);
  assert.deepEqual(parseLine("   "), []);
});
