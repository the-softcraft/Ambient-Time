# AGENTS.md — Standby Clock

## What this is

A full-screen standby clock with four designs, switched by swiping. Plain
HTML/CSS/JS, no build step, no dependencies, no network at runtime. Target host
is a WebView APK loading `index.html` from `file://`, so treat that as the
baseline.

## Stack

- HTML + CSS + one IIFE in `app.js` (`'use strict'`).
- No framework, no bundler, no TypeScript, no npm packages.
- `localStorage` for: selected design index, 12/24-hour choice.
- Bundled assets: `fonts/archivo-black.woff2` (OFL, license in `fonts/OFL.txt`)
  and inlined Lucide icon symbols.

## Structure

```
index.html   .stage > .track > 4 x .clock panels, chrome overlay, icon sprite
style.css    one block per design + shared chrome/responsive rules
app.js       tick loop, data-bind text updates, swipe carousel, chrome, fullscreen, wake lock
icons/       Lucide SVGs (source for the sprite, not loaded at runtime)
```

Keep `index.html` at the folder root so the APK template finds it.

## How it works

- Panels are `flex: 0 0 100%` inside `.track`; the carousel is
  `translate3d(-index * stageWidth + dragOffset, 0, 0)`.
- Drag is a pointer-events state machine: decide the axis after 8 px, ignore
  vertical, rubber-band (×0.26) at the ends, snap past
  `min(110px, 16% of width)` on release.
- Text is bound declaratively: elements carry `data-bind="hh|h1|h2|mm|m1|m2|ss|
  ap|dow|dowLong|day|mon|monLong|year"` and a single `set(key, value)` map
  updates them all. Adding a design never touches the JS.
- `tick()` runs on a `setTimeout` aligned to the next second boundary, so the
  display flips exactly when the second does. `--sec` (0–100%) is set on
  `<html>` for progress bars.
- Chrome (buttons, hint, dots) is an overlay with `pointer-events: none` except
  on its buttons, and auto-hides after 6 s. Tap toggles it; the tap handler
  remembers whether it was hidden at pointer-down so a "show" tap doesn't
  immediately hide it again.

## Rules for agents

- **No Service Worker, no manifest, no caches** — they don't work from
  `file://`.
- **No remote assets** (fonts, scripts, icons, analytics).
- **Icons stay inlined in `index.html`** as `<symbol>` + `<use>`; CSS
  `mask-image: url(...)` and external `<use href="file.svg#id">` both fail
  cross-origin on `file://` and render nothing in a WebView (verified).
  To add one: download the Lucide SVG into `icons/`, add the `<symbol>`, use
  `<svg class="ico"><use href="#i-name"></use></svg>`.
- Fonts must be local `.woff2` + `@font-face`; keep the OFL license file.
- Each design is a self-contained `.clock--*` block. Don't share layout CSS
  between designs beyond the small helpers (`.chip`, `.d`, `.ampm`).
- Every design must survive: 360×640 portrait, 900×430 landscape, notched
  devices (use `env(safe-area-inset-*)`), and a clock face that changes every
  second without reflow (fixed-width digit slots `.d`).
- Keep it minimal: no settings screen, no extra widgets. Four designs is the
  agreed scope.
- Don't touch files outside this folder.

## Known limits (on purpose)

- No alarms, timers, weather, battery readout, or brightness control.
- Fullscreen may be blocked inside a WebView (button degrades to a no-op).
- Wake Lock is best-effort; a plain WebView needs `keepScreenOn` in the shell.
