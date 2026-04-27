# Research 13 — Human-in-the-loop approval UX

The whole point of `open-lottie-ui` is "AI proposes, human approves." The review UX is the most important screen.

## What good HITL UX looks like (from 2026 patterns)

Across the recent HITL literature, the consistent patterns are:

1. **A queue, not an inbox.** Items have priority, age, and SLA. We show: pending, approved, rejected.
2. **A rubric, not free text.** Decisions are *coded* (small categorical reasons) so they're aggregable. Free-text notes are an *additional* field, not the primary one.
3. **Decision codes drive routing.** Common codes for our case: `approve`, `reject:wrong-style`, `reject:wrong-color`, `reject:too-fast`, `reject:not-smooth`, `reject:missing-element`, `reject:invalid`, `escalate:needs-editor`. Codes feed back into the next prompt.
4. **Audit log is immutable.** Append-only `decisions.jsonl` with timestamp, generation id, decision code, reviewer (just "local-user" for v1), reason text, model + cost.
5. **Confidence-based escalation.** For us "confidence" = "did it pass validation + render without errors". Auto-discard the egregiously broken ones; queue everything else for human eyes.
6. **Edit and approve is a separate action from approve.** Editing is slower and breaks the rhythm. Reserve "edit" for the rare "this is 90 % right but I want to bump opacity" case; default flow is approve / reject.
7. **Suggested edits**: when rejecting, the LLM can propose a one-line fix that the human can accept inline ("the user said too fast — would 0.5x speed help?"). Mostly v2.

## Our screens

### Review queue (`/review`)

A list/grid of pending generations:

- Thumbnail (rendered first frame).
- Auto-playing preview on hover.
- Title (from prompt summary).
- Status pill (pending / running / failed validation).
- Age, model used, cost.
- Quick approve / reject buttons.
- "Open" → detail.

### Review detail (`/review/{id}`)

Side-by-side layout:

```
┌──────────────────────┬──────────────────────┐
│  Original / blank    │  Generation          │
│  [lottie preview]    │  [lottie preview]    │
│                      │                      │
├──────────────────────┴──────────────────────┤
│  [scrub bar — synced across both]           │
├─────────────────────────────────────────────┤
│  Prompt: "..."                              │
│  Model: opus-4-7  •  Cost: $0.014  •  3.2s  │
│  Validation: ✓  •  Bytes: 4.2 KB → optimized 2.1 KB │
├─────────────────────────────────────────────┤
│  [Approve]  [Reject ▾]  [Edit prompt & retry] │
│                                              │
│  Reject reasons (multi-select):              │
│   ▢ wrong-style  ▢ wrong-color  ▢ too-fast   │
│   ▢ not-smooth   ▢ missing-element           │
│  Free-text note: [...........................] │
└─────────────────────────────────────────────┘
```

Subtle but important details:

- **Scrub bar synced.** Comparing two animations only works if you can pause both at the same frame.
- **Loop both at the same `fr`/`ip`/`op`** even if the generation has different timings — show a checkbox for "use original timing for comparison."
- **Visual diff toggle** (see `15-visual-diff.md`): switch the right panel to show pixel-diff against the left.
- **JSON diff drawer** (collapsible). Mostly for debugging, not for designers.

### Generate form (`/generate`)

- Prompt text area with a "use template" combobox to seed it.
- Source selector: blank / pick existing animation to remix.
- Knobs: model, tier, max repair attempts (advanced drawer, defaults are sane).
- Live cost estimate (tiny — based on prompt token count).

### Library (`/library`)

- Grid with the same card style as the review queue but for *approved* items.
- Filters: source, tags, license, has-theme, has-state-machine.
- Bulk select → batch ops (export to .lottie, run plugin, delete).

## Decision recording

Every decision appends to `decisions.jsonl`:

```jsonl
{"ts":"2026-04-27T14:22:01Z","gen":"a1b2c3","action":"approve","cost_usd":0.014,"model":"claude-opus-4-7"}
{"ts":"2026-04-27T14:23:14Z","gen":"d4e5f6","action":"reject","codes":["too-fast","wrong-color"],"note":"slow it 2x and use brand teal","cost_usd":0.018,"model":"claude-opus-4-7"}
```

This file is the project's memory. Future iterations can read recent decisions to prime the next prompt.

## Anti-patterns we avoid

- **No modal-only confirms.** Approve/reject from a single keystroke (a/r) plus visible buttons. Reviewing is high-volume; clicks compound.
- **No "this might be a violation" warnings on every item.** Validation runs server-side; if it failed it doesn't enter the queue.
- **No required free-text on approve.** Approve is one click. Reject needs a reason code; free-text is optional.
- **No batch-approve without a confirm.** Easy to fat-finger.
- **No "training mode" gating.** Decisions become the training data; nothing stops the loop.

## Keyboard shortcuts

- `j` / `k` — next / previous in queue
- `a` — approve
- `r` — reject (opens reason picker)
- `space` — play / pause both previews
- `← / →` — frame step
- `e` — edit prompt & retry
- `?` — show shortcuts

Documented and customizable via `~/.config/open-lottie-ui/keys.json` (v2).

## Sources

- [Human-in-the-Loop Review Queues (2026) — All Days Tech](https://alldaystech.com/guides/artificial-intelligence/human-in-the-loop-ai-review-queue-workflows)
- [HITL Patterns for AI Agents (MyEngineeringPath)](https://myengineeringpath.dev/genai-engineer/human-in-the-loop/)
- [HITL Review Queues — Mavik Labs](https://www.maviklabs.com/blog/human-in-the-loop-review-queue-2026/)
- [HITL Implementation Guide (synvestable)](https://www.synvestable.com/human-in-the-loop.html)
- [Future of HITL AI (Parseur)](https://parseur.com/blog/future-of-hitl-ai)
- [Production HITL oversight (Redis)](https://redis.io/blog/ai-human-in-the-loop/)
- [HITL in agentic workflows (Orkes)](https://orkes.io/blog/human-in-the-loop/)
