# Research 09 — Claude CLI invocation patterns

We drive code generation by spawning the **Claude CLI** (`claude`) as a child process from a Next.js server action. This sidesteps API-key management (uses the user's existing Claude Code OAuth) and gives us streaming output for free.

## Core flags

| Flag | What it does |
|------|--------------|
| `-p`, `--print` | Non-interactive: take a single prompt, print result, exit. Required for scripting. |
| `--output-format text` | Default — plain text output. |
| `--output-format json` | Single JSON object on stdout (final result + usage / cost). |
| `--output-format stream-json` | Newline-delimited JSON messages emitted as the model streams. |
| `--input-format stream-json` | Lets you stream a multi-turn conversation in. |
| `--verbose` | Required when streaming output for the per-message envelopes. |
| `--resume <session-id>` | Continue a previous session. |
| `--model <id>` | Pick model (e.g., `claude-opus-4-7`, `claude-sonnet-4-6`). |
| `--system-prompt <text>` | Override the system prompt. |
| `--allowed-tools` / `--disallowed-tools` | Whitelist/blacklist tool use. |
| `--permission-mode <mode>` | `default` / `acceptEdits` / `bypassPermissions`. |
| `--cwd <path>` | Run with a specific working directory. |

## Stream-JSON message shape

When `--output-format stream-json --verbose` is set, the CLI emits one JSON object per line. Each object has a `type` discriminator:

- `system` — initial session info (session id, model, tools available).
- `assistant` — assistant message with deltas (`delta.text`, tool_use blocks, etc.).
- `user` — synthesized user messages (e.g., tool results).
- `result` — final summary: `{ type: "result", session_id, total_cost_usd, num_turns, ... }`.

Parsing: split on `\n`, `JSON.parse` each line, dispatch on `type`. The `result` line is your "done" signal.

## Reference invocation for our case

```bash
claude \
  -p "$PROMPT" \
  --system-prompt "$SYSTEM" \
  --output-format stream-json \
  --verbose \
  --model claude-opus-4-7 \
  --permission-mode bypassPermissions \
  --disallowed-tools "Bash,Edit,Write" \
  --cwd /tmp/open-lottie-ui-sandbox
```

Notes:

- We do **not** want Claude to use Bash/Edit/Write here — the model's job is to *return* a Lottie JSON or a generation script as text. Tool use happens on *our* side.
- `bypassPermissions` is acceptable because we control the tool whitelist; nothing destructive can be invoked.
- We pass `--cwd` to a per-generation sandbox dir so any generated files (if we ever enable Write) land in a known place.

## Capturing output from Node

```ts
import { spawn } from "node:child_process";

const child = spawn("claude", [
  "-p", prompt,
  "--system-prompt", system,
  "--output-format", "stream-json",
  "--verbose",
  "--model", "claude-opus-4-7",
  "--permission-mode", "bypassPermissions",
  "--disallowed-tools", "Bash,Edit,Write",
]);

let buffer = "";
child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let nl: number;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (line) onMessage(JSON.parse(line));
  }
});
child.on("close", (code) => onDone(code));
```

This output is then forwarded over an SSE stream to the browser (see `12-process-management.md`).

## Cancellation, timeouts, retries

- **Cancel**: kill the child (`child.kill("SIGTERM")`); the CLI handles cleanup.
- **Timeout**: client-side wall clock + server-side timer that kills the child.
- **Retry**: simple — re-spawn with the same prompt. We can also use `--resume` with the previous `session_id` to continue a generation that ran out of tokens, asking it to "continue from where you left off, returning only the missing JSON".

## Cost & usage tracking

Every `result` message has `total_cost_usd` and `num_turns`. We accumulate per-generation and per-day totals into `decisions.jsonl` so users can see what they're spending.

## Why CLI over the SDK (for v1)

| Concern | CLI | SDK |
|---|---|---|
| Auth | Uses existing Claude Code OAuth | Requires API key in env |
| Install friction | One binary the user already has | New env var to set |
| Streaming | Built-in, ndjson | Possible but more code |
| Tool restriction | One CLI flag | Configure programmatically |
| Cost visibility | Bundled in result | Manual via response headers |
| Local Claude Code project context | Inherits | None |

The downside is parsing ndjson and a heavier process. For an *admin* that runs locally, this is fine. We can layer in the SDK behind the same interface in v2 if anyone wants headless / API-key deployment.

## Sources

- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference)
- [What is `--output-format` (ClaudeLog)](https://claudelog.com/faqs/what-is-output-format-in-claude-code/)
- [`--input-format stream-json` (issue #24594)](https://github.com/anthropics/claude-code/issues/24594)
- [Streaming output in `--verbose --print` (issue #733)](https://github.com/anthropics/claude-code/issues/733)
- [Stream-JSON chaining (claude-flow wiki)](https://github.com/ruvnet/ruflo/wiki/Stream-Chaining)
- [Khan/format-claude-stream](https://github.com/Khan/format-claude-stream) — handy reference for parsing stream-json.
- [Claude Code cheatsheet (Shipyard)](https://shipyard.build/blog/claude-code-cheat-sheet/)
