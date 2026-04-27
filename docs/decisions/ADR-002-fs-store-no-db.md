# ADR-002 — File system as the data store (no DB in v1)

## Context

We need to store: library items, generations, decisions, settings. Two choices:

- **File-system as canonical store**, plus an optional in-memory or SQLite cache for fast queries.
- **SQLite (via Prisma / drizzle)** as the canonical store, files only for the binary blobs.

## Decision

File-system canonical. No DB in v1. Optional SQLite cache may be added later if list/search performance demands it; canonical data stays as files.

## Consequences

**Pros**

- Git-friendly. Teams can share a library via git without a DB dump.
- Zero migration story. Renaming a field is a script in `scripts/migrations/`.
- Trivial to back up / sync (rsync, Dropbox, etc.).
- No dependency on a DB binary or server.
- "Open in Finder" works.
- Trivially readable from other tools or the user's editor.

**Cons**

- Search is O(N) on item count. Mitigated by chokidar-watched in-memory index.
- No transactions. Mitigated by atomic writes (write to tmp + rename).
- Concurrent writers would break things. We're a single-process app, so this is a non-issue today.

**Mitigations**

- `lib/store/` is the *only* abstraction over fs; all callers go through it.
- An `_index.json` aggregating per-item meta lets list pages be fast without scanning every directory.
- If list-perf hits the wall (~5k items), introduce SQLite for the index only — canonical data unchanged.

## Status

Accepted, M0.

## Sources

- [`architecture/data-model.md`](../architecture/data-model.md)
- [`architecture/personas.md`](../architecture/personas.md) (Sam wants git-trackability)
