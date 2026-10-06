# Design system

The root [`DESIGN.md`](../DESIGN.md) is the canonical detailed design specification and token reference. Preserve its typography, colors, spacing, radii, page composition, and responsive rules when restructuring components.

The implementation lives in `src/styles.css` followed by `src/refinements.css`. Keep both stylesheets and existing class names intact during structural work. The screenshots and brand assets at the repository root are reference material; runtime assets are served from `public/assets/`.

English/Arabic layout, typography, and RTL requirements are recorded in the canonical [DESIGN.md](../DESIGN.md). Keep a shared visual system, use logical properties where appropriate, and evaluate Arabic typography independently before selecting an Arabic font.

Use the project’s visual-parity and responsive-QA skills for UI changes. Do not introduce a replacement styling system or optimize the large course artwork as part of ordinary component extraction.
