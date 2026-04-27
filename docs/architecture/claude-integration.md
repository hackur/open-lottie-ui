# Claude CLI integration design

This is the heart of the project. See `research/09-claude-cli.md` for CLI background and `research/10-prompting-lottie.md` for prompt strategy.

## Boundary

Claude CLI is invoked **only** through `lib/claude/driver.ts`. Nothing else in the codebase shells out to `claude`. This makes it trivial to swap in the SDK or another model later.

## Public driver API

```ts
// lib/claude/driver.ts
export type GenerateOptions = {
  prompt: string;                          // user-facing text
  systemPrompt?: string;                   // override; defaults to prompts/system/default.md
  model?: "claude-opus-4-7" | "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";
  tier?: 1 | 2 | 3;
  templateId?: string;                     // when tier === 1
  basis?: { id: string; lottieJson: unknown };  // remix mode
  rejection?: { codes: string[]; note?: string }; // repair from a previous reject
  maxRepairAttempts?: number;              // default 3
  abortSignal?: AbortSignal;
};

export type GenerateEvent =
  | { type: "system"; sessionId: string }
  | { type: "delta"; text: string }
  | { type: "tool_use"; name: string; input: unknown }   // unused in v1 (tools disabled)
  | { type: "version_attempt"; v: number; ok: boolean; errors?: string[] }
  | { type: "result"; lottieJson: unknown; cost: number; durationMs: number };

export function generate(opts: GenerateOptions): {
  id: string;
  events: AsyncIterable<GenerateEvent>;
  cancel(): void;
};
```

The `events` iterable is consumed by the Server Action which forwards to SSE.

## CLI invocation

```ts
const args = [
  "-p", userPrompt,
  "--system-prompt", systemPrompt,
  "--output-format", "stream-json",
  "--verbose",
  "--model", model,
  "--permission-mode", "bypassPermissions",
  "--disallowed-tools", "Bash,Edit,Write,WebFetch,WebSearch",
  "--cwd", sandboxDir(id),
];

const child = spawn("claude", args, {
  cwd: sandboxDir(id),
  env: { ...process.env, NO_COLOR: "1" },
});
```

Notes:

- `--disallowed-tools` is the safety net: the model can think but cannot touch our filesystem. **All "outputs" are extracted from the assistant's text.**
- `bypassPermissions` is fine because we've already restricted tools.
- `NO_COLOR=1` keeps the stream-json clean.

## Output extraction

The model is instructed (via system prompt) to wrap its final answer in a tagged block:

```
<lottie-json>
{ "v":"5.12", ... }
</lottie-json>
```

The driver scans the assistant text for the block, parses JSON inside, and emits a `version_attempt` event with the parse result + validation. If the JSON is malformed or fails schema, the driver triggers a repair attempt up to `maxRepairAttempts`.

For Tier 2 (Python script), the model wraps in:

```
<bodymovin-python-script>
import sys; from bodymovin import ...
print(...)
</bodymovin-python-script>
```

The driver runs the script in a sandboxed Python venv, captures stdout, parses as JSON.

For Tier 1 (template), the model returns:

```
<template-params>
{ "color_a": [...], "duration_frames": 60 }
</template-params>
```

We substitute into the template, no JSON model-emission required.

## Repair loop

```text
attempt 1: original prompt → response → parse → validate
  if ok: done
  else:
    attempt 2: original + previous response + validator errors
    → "Fix the listed errors. Return only the corrected JSON."
    if ok: done
    else attempt 3: as above with both prior errors
    if still bad: emit final result with status=failed-validation
```

Repairs use the **same** Claude session (`--resume <session_id>`) when possible — preserves context and is cheaper than starting fresh.

## System prompt

`prompts/system/default.md` (illustrative outline):

```markdown
You generate Bodymovin / Lottie animations for a local admin tool.

## Output protocol
- Wrap your final Lottie JSON in <lottie-json>…</lottie-json> tags. Nothing else inside the tags. No markdown fences.
- Do not include commentary outside the tags.
- If you cannot meet the request, return <lottie-json>{}</lottie-json> and explain in a short tag <error>…</error>.

## Schema (compressed)
- Root: { v, fr, ip, op, w, h, nm, assets: [], layers: [] }
- Layer types: 0 precomp, 1 solid, 2 image, 3 null, 4 shape
- Common layer fields: nm, ind, parent, ip, op, hd, ks (transform), ao
- Transform (ks): a (anchor), p (position), s (scale 0–100), r (rotation deg), o (opacity 0–100), sk, sa
- Animatable property: { a: 0|1, k: scalar | [keyframes] }, keyframe: { t, s, i, o, h }
- Shape items (inside ty:4): gr group, rc rect, el ellipse, sh path, fl fill, st stroke, tr transform, tm trim
- Use trim path (tm) for draw-on effects. Use rp (repeater) for radial copies.

## Conventions
- Default fr=30 unless asked.
- Use 0–1 normalized colors in fills/strokes (the c.k value).
- Keep layer count minimal.
- Name layers and shapes with human-readable nm.

## Few-shot
<see prompts/few-shot/*.json injected here>
```

## Cost & usage

The `result` ndjson line includes `total_cost_usd` and `num_turns`. The driver:

- Appends a `decisions.jsonl` entry: `{ts, gen, action: "created", model, cost_usd}`.
- Returns the final cost in the `result` event.

UI shows running totals on `/dashboard`.

## Cancellation

`opts.abortSignal` wired to `child.kill("SIGTERM")`. The CLI handles its own cleanup.

## Why this isn't using the Anthropic SDK

- The CLI uses the user's existing Claude Code OAuth — no API key to manage in `.env`.
- Stream-json gives us all the events the SDK does, in a process-agnostic way.
- We can swap the underlying implementation behind `generate()` without touching callers — including swapping in the SDK in v2 for headless / API-key deployment.

## Sources

- Internal: `research/09-claude-cli.md`, `research/10-prompting-lottie.md`, `research/12-process-management.md`.
- External: [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference).
