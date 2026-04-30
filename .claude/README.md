# `.claude/` — Claude Code resources for `open-lottie-ui`

This directory holds project-level resources that Claude Code auto-loads when a developer (or a future agent) opens the repo. Together they capture the project's authoring expertise so Claude does not have to re-derive it every session.

## Layout

```
.claude/
├── agents/                      # specialized subagents
│   └── lottie-author.md         # focused JSON authoring agent (read-only tools)
├── commands/                    # slash commands
│   ├── new-template.md          # /new-template — scaffold a Tier-1 template
│   └── seed-from-prompt.md      # /seed-from-prompt — author a CC0 seed
├── docs/                        # vendored reference material
│   └── lottie/                  # spec slices, cheatsheet, examples (populated by a docs agent)
├── skills/                      # domain skills
│   └── lottie-authoring/
│       └── SKILL.md             # Lottie / Bodymovin authoring expertise
└── README.md                    # this file
```

## What each thing is for

### `skills/`

Skills are domain knowledge bundles. Claude loads `SKILL.md` when its frontmatter `description` matches the user's request. The skill body is read once and persists for the session.

- **`lottie-authoring`** — when to author, debug, or remix Lottie JSON; project conventions; the Tier-1 template engine; the validator's pragmatic subset; data model touchpoints.

### `agents/`

Subagents are specialized assistants the main agent can delegate to. Each has its own system prompt and tool allowlist. The main agent invokes them when a task fits the agent's description.

- **`lottie-author`** — emits valid Bodymovin / Lottie JSON. Tools restricted to `Read, Glob, Grep` (read-only). Use it for non-trivial multi-layer compositions, draw-on effects, complex easing.

### `commands/`

Slash commands are reusable prompt templates. Typing `/<name>` in Claude Code expands the command body into the user prompt.

- **`/new-template`** — scaffolds a new Tier-1 template under `prompts/templates/`. Reads the canonical example, delegates body authoring to `lottie-author`, validates, and updates `CHANGELOG.md`.
- **`/seed-from-prompt`** — generates a CC0 seed animation from a natural-language prompt, validates it, and writes both `animation.json` and `meta.json` under `seed-library/<id>/`.

### `docs/lottie/`

Vendored Lottie / Bodymovin reference material — cheatsheet, schema slices, small examples. **Populated by a separate docs agent**, not by the resources in this folder. The skill and the `lottie-author` agent reference these paths read-only.

If `.claude/docs/lottie/` is missing or empty, the skill will surface that to the user before producing JSON.

## How to extend

- New skill: `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`).
- New subagent: `.claude/agents/<name>.md` with frontmatter (`name`, `description`, `tools`). Keep tool allowlists minimal.
- New slash command: `.claude/commands/<name>.md` with frontmatter (`description`). The body is the prompt that runs when the user types `/<name>`.

When in doubt about scope, see the project memory at `/CLAUDE.md` and the architecture docs under `/docs/`.
