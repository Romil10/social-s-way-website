# Timeline Map — Social's Way

Progress `p` is the normalized scroll distance through `.cinematic-scroll`
(0 = first paint, 1 = fully scrolled). All values are defined once in
`CONFIG.timeline` in `js/app.js` and rendered as CSS custom properties on
`#stage`. CSS owns every transform; JS never touches styles directly.

| p range | Segment | What happens |
|---------|---------|--------------|
| 0.00–0.03 | Hero hold | Complete composition: doors frame the atelier, portfolio case on the table, title + standfirst on the cream scrim. |
| 0.03–0.16 | Intro exit | `copy-intro` fades and rises 46px; world holds. |
| 0.13–0.27 | Open | Doors slide out past the frame edges, camera pushes in (`--world-scale` 1 → 1.14), hero case scales and drifts left, opening negative space stage-right. |
| 0.22–0.28 | A enter | Narrative A (01 / The Studio) fades + rises inside the revealed space. |
| 0.28–0.325 | A hold | Full opacity. World stays open. |
| 0.325–0.375 | A exit | Panel A exits; hero case fades with it (`--p-a-exit`). |
| 0.40–0.44 | Panorama hold | Clean atelier panorama, nothing moving. |
| 0.44–0.56 | B beat | Focus tint + ≤5px blur ramp in; Narrative B (02 / The Practice) reads, then exits. |
| 0.565–0.665 | C beat | Narrative C (03 / Design Philosophy) reads over the same focused world. |
| 0.675–0.775 | D beat | Narrative D (04 / Selected Work) paper card reads: four clients, one-line outcomes. |
| 0.78–0.83 | Refocus | Tint and blur return to 0; world sharp for the finale. |
| 0.80–0.94 | Catalog enter | Rail slides in from 12vw right over the scene. |
| 0.92–0.975 | Settle | Prev/next controls fade in (`--p-settle`). |
| 0.975–1.00 | Final state | Catalog interactive (drag, swipe, keys, buttons). Contact card is the last item. |

## Custom properties written per frame

`--p`, `--p-intro`, `--p-open`, `--p-a`, `--p-a-exit`, `--p-b`, `--p-c`,
`--p-d`, `--p-tint`, `--p-rail`, `--p-settle`, `--world-scale`,
`--focus-blur`, `--mx`, `--my`.

## Interpolation rules

- All envelope motion uses smoothstep on clamped local ranges (`rangeProgress`,
  `segmentInOut` in `js/app.js`).
- Reversal is exact: every value is a pure function of `p`.
- Reduced motion: smoothing and parallax are disabled; the layout becomes a
  static hero followed by normal-flow panels and the catalog.

## Nav markers

`data-goto` values map to `p`: The Studio 0.30 · The Work 0.80 · Contact 1.00.
The engine converts `p` to a scroll offset: `section.offsetTop + p * maxScroll`.
