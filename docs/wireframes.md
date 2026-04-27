# Wireframes (ASCII)

Low-fidelity sketches of the key screens. Layout, not visual design. Once we have the scaffold up these become real Figma frames; for now this is enough to align on.

## Shell — sidebar layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ open-lottie-ui                          theme ▾   model ▾   settings ⚙   │
├────────────┬─────────────────────────────────────────────────────────────┤
│ ▢ Library  │                                                             │
│   Generate │   <main route content here>                                 │
│   Review   │                                                             │
│   Plugins  │                                                             │
│   Settings │                                                             │
│            │                                                             │
│  Sources   │                                                             │
│   Local    │                                                             │
│   LottieF. │                                                             │
│   Lordicon │                                                             │
│   Add+     │                                                             │
│            │                                                             │
│  Cost: $—  │                                                             │
│  today $0  │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

## /library — grid

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Library  •  142 items                                                     │
│ [search… ▾]  [tag: all ▾]  [source: all ▾]  [license: all ▾]  [+import]  │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐                  │
│ │ ⏵  │  │ ⏵  │  │ ⏵  │  │ ⏵  │  │ ⏵  │  │ ⏵  │  │ ⏵  │                  │
│ │    │  │    │  │    │  │    │  │    │  │    │  │    │                  │
│ │loadr│ │check│  │heart│ │bell │  │error│ │info│  │ok  │                  │
│ │30/60│  │30/45│  │30/30│ │30/60│  │30/30│ │30/30│ │30/45│                 │
│ └────┘  └────┘  └────┘  └────┘  └────┘  └────┘  └────┘                  │
│ ┌────┐  ┌────┐  …                                                        │
└──────────────────────────────────────────────────────────────────────────┘
```

Hover on a card auto-plays. Click → detail.

## /library/[id] — detail

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ←  Loader Spinner                                                         │
├────────────────────────────────────┬─────────────────────────────────────┤
│                                    │ META                                │
│         ┌────────────┐             │ tags  loader, spinner, ui           │
│         │            │             │ src   seed                          │
│         │ <preview>  │             │ lic   CC0-1.0                       │
│         │            │             │ size  4.2 KB → 2.1 KB optimized     │
│         └────────────┘             │ fr=30  ip=0  op=60  200×200         │
│  ⏵  ━━━━●─────────────  60         │ layers 3                            │
│  [-1] [+1]  [loop ✓] [renderer ▾]  │                                     │
│                                    │ ACTIONS                             │
│                                    │ [Remix]                             │
│                                    │ [Export ▾]   .lottie / .json / gif  │
│                                    │ [Validate]                          │
│                                    │ [Optimize]                          │
│                                    │ [Open in Glaxnimate]                │
│                                    │                                     │
│                                    │ JSON  ▾                             │
└────────────────────────────────────┴─────────────────────────────────────┘
```

## /generate — prompt form

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Generate                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Describe the animation you want                                           │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │ Pulsing teal loader, 60 frames, smooth ease in and out               │ │
│ │                                                                      │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ Base on existing  ▾ (none)                                                │
│ Templates  ▾ (auto)                                                       │
│                                                                           │
│ Advanced ▾                                                                │
│   model: claude-opus-4-7 ▾                                                │
│   tier:  auto (1 → 2 → 3) ▾                                               │
│   max repair attempts: 3                                                  │
│   estimated cost: ~$0.012                                                 │
│                                                                           │
│                                          [Cancel]   [Generate (⌘↵)]       │
└──────────────────────────────────────────────────────────────────────────┘
```

## /review — queue

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Review queue  •  3 pending  •  0 running                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ ▢ Pulsing teal loader  ✓ valid  •  rendered  •  $0.014 •  4m ago         │
│       <thumb>      "60 frames, smooth ease"                               │
│       [a Approve]  [r Reject ▾]  [Open]                                   │
│ ─────────────────────────────────────────────────────────────────────── │
│ ▢ Success burst       ✓ valid  •  rendered  •  $0.022 •  6m ago          │
│       <thumb>      "scale up 110% then settle"                            │
│       [a]  [r ▾]  [Open]                                                  │
│ ─────────────────────────────────────────────────────────────────────── │
│ ▢ Slide-in toast      ⚠ failed-render  •  $0.018 •  9m ago               │
│       <—>          "from right, 30 frames"                                │
│       [Retry]  [Inspect]                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

## /review/[id] — side-by-side

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ←  Pulsing teal loader   •   v2 (after 1 repair)                          │
├────────────────────────────────────┬─────────────────────────────────────┤
│       BASE (or "Blank")            │       GENERATION                    │
│        ┌──────────┐                │        ┌──────────┐                 │
│        │          │                │        │          │                 │
│        │ <player> │                │        │ <player> │                 │
│        │          │                │        │          │                 │
│        └──────────┘                │        └──────────┘                 │
│                                    │   [show diff] [renderer ▾]          │
├────────────────────────────────────┴─────────────────────────────────────┤
│  ⏵  ━━━━●────────  30 / 60   (synced scrub across both panes)             │
├──────────────────────────────────────────────────────────────────────────┤
│  Prompt: "Pulsing teal loader, 60 frames, smooth ease in and out"         │
│  Model: claude-opus-4-7  •  Cost: $0.014  •  Wall: 12 s                   │
│  Validation: ✓  •  Bytes: 4.2 KB                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  [a Approve]  [r Reject ▾]   [e Edit prompt & retry]                      │
│                                                                           │
│  Reject reasons:  ▢ wrong-style  ▢ wrong-color  ▢ too-fast                │
│                   ▢ not-smooth   ▢ missing-element                        │
│  Note: ┌─────────────────────────────────────────────────────────────┐  │
│        │                                                             │  │
│        └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## /settings

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Settings                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Library path:  ./library                            [change]              │
│ Default model: claude-opus-4-7  ▾                                         │
│ Default tier:  auto (1 → 2 → 3) ▾                                         │
│ Theme:         system ▾                                                   │
│ Bind:          127.0.0.1 (loopback)                                       │
│                                                                           │
│ ── Tools ────────────────────────────────────────────────────             │
│ ✓ claude (1.x)              required           [check]                    │
│ ✓ ffmpeg (6.x)              recommended        [check]                    │
│ ✓ python3 (3.12)            optional           [check]                    │
│ ✗ glaxnimate                optional           [install hint]             │
│ ✗ dotlottie (cli)           optional           [install hint]             │
│ ✓ python pkg: bodymovin     optional                                      │
│ ✗ python pkg: lottie        optional (AGPL)    [install hint]             │
│                                                                           │
│ ── Plugins (see /plugins) ────────────────────────────────────             │
│ 5 active  •  3 disabled (missing tools)  •  0 errors                      │
└──────────────────────────────────────────────────────────────────────────┘
```

## Notes for the implementer

- All screens are responsive at the desktop tier (1280+); mobile is unsupported.
- Dark mode is the primary design target; light mode follows the same Tailwind tokens.
- Keystrokes shown in brackets (`[a]`, `[r]`, …) are the canonical shortcuts.
- The "renderer ▾" toggle exposes lottie-web vs dotlottie-web for the same JSON.
