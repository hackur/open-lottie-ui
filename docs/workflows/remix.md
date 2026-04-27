# Workflow — Remix existing animation

Pick an animation in the library, describe a change, get a modified version with a diff against the original.

## Why remix is its own workflow

- Different prompt: it includes the **base JSON** in context.
- Different success criteria: the result should look *recognizably similar* to the base; a wholly different animation is a failure.
- Different review UX: the original is the natural left-panel comparison; visual diff is the headline metric.

## Step-by-step

```
1. User on /library/[id]
   └─ Click "Remix"
   └─ Modal opens: textarea ("describe what to change") + dropdown of common edits
       Common edits seeded:
         - "Slow it down 2x"
         - "Make it loop seamlessly"
         - "Switch primary color to ___"
         - "Reverse the motion"
         - "Make it more bouncy / more linear"
   └─ Optional advanced: tier selector, model

2. Submit → server action remixGeneration(baseId, prompt)
   └─ Creates generation id (date_nanoid)
   └─ generation meta: base_id = baseId
   └─ prompt.md captures: base file contents (truncated/summarized for context),
      user prompt, system prompt
   └─ Spawns Claude CLI with system prompt instructing:
        "You are modifying an existing Lottie. Preserve as much as possible.
         Apply only the requested change.
         Return the full modified Lottie inside <lottie-json>."

3. (Same SSE stream / repair loop as generate-approve.md)

4. Render + diff
   └─ Render base + remix at matched frame samples
   └─ Run pixel diff (pixelmatch / odiff) → diff masks per frame + heatmap
   └─ meta.json gets diff stats: { changed_frame_ratio, total_diff_pixels, ... }

5. /review/{id} page (remix variant)
   └─ Side-by-side: base on left (always), remix on right
   └─ Toggle between "Show animation" and "Show diff heatmap" on the right panel
   └─ Slider: animation playback time
   └─ A small badge at top: "Changed 14% of pixels"
   └─ Approve / Reject as usual

6. Approve
   └─ User picks: "save as new" (new library item) or "replace base" (overwrite the original)
   └─ "Replace base" requires a confirmation, since it's a destructive op
   └─ When replacing, we keep the old version in generations/{id}/replaced.json for undo
   └─ decisions.jsonl: {action: "approve", remix_target: "<base_id>", mode: "new"|"replace"}
```

## "Replace base" undo

A 5-day TTL "undo" entry in `decisions.jsonl` lets the user revert by clicking "Undo replace" in the library item's history tab. Implementation: simple file copy from the archived `replaced.json` back to `library/{baseId}/animation.json`.

## Theme-mode remix (Tier 0, optional)

For "color/style change only" requests, instead of regenerating the whole JSON, we can produce a **dotLottie theme** (LSS) that re-skins the original. Faster, cheaper, more reliable.

```
Detection: prompt mentions only colors / opacity / line width / no timing.
Action:    spawn Claude with "produce-theme" system prompt.
Output:    a small JSON file under generations/{id}/theme.json.
Review:    same side-by-side, but the right panel uses dotlottie-web with the theme applied to the base animation.
Approve:   commit theme as a sibling to the library item or pack into a .lottie alongside.
```

This becomes a **named tier (Tier 0 — Theme)** for a v2 polish.

## Failure modes specific to remix

| Failure | Detection | Recovery |
|---|---|---|
| Output is a wholly different animation | diff_change_ratio > 90% | Surface a warning: "This may not be a remix — review carefully." |
| Output is identical to base | diff_change_ratio < 1% | Warning: "Claude returned essentially the same animation. Try a more specific prompt." |
| Output broke the layer count | layer_count delta > threshold | Warning: "Remix changed structure — may not be a true edit." |

These warnings are *not* hard rejects; the user decides.

## UX hint for the prompt

The Remix modal shows a small example next to the textarea:

> Tip: be specific. "Slow it down 2x and use #14B8A6 as the primary color" works better than "make it cooler."

## Decisions log

```jsonl
{"ts":"...","gen":"X","action":"created","mode":"remix","base":"loader-spinner","prompt":"slow 2x, teal"}
{"ts":"...","gen":"X","action":"diff_summary","change_ratio":0.18}
{"ts":"...","gen":"X","action":"approve","remix_target":"loader-spinner","mode":"new"}
{"ts":"...","gen":"X","action":"committed","library_id":"loader-spinner-teal-slow"}
```
