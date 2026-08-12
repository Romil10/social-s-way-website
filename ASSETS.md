# Asset Manifest — Social's Way

All layers share: golden-hour key light from frame left, cream/walnut/caramel
palette, straight-on eye-level camera, no baked-in text. Masters live in
`assets/src/`; production files in `assets/layers/` and `assets/cards/`.
Machine-readable version: `assets/manifest.json`.

## Scene layers

| ID | File(s) | Role | Dims (2x) | Anchor | Depth |
|----|---------|------|-----------|--------|-------|
| 00-background | `bg-00-1x.webp`, `bg-00-2x.webp` | Opaque room plate (plaster wall, window light) | 2752×1536 | center (object-position 50% 62%) | 0 — smallest motion |
| 20-midground | `mid-20-1x.webp`, `mid-20-2x.webp` | Walnut worktable + lamp, papers, vessels. Transparent alpha above/around table. | 2400×1028 | bottom-center | 2 |
| 30-hero | `hero-30-1x.webp`, `hero-30-2x.webp` | Leather portfolio case, linen spine. Transparent alpha, shadow removed (CSS shadow used instead). | 915×1302 | bottom-center | 3 |
| 40-door-left | `40-door-left-1x.webp`, `40-door-left-2x.webp` | Left foreground door leaf (frame + frosted glass, handle at seam). Transparent alpha. | 640×1497 | bottom-left | 4 — largest motion |
| 41-door-right | `41-door-right-1x.webp`, `41-door-right-2x.webp` | Right foreground door leaf (mirrored sibling of 40, handle outside). Transparent alpha. | 600×1497 | bottom-right | 4 |
| — | CSS-only | Tint/shade overlay (`--tint`) + SVG grain overlay | — | full canvas | overlay band 10-11 |

## Alpha handling notes

- The midground and door plates were generated on flat grey and keyed out with
  a border-seeded flood fill (see `tools/process_layers.py`), then despilled
  and feathered (~1.6px). Edges are clean straight alpha, no halo.
- The hero case was keyed on warmth/saturation rather than grey distance,
  because its cast shadow shared the background's hue. The shadow was dropped
  deliberately; a soft CSS radial shadow sits under the case so the composited
  scene keeps contact with the table.
- The right door leaf is the left leaf's sibling from the same plate, flipped
  horizontally so its handle mirrors correctly. Grain continuity is preserved
  because both leaves came from the same exposure.

## Catalog cards

| Card | File | Dims |
|------|------|------|
| Brand Strategy | `cards/brand-strategy.webp` | 900×672 |
| Identity & Design | `cards/identity-design.webp` | 900×672 |
| Content & Editorial | `cards/content-editorial.webp` | 900×672 |
| Social & Campaigns | `cards/social-campaigns.webp` | 900×672 |
| Web & Digital | `cards/web-digital.webp` | 900×672 |
| Research & Insight | `cards/research-insight.webp` | 900×672 |

## Regenerating

```bash
python3 tools/process_layers.py
```

rebuilds every layer from `assets/src/` and rewrites `assets/manifest.json`.

## Placeholders / production gaps

See `HANDOFF.md`. In short: all imagery is AI-generated placeholder art;
replace with commissioned photography when available. Contact details in the
final card are placeholders.
