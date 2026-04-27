# ADR-003 — Use the Claude CLI for v1, not the Anthropic SDK

## Context

To talk to Claude we can either:

- **Spawn the `claude` CLI** with `--output-format stream-json` and parse ndjson.
- **Use `@anthropic-ai/sdk`** with our own API key in `.env`.

## Decision

Use the Claude CLI in v1. Hide it behind a `generate()` driver function so we can swap implementations later.

## Consequences

**Pros**

- No API-key management for the user — uses their existing Claude Code OAuth.
- Stream-json gives us all assistant deltas + a `result` line with cost.
- Tool whitelist controlled by a CLI flag.
- "Same Claude that's helping me code is helping me make Lottie" — narrative consistency for our audience (devs already on Claude Code).
- Easy to test by hand (just run the same `claude -p ...` in a terminal).

**Cons**

- Heavier per-invocation than the SDK (process spawn cost ~200 ms).
- ndjson parsing surface that can break on CLI updates.
- Can't be used in environments that don't have the Claude Code app installed (e.g., a CI server). Not in scope for v1.

**Mitigations**

- Pin minimum CLI version; check at boot and surface a clear error if missing.
- All ndjson parsing in one file with strong types so a schema change is one diff.
- The driver's `generate()` interface is implementation-agnostic; v2 can add a `useSdk: true` switch.

## Status

Accepted, M0. Re-evaluate at end of M3 once we know how often we hit the "headless / CI" use case.

## Sources

- [`research/09-claude-cli.md`](../research/09-claude-cli.md)
- [`architecture/claude-integration.md`](../architecture/claude-integration.md)
