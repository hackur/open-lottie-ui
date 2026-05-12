# Claude CLI integration design

This is the heart of the project. See `research/09-claude-cli.md` for CLI background and `research/10-prompting-lottie.md` for prompt strategy.

## Boundary

Claude CLI is invoked **only** through `packages/claude-driver/src/generate.ts`. Nothing else in the codebase shells out to `claude`. This makes it trivial to swap in the SDK or another model later. The admin wraps the driver in `apps/admin/lib/generation.ts`, which handles repair, transcript classification, and persistence.

## Public driver API

```ts
// packages/claude-driver/src/generate.ts
export function generate(opts: GenerateOptions): GenerateHandle;

// GenerateOptions: { prompt, model?, systemPromptPath?, cwd?, signal?, silenceTimeoutMs? }
// GenerateHandle: { events: AsyncIterable<DriverEvent>, kill(opts?), sessionId: Promise<string|null>, child: ChildProcess }

// DriverEvent kinds:
//   init     — { kind: "init",    sessionId }
//   text     — { kind: "text",    text }
//   tool_use — { kind: "tool_use", tool }
//   result   — { kind: "result",  text, costUsd, numTurns, durationMs, success }
//   error    — { kind: "error",   message }
//   raw      — { kind: "raw",     line }
```

The repair loop, tier/template selection, and decisions/meta persistence live one layer up in `apps/admin/lib/generation.ts` (see `startTier3Generation`). That function:

1. Calls `startRegistered(genId, { prompt, model })` so the driver child is tracked in the registry.
2. Records every event to `generations/<id>/events.ndjson` for replay.
3. On `result`, extracts the Lottie JSON, validates, optionally re-prompts, and updates `meta.json` + appends `decisions.jsonl`.
4. On failure, calls `diagnoseTranscript()` and stores a `kind` of `rate_limited`, `tool_narration`, `empty`, or `no_tag`.

The events iterable is also consumed by the SSE route at `/api/generate/[id]/stream`.

## CLI invocation

```ts
// packages/claude-driver/src/generate.ts (excerpted)
const args = [
  "--print",
  "--output-format", "stream-json",
  "--verbose",
  "--permission-mode", "bypassPermissions",
  "--disallowed-tools", "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,TodoWrite",
  "--append-system-prompt", `@${systemPromptPath}`,
  "--model", model,
];

const child = spawn("claude", args, {
  cwd: mkdtempSync(path.join(os.tmpdir(), "claude-lottie-")),
});
child.stdin.write(userPrompt);
child.stdin.end();
```

Notes:

- `--disallowed-tools` is the safety net. It includes the file-touching tools (`Read,Glob,Grep` as well as `Bash,Edit,Write`) plus `TodoWrite` (which the model would otherwise reach for and produce non-Lottie text). **All "outputs" are extracted from the assistant's text.**
- The cwd is a fresh `mkdtemp` — the model never sees the project's `CLAUDE.md`, `docs/`, or `package.json`. This was load-bearing for keeping the model focused on emitting JSON instead of narrating template reads.
- `bypassPermissions` is fine because we've already restricted tools.
- The driver runs a **60s silence watchdog** (default `silenceTimeoutMs`); if no event arrives it emits a synthetic `error` event and SIGKILLs the child.

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
