# Handoff — Social's Way cinematic microsite

Status: complete and verified. Vanilla HTML/CSS/JS, no frameworks, no build
step, no external JS dependencies. Fonts: Fraunces (display) + Inter (UI) via
Google Fonts with system fallbacks.

## Run

```bash
cd socials-way
python3 -m http.server 8931    # http://localhost:8931/
```

## Verification results (headless Chromium, this machine)

QA harness: `node tools/qa_cdp.mjs` (screenshots + assertions) and
`node tools/qa_a11y.mjs` (reduced motion). Screenshots land in `qa/`.

| Check | Result |
|-------|--------|
| Console errors (5 viewports × 8 checkpoints) | none |
| Horizontal document overflow | none |
| Timeline reversal determinism | exact (`--p-open` 0.896 down / 0.896 up at p=0.27) |
| Rail structure | 7 real cards + 14 clones; clones `aria-hidden` and `tabindex=-1` |
| Real card alt text | all meaningful (≥10 chars) |
| Rail keyboard (ArrowRight) | moves |
| Infinite-loop seam normalization | works (scrollLeft 2699 after wrap) |
| Catalog becomes interactive (`is-live`) at p ≥ 0.82 | yes |
| Reduced motion | stage unpins, static hero + normal-flow content, loader removed, rail snap-scrolls |
| Above-the-fold image payload | ~508 KB (bg+mid+hero+doors at 1x) |
| Total site payload (excl. masters/QA) | ~1.8 MB |

### Viewports captured at p = 0, .18, .27, .44, .58, .74, .9, 1
`desktop-1440×900`, `laptop-1280×720`, `tablet-land-1024×768`,
`tablet-port-768×1024`, `mobile-390×844`.

## Placeholders requiring production work

1. **All photography is AI-generated placeholder art** (in `assets/src/`,
   processed by `tools/process_layers.py`). Replace with commissioned stills:
   - one empty atelier wall plate,
   - one worktable plate shot against a flat neutral for keying (or supplied
     pre-cut with alpha),
   - the hero portfolio case,
   - one door plate (pair of leaves; the pipeline splits them at the seam).
   Re-run `python3 tools/process_layers.py` after dropping new masters in
   `assets/src/` with the same filenames.
2. **Contact details** in the final card: `hello@socialsway.studio` is a
   placeholder mailto. Replace with the real address (and add a phone if
   wanted) in `index.html`.
3. **Favicon / OG image**: not included. Add `<link rel="icon">` and social
   meta when brand assets exist.
4. **Fonts**: Fraunces + Inter are Google Fonts stand-ins. If the studio has a
   licensed brand typeface, swap the two `@font-face`/link references and the
   `--font-display` / `--font-ui` tokens.

## Known, accepted trade-offs

- The door leaves share one exposure (right leaf is the mirrored sibling of
  the left), so wood grain mirrors across the seam. Invisible in motion.
- The hero case's photographic cast shadow was dropped during keying (it
  shared the background hue); a soft CSS radial shadow replaces it. If a real
  shadow is preferred, re-shoot the case on a darker seamless and key on
  luminance instead.
- Blur is capped at 5px and paired with a tint; on `update: slow` and small
  screens the blur is dropped in favor of tint only (see the media query at
  the bottom of `styles.css`).

## For the next developer

- Timing: one object, `CONFIG.timeline`, top of `js/app.js`. Each entry maps
  to a named CSS variable; see `TIMELINE.md` for the beat map.
- Motion: CSS owns every transform. JS only writes custom properties on
  `#stage`. To retime a beat, change the range; to restyle a move, change the
  CSS that consumes its variable.
- Art: replace files in `assets/layers/` (same names, same anchors) and the
  scene recomposes. Anchors and depth order are documented in `ASSETS.md`.
- Do not remove the `.is-live` gate on `.catalog`: it keeps the rail's
  buttons and links out of the tab order until the final scene arrives.
