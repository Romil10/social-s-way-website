# Social's Way — Marketing Atelier

A scroll-driven cinematic microsite. One continuous 2.5D atelier scene,
controlled by vertical scrolling, built with vanilla HTML/CSS/JS. No
frameworks, no animation libraries, no build step.

## Run locally

Any static file server works. From this directory:

```bash
python3 -m http.server 8931
# then open http://localhost:8931/
```

or

```bash
npx serve .
```

## Project layout

```
index.html          structure: sticky stage, world layers, copy, catalog
css/styles.css      design tokens, z-index bands, all motion (CSS owns transforms)
js/app.js           scroll engine, pointer parallax, catalog rail, loader, nav
assets/layers/      processed scene layers (WebP, responsive 1x/2x)
assets/cards/       catalog card photography (WebP)
assets/src/         untouched generated masters (keep for recompositing)
assets/manifest.json  machine-readable layer manifest
tools/              asset pipeline (process_layers.py) + QA harness (qa_shots.js)
SCENE-MAP.md        copy deck + narrative beats
ASSETS.md           asset manifest for humans
TIMELINE.md         timeline map (what happens at which p)
HANDOFF.md          placeholders, known limitations, verification results
```

## Editing content

All copy lives in `index.html`. Card images are referenced directly in the
rail markup. Animation timing lives in one config object at the top of
`js/app.js` (`CONFIG.timeline`); art lives in `assets/layers/` and can be
replaced file-for-file as long as anchors and aspect ratios stay the same
(see `ASSETS.md`).
