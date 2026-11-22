# Standby Clock

A full-screen standby clock for your desk, nightstand or dock. Four designs,
swipe sideways to switch. No build step, no dependencies, fully offline.

Open `index.html` in a browser, or drop the folder into a WebView APK's
`assets/` directory and ship it.

## Designs

| # | Name | Look |
| --- | --- | --- |
| 1 | **Spectrum** | Deep blue, giant gradient-filled numerals, date above, seconds chip |
| 2 | **Tiles** | Warm paper, four colour-coded digit cards (pink / orange / green / blue) |
| 3 | **Outline** | Near-black, hollow hours + solid minutes, seconds progress bar |
| 4 | **Poster** | Purple gradient, pink hours over yellow minutes, vertical date rail |

All four show the time, the weekday, the date and the seconds — no settings,
no weather, no widgets.

## Gestures

| Do | Result |
| --- | --- |
| Swipe left / right | Next / previous clock |
| Drag on desktop, horizontal trackpad swipe, `←` `→` | Same |
| Tap | Hide / show the on-screen controls |
| Tap the dots | Jump to a design |
| `F` | Fullscreen |
| `H` | Hide / show controls |

Controls auto-hide after 6 seconds so the clock stays clean. The chosen design,
the 12/24-hour mode and nothing else are remembered in `localStorage`. The
hour format starts from your system locale.

The app tries to keep the screen awake with the Wake Lock API (where the host
supports it) and re-requests it when the page becomes visible again.

## Layout notes

- Everything sizes from `vmin`, so the same design reads well in portrait and
  landscape; `clamp()` keeps the type from getting silly on tablets.
- Safe-area insets are added to every fixed element (notches, gesture bars).
- Digits are updated exactly on the second boundary (not every 100 ms), and
  numerals use fixed-width slots so the layout never jitters when a `1` appears.
- Switching designs is a CSS transform on a 4-panel track; dragging moves it
  live, releasing snaps to the nearest panel.

## Files

```
index.html   four clock panels + inline SVG icon sprite
style.css    all four designs, chrome, responsive rules
app.js       clock updates, swipe carousel, theme of controls, fullscreen, wake lock
icons/       Lucide (ISC) SVGs — source for the inlined sprite
fonts/       Archivo Black (OFL 1.1, license included) for the big numerals
```

## Notes for the APK build

- No service worker, no manifest, no network calls — all assets are local and
  relative, so `file://` works.
- Fullscreen may be blocked by the WebView; the button degrades to a no-op.
- The screen staying awake depends on the host: browsers honour Wake Lock,
  a plain WebView usually does not unless the shell sets
  `keepScreenOn`.
