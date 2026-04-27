# ADR-007 — Plugin system is manifest-driven (`plugin.json` v1)

## Context

We want any community CLI ("optimize", "convert to gif", "round-trip in glaxnimate", "validate") to plug in without code changes to the core. Two choices:

- **Manifest-driven** (declarative `plugin.json`, runner shells out to a node/python/shell entry).
- **Code plugins** (require an npm package, register via JS).

## Decision

Manifest-driven. `plugin.json` is the only contract. Plugin code can be node, python, shell, or a binary on PATH.

## Consequences

**Pros**

- A non-JS dev can ship a plugin (write a Python script + a manifest, drop it in `plugins/`).
- Strict zod schema for manifests catches breakage early.
- Capability-scoped: input / output / requires are explicit.
- Plugin loader can probe `requires` at boot and disable plugins whose deps are missing.

**Cons**

- Less flexible than code-plugins for edge cases (a plugin can't, say, register a custom UI widget — only buttons on declared surfaces).
- Manifest schema needs careful evolution (v1 → v2 must not break v1 plugins).

**Mitigations**

- `manifest_version` field on every plugin; loader rejects unknown versions explicitly.
- Two first-party plugins (`svg-import`, `dotlottie-pack`) ship at M2 to validate the format.
- "Add a plugin" docs include 3 worked examples.

## Status

Accepted, target M2.

## Sources

- [`architecture/plugins.md`](../architecture/plugins.md)
