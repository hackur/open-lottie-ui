# Architecture decision records

Short, dated notes on choices that affect the project's shape. Each ADR follows: **Context → Decision → Consequences → Status**.

## Index

| ID | Title | Status |
|----|-------|--------|
| [ADR-001](ADR-001-nextjs-app-router.md) | Use Next.js 15 App Router (not Vite + Express) | Accepted |
| [ADR-002](ADR-002-fs-store-no-db.md) | File system is the canonical data store (no DB in v1) | Accepted |
| [ADR-003](ADR-003-claude-cli-not-sdk.md) | Use the Claude CLI in v1, not the Anthropic SDK | Accepted |
| [ADR-004](ADR-004-default-preview-lottie-web.md) | `lottie-web` is the default preview renderer | Accepted |
| [ADR-005](ADR-005-dotlottie-canonical-export.md) | `.lottie` is the canonical export format | Accepted |
| [ADR-006](ADR-006-no-auth-localhost.md) | No auth; bind to 127.0.0.1 in v1 | Accepted |
| [ADR-007](ADR-007-plugin-manifest-v1.md) | Plugin system is manifest-driven (`plugin.json` v1) | Accepted |

## When to write a new ADR

- A choice between viable alternatives where the loser is reasonable.
- A choice that future contributors will question and need context for.
- A choice that's load-bearing on the architecture (changing it means re-doing real work).

## When NOT to write an ADR

- Coding-style preferences (those go in `eslint.config` / Prettier).
- Library-version pins (those go in `package.json`).
- Bug fixes (those go in commit messages).
