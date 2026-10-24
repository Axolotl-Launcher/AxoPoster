# AxoPoster

Current scope: match the source halftone's variable dot sizes and softly fade
the pattern at the poster top and bottom, including long posters.

## Direction

A focused changelog editor in AxoDraw's existing visual language. The colorful
poster is the primary visual object; the surrounding tools stay neutral.

- Keep AxoDraw's `base-rhea` shadcn preset, Base UI primitives, neutral tokens,
  Inter typography, 56px sticky header, centered `max-w-6xl` container, and
  `minmax(0, 1fr) 300px` desktop columns.
- Reuse the reference components without introducing another component system.
- Use the shadcn `base-rhea` Select built on Base UI for all choice fields,
  including icon previews, keyboard selection and theme-aware popup states.
- The header switches between editing, full poster preview, local drafts and
  font diagnostics. Narrow screens use a separate full-width navigation row.
- The editor is a sequence of unframed form sections; repeated update items may
  use the rounded surfaces already established in AxoDraw.
- The right sidebar provides a sticky preview and export controls.
- On mobile the sidebar moves below the form; the full-preview tab remains
  directly reachable from the header.

## Template

Source: the user-provided `AXL1.10.0.svg`, viewBox `0 0 567.5 1854`.

- Separate the source's pink gradient, halftone and footer silhouette. Recreate
  the halftone as a seamless 568 x 1152px SVG tile with a fixed 19.2px staggered
  grid and 9.6px row spacing. Diagonal density bands cycle every 576px; interpolate
  dot area from zero to a 6.6px radius so sparse bands can disappear. Repeat
  vertically at .24 opacity and apply a height-relative fade at the top and
  bottom. Only the pink color gradient adapts to the poster height.
- Anchor the original 568 x 333px footer silhouette to the content/footer
  junction, not to a fraction of the total poster height.
- Original outlined brand lockup; editable version and release ribbon.
- Keep the complete 167px AXOLOTL header watermark separate from the 101px brand
  lockup. Clip only the ribbon background, never its editable text.
- Preserve Anton SC outlines for the fixed brand and watermark; use local Anton
  SC Regular for the website and Noto Sans SC for Chinese copy and the channel.
  Version/subtitle/link values use installed Bahnschrift with bundled Barlow as
  fallback. Embed the bundled web fonts in exports; do not ship Windows fonts.
- Six original screenshots, losslessly sourced from embedded image data and
  resized into web assets.
- Alternating 522px white panels, pink headings and blue copy.
- Original AXL watermark, related links and project disclaimer.
- Keep 12px above the footer heading. Use the original link strip geometry:
  8px side inset, 229px link column, 16px gutter and 307px disclaimer column.
  Default disclaimer paragraphs occupy two/one/one lines; custom text can still
  wrap and grow. Retain the faint AXL watermark in each white link capsule.
- Extract the five original embedded footer icons directly, ignoring the source
  nodes' zero-scale transforms. Each link can select any icon or none. Legacy
  template links inherit their original icon; legacy custom links remain plain.
- Link rows wrap into two rows on narrow editor viewports. Icon changes share
  the existing history, JSON and draft persistence paths.
- The poster uses normal document flow, not fixed text coordinates. Text and
  media determine panel height; the overall poster height is unrestricted.
- Original input is never overwritten.

## Workflow And States

Edit metadata, edit/add/reorder updates, replace screenshots, inspect preview,
export a full-height PNG or JPEG. JSON import/export retains editable content.

IndexedDB stores the current working document and explicitly saved drafts.
Loading, dirty, saving, saved and storage failure are distinct states. A failed
save retains the in-memory work and offers retry and JSON download.

Undo/redo covers content changes, deletion and document replacement. Imports
are schema-validated; uploaded images are decoded and resized before use.

Font diagnostics is an unframed list in the main column, retaining the live
poster sidebar. Each font shows its source, use, loading/render result and
weight-specific samples. Detection uses independent temporary FontFace aliases
and Canvas pixel comparisons; generic-fallback ambiguity is shown as a warning.
Rechecking, checking one named system font and downloading a JSON report are
explicit commands. Do not enumerate system fonts or upload diagnostic data.
Results cover listed samples only, not full Unicode coverage or image export.
Keep detection state separate from poster history and autosave.

## Motion And Verification

Reuse AxoDraw's press feedback, moving tab indicator and collapsible transitions.
One short entrance animation; reduced-motion preferences are respected.

The user requested smoke testing only and will handle device testing.

Smoke checks completed: initial page load, live editing, automatic height growth
with long copy, a nonblank full-height PNG export, mobile viewport overflow,
shadcn selection, footer icon changes/undo/redo/autosave reload, JSON icon output
and legacy JSON input, complete header watermark, local font loading, TypeScript
and ESLint. Evidence is in `artifacts/`.

The focused footer/background check in `scripts/smoke-layout.mjs` verified
2/1/1 disclaimer lines, 12px heading spacing, unchanged tile/watermark dimensions
with 1 and 12 update sections, custom disclaimer height growth and a nonblank
568 x 1814px PNG. Evidence is `artifacts/layout-smoke.json`,
`artifacts/layout-export.png` and `artifacts/layout-footer.png`.

The focused long-background smoke in `scripts/smoke-background.mjs` verifies
seamless tile boundary rows, disappearing low-density dots, softer rendered
pattern at both poster edges, unchanged tile geometry and a nonblank 568 x 7476px
export with 30 update sections. Evidence is in `artifacts/`.

Font-specific smoke coverage: five font results, missing system font, suspected
fallback glyphs, file failure/retry, Barlow fallback, report download, probe-font
cleanup, unchanged poster content and one narrow viewport. Evidence is
`artifacts/fonts-smoke.json`, `artifacts/fonts-desktop.png` and
`artifacts/fonts-mobile.png`. No full regression or real-device checks were run.

No comprehensive regression, independent visual review, production build, storage
failure simulation or real-device testing was performed. Theme transitions,
saved draft recovery and image upload controls remain available for the user's
hands-on verification. Bahnschrift is device-dependent; cross-platform font
rendering and JPEG export were not checked.

No marketing copy or feature instructions were added to the interface. Existing
Rhea rounded controls and poster gradients were retained to match the explicit
reference, not introduced as a separate visual direction.
