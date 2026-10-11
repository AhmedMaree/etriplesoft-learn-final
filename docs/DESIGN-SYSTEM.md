# Design system

The root [`DESIGN.md`](../DESIGN.md) is the canonical detailed design specification and token reference. Preserve its typography, colors, spacing, radii, page composition, and responsive rules when restructuring components.

The implementation lives in `src/styles.css` followed by `src/refinements.css`. Keep both stylesheets and existing class names intact during structural work. The screenshots and brand assets at the repository root are reference material; runtime assets are served from `public/assets/`.

English/Arabic layout, typography, and RTL requirements are recorded in the canonical [DESIGN.md](../DESIGN.md). Keep a shared visual system, use logical properties where appropriate, and evaluate Arabic typography independently before selecting an Arabic font.

Use the project’s visual-parity and responsive-QA skills for UI changes. Do not introduce a replacement styling system or optimize the large course artwork as part of ordinary component extraction.

## Foundation verification (2026-10-08)

The existing token source remains `src/styles.css`: `--blue` #0066ff, `--green` #00875b, `--muted` #596992, `--line` #e7eaf1, `--lightblue` #e8f2ff, `--mint` #e2f7f0, and `--radius` 15px. These are existing values, not a new token system. Inspect `src/refinements.css` for effective component and breakpoint overrides. Buttons, panels, titles, icon boxes and progress bars live in `src/components/ui/primitives.tsx`; form wrappers live in `field.tsx`.

Run `npm.cmd test -- tests/design-foundation.spec.ts --output=tmp/phase-02-captures` to capture the anonymous catalog shell and signup form in both locales at all eight required widths. Captures are local review artifacts, not approved snapshot baselines. Desktop shell content has its own scrolling region; a full-page browser screenshot does not certify all offscreen content in that region. See the [Phase 02 evidence](phases/PHASE-02-DESIGN-RESPONSIVE-FOUNDATION.md) for limitations and remaining approval gates.
