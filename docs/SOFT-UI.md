# «ناعم» — the Soft UI style

EngSpace has two interface styles, chosen per device in **Settings → المظهر → شكل الواجهة**: «ناعم» (Soft UI, the default) and «كلاسيك»
(the flat look the app had before v0.41). Light / dark is a separate choice, so there are four looks.

## How it is built

- `src/ui/ui-style.ts` keeps the choice (`localStorage` `engspace.style`), sets `html[data-style="soft"|"classic"]`, and exposes
  `useUiStyle()`. `index.html` repeats the rule in a tiny inline script so the very first paint already has the right style and mode
  (a test keeps the two equal).
- Every soft rule is **one block in `src/styles/app.css`**, scoped to `html[data-style="soft"]`, built on the same theme tokens. No screen
  has code for it. «كلاسيك» is therefore untouched — proven by a pixel comparison of every screen against the previous release (below).
- Exports (PDF / Word / Excel) never read these tokens; documents look the same in both styles.

## The one rule: depth has a meaning

| Depth | Means | Examples |
|---|---|---|
| **Raised** | you can press it, or it groups what you press | cards (`Panel`, `Card`), buttons on a surface, chips, option cards, the tab bar |
| **Inset** | it holds a value | fields, the tool result (`ResultHero`), wells inside a card (`bg-canvas/NN`), switch tracks |
| **Flat** | you read it | feed posts, tables, registers, long text, documents |

**A choice takes the opposite depth to its container.** A pressed-in track shows a raised thumb (segmented choices, the theme / style
pickers); a raised bar shows the current tab pressed in (the tab bar); standalone chips, checks and option cards press in when chosen.

Raised and inset things drop their border (the depth separates them); flat things keep their hairline. A result keeps its tone border —
red / green is the verdict.

## Colour

Surfaces take the canvas colour (light `#E6E9F0`, dark `#23252D`). Text and status tones are **computed**, not eyeballed: each was
darkened (light) or lightened (dark) along its own hue until it reads **≥ 4.5 : 1** on the base, the raised surface and — for statuses —
its own 10–15 % tint. The grey steps keep the hierarchy: ink-2 6.1 · ink-3 5.4 · ink-4 4.6 (light). The accent was checked for all three
accent colours and needed no change.

## Interaction

- A press swaps raised → inset **at once** (`:active`), no animation — shadows are never animated (performance rule).
- Keyboard focus is an **outline** in the accent colour. Tailwind's `ring` is a `box-shadow`, which the depth shadows would replace; the
  outline cannot be hidden by them.
- Disabled primary buttons are pressed in and dimmed, never raised.

## Performance

- No live blur anywhere in soft (the tab bar's glass becomes a raised slab — cheaper than the blur it replaces).
- Long lists (the feed) stay flat. Static shadows on cards cost a paint, not a frame; nothing animates a shadow.
- Android devices without headroom (`html[data-glass="lite"]`, set by `native.ts`) get one short shadow instead of two blurred ones.
- A scrolling row of raised things (chips, room / job cards) gets inner padding so their shadows are not clipped — padding only, never a
  negative margin (a row pulled over the line above would take that line's taps).

## Adding a screen

Use the kit (`Panel`, `Card`, `NumField`, `TextField`, `Pick`, `FilterChip`, `Check`, `Toggle`, `Primary`, `Secondary`) and the
soft style follows by itself. Hand-made surfaces follow it when they use the usual classes: a card is `rounded-2xl bg-surface border`,
a field is `bg-canvas border` (or a `bg-canvas` box around an `<input>`), a well inside a card is `bg-canvas/60`.

## How it was verified (v0.41)

- **Classic is unchanged.** Every route (82 per configuration: all tabs, every pushed screen, every tool screen and document tool,
  sheets, the palette, admin, the public page, sign-in, three roles) was captured on the previous release and on this one in «كلاسيك» —
  light / dark, Arabic / English, Android / iPhone / desktop (6 configurations, 1,554 screenshots) — and compared pixel by pixel. The
  only difference is Settings, which gained the style picker; the remaining few-pixel specks were shown to be the renderer's own
  run-to-run noise (the old build differs from itself at the same spots).
- **Soft, screen by screen.** All 255 screens of soft light (Arabic, Android) were reviewed, then soft dark, English, iPhone and desktop
  across every component type. Each defect found was fixed in the CSS block (clipped shadows in scrolling rows, the result's verdict
  border, the voice field, poll answers, switches, focus rings, the floating-layer halo).
- **Contrast.** An automated audit measures every visible text against its real, composited background on every route. Soft: **0
  failures** of 7,207 text checks in light and in dark. For comparison, the classic look has 116 (light) and 595 (dark) — mostly the
  grey `ink-3` on cards and status chips; soft fixes them by construction. Two button issues that classic still has are fixed in soft:
  the primary button's label (≈ 4.4 : 1 on the gradient's top half for indigo → ≥ 4.89 : 1) and white text on danger / warning fills
  in dark mode (1.5–1.9 : 1 → ≥ 6.3 : 1).
- **States.** `e2e/soft-ui.spec.ts` reads computed styles for chips (raised / pressed / held), keyboard focus, switches, segmented
  choices, fields at rest and while typing, and a disabled primary button. `tests/ui-style.test.ts` guards the default, the first-paint
  script and that every rule is scoped to `html[data-style="soft"]` with no animated shadow.
- **Scroll smoothness.** Classic vs soft, CPU throttled ×6, 5 runs each, the main scroller driven continuously for 4 s: same frame
  rate (57.8–59.5 fps) and the same share of slow frames on the feed, the tools and the jobs; the main thread does slightly less work
  in soft (feed 1,026 → 977 ms; jobs 1,092 → 1,037 ms) because the tab bar no longer blurs. Measured in headless Chromium (software
  raster); real-device GPU raster is not part of this number, which is why weak Android phones still get the short-shadow path.
- **First paint.** With the app's script blocked, the page already opens on the right style and base colour for every combination of
  saved style, saved theme and device preference (5 cases).
