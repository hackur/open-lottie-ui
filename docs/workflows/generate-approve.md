# Workflow — Generate & approve

The core loop. Step-by-step, including failure branches.

## Happy path

```
1. User on /generate
   └─ Types prompt, picks model + tier (defaults are fine)
   └─ Submits

2. Server action startGeneration(formData)
   └─ Creates generation id (date_nanoid)
   └─ Writes generations/{id}/prompt.md
   └─ Spawns claude CLI with stream-json output
   └─ Registers (id, child) in process registry
   └─ Returns { id } to client

3. Client navigates to /review/{id}
   └─ Page renders skeleton
   └─ Opens EventSource('/api/stream/{id}')

4. As Claude streams:
   └─ ndjson lines parsed
   └─ Assistant text accumulated
   └─ "delta" SSE messages forwarded to UI for live progress

5. Claude finishes (result line)
   └─ Driver extracts <lottie-json> block
   └─ Parses → validates with ajv against lottie-spec
   └─ ok? → write generations/{id}/final.json + meta.json
   └─ not ok? → repair loop (up to 3 times, --resume same session)

6. Renderer kicks off (server)
   └─ puppeteer-lottie renders 6 frames at 320×320
   └─ thumb.png saved
   └─ Pixel-check: any all-blank frames?
        - all blank → mark status: "failed-render"
        - some content → status: "pending-review"

7. SSE sends a final 'ready' event with the meta
   └─ Client re-renders the review page with the side-by-side preview

8. User reviews
   └─ Press 'a' → POST /generations/{id}/approve
   └─ Server copies final.json to library/{newId}/animation.json
   └─ Writes library/{newId}/meta.json (license: "generated", source: "open-lottie-ui")
   └─ Appends decisions.jsonl: {action: "approve"}, {action: "committed"}
   └─ revalidatePath('/library')
   └─ Toast "Added to library"
   └─ User redirected to /library/{newId} (or stays on /review for the next item)
```

## Reject path

```
8'. User reviews
    └─ Press 'r' → reason picker pops
    └─ User selects codes (multi) and optionally types a note
    └─ Submit → POST /generations/{id}/reject
    └─ Server appends decisions.jsonl: {action: "reject", codes, note}
    └─ Generation directory stays under generations/ with status: "rejected"
    └─ User offered "Try again" button → opens /generate prefilled with original prompt + rejection context
```

## Edit-and-retry path

```
8''. User clicks "Edit prompt & retry" on review screen
     └─ Modal opens with original prompt prefilled
     └─ Optional: also includes the rejection-style "what to change" box
     └─ Submit → new generation (new id), same flow
     └─ Old generation status updates to "rejected" with code "edited-and-retried"
```

## Failure branches

| Failure | Where | What user sees | Recovery |
|---|---|---|---|
| Claude not installed | server action start | Toast: "Claude CLI not found — see Settings." | Settings page deep-link. |
| Claude exits non-zero | child close handler | Generation marked `failed`. | "Retry" button. |
| Validation never passes | after 3 repair attempts | `failed-validation`; raw JSON shown for debug. | "Try again with more guidance" button. |
| Render produces all blank frames | post-validation pixel check | `failed-render`. Side-by-side shows "no visible output." | "Try again" or "Edit prompt & retry." |
| User cancels | client posts /cancel | child SIGTERM → `cancelled`. | Just gone. |

## Decisions log per generation (illustrative)

```jsonl
{"ts":"...","gen":"X","action":"created","model":"opus","prompt":"..."}
{"ts":"...","gen":"X","action":"stream_start"}
{"ts":"...","gen":"X","action":"version_attempt","v":1,"validated":false,"errors":3}
{"ts":"...","gen":"X","action":"version_attempt","v":2,"validated":true}
{"ts":"...","gen":"X","action":"rendered","frames":6,"blank":0}
{"ts":"...","gen":"X","action":"ready_for_review"}
{"ts":"...","gen":"X","action":"approve","by":"local-user"}
{"ts":"...","gen":"X","action":"committed","library_id":"Y"}
```

## Cost surfacing

The detail review page shows: model, num_turns, total tokens, total_cost_usd. Aggregated daily total appears on `/dashboard`.

## What an MVP user sees in 60 seconds

```
00:00  Click "Generate"
00:02  Type "pulsing teal loader 60 frames"
00:04  Press Cmd+Enter
00:05  Auto-nav to /review/{id} — skeleton + live tokens streaming
00:18  Stream finishes; right panel renders the loader
00:22  Press space — both previews play in sync
00:25  Press 'a' to approve
00:26  Toast: "Added to library." Auto-nav to /library
```

Total: under 30 seconds wall time. That's the bar.
