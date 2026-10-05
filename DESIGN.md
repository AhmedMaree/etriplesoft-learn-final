---
name: ETripleSoft Learn
description: Reference-led learning portal with blue actions and compact white panels.
colors:
  primary: "#0066ff"
  primary-hover: "#0059e0"
  green: "#00875b"
  ink: "#080d26"
  muted: "#596992"
  background: "#f5f6f6"
  surface: "#ffffff"
  line: "#e7eaf1"
  lightblue: "#e8f2ff"
  mint: "#e2f7f0"
typography:
  body:
    fontFamily: 'Learn, "Arial", sans-serif'
    fontSize: "16px"
  headline:
    fontSize: "38px"
    lineHeight: 1.13
    letterSpacing: "-1.1px"
  title:
    fontSize: "21px"
    lineHeight: 1.3
    letterSpacing: "-0.6px"
  label:
    fontSize: "12px"
    fontWeight: 600
rounded:
  field: "7px"
  button: "11px"
  panel: "15px"
spacing:
  tight: "8px"
  control-gap: "12px"
  column-gap: "16px"
  panel-padding: "18px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "12px 22px"
  button-outline:
    backgroundColor: "#ffffffb8"
    textColor: "{colors.primary}"
    rounded: "{rounded.button}"
    padding: "12px 22px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-padding}"
---

# Design System: ETripleSoft Learn

## Overview

The supplied screenshots and brand PDF establish the visual authority. This document records the implemented system in `src/styles.css`, followed by `src/refinements.css`; later responsive and page-specific rules take precedence over base values. It is a reconstruction, not a new visual identity.

The portal uses compact white panels, clear blue actions, dark headings, muted supporting text, and photographic learning imagery. Pale blue-to-mint gradients distinguish promotional and assistant surfaces from ordinary content.

**Key Characteristics:**
- Dense desktop dashboard with a persistent navigation rail.
- Rounded, lightly bordered surfaces with restrained shadows.
- Shared buttons, progress indicators, course cards, and contextual right rails.

## Colors

Primary blue identifies selected navigation, principal actions, links, and learning progress. Green marks completion and positive outcomes. Light blue and mint support icon tiles and contextual panels. Ink, muted text, white surfaces, and pale borders preserve the reference hierarchy.

The brand PDF values are retained separately in CSS as `--brand-circuit` (#1B72FF), `--brand-matrix` (#00804C), `--brand-void` (#141413), and `--brand-static` (#F5F5F2). These are brand metadata; the rendered action palette remains the screenshot-derived palette above.

## Typography

`Learn` is the CSS alias for the bundled Inter variable font, with Arial and sans-serif fallbacks. Canva Sans was not supplied, so exact reference typography is not achieved. The base size becomes 14px at widths up to 1350px; many components use explicit sizes.

Page headings generally range from 35–40px on desktop, promotional headlines approximately 41–43px, section titles 17–21px, body copy 14–17px, and metadata 10–12px. These are observed roles, not a strict modular scale. Narrow layouts reduce headings and allow wrapping. Certificate signatures retain their separate cursive treatment.

## Layout

The dashboard shell is centered with a maximum width of 1800px and 7px outer padding. Its desktop sidebar starts at 244px, contracts to 220px at 1350px, then 195px between 901px and 1150px. Main content uses a flexible column and a contextual rail, typically separated by 16px. Course grids use three equal columns before responsive reductions.

At 900px and below, navigation becomes a toggled drawer. At 700px and below, major content and form sections stack; 480px rules further adapt imagery, toolbar controls, certificate composition, and card spacing. Calendar grids, settings navigation, and tabs use contained scrolling where needed. Do not turn their deliberate horizontal scrolling into whole-page overflow.

Signup uses its own header, introductory image panel, form column, and footer rather than the dashboard shell. Its columns also stack on small screens.

## Elevation & Depth

Ordinary panels are white with thin pale borders. Gradients provide most visual layering. Active navigation has a subtle shadow (`0 4px 12px #0066ff0a`); popovers use stronger elevation (`0 10px 40px #162b4926`). Certificate ornament has its own gold treatment. Do not apply floating overlay shadows to every card.

## Shapes

Fields have modest rounding, buttons softer rounding, and panels broader rounding as defined above. Course cards use 13px corners and clip their imagery. Avatars and progress rings are circular; status badges are pills. Lucide outline icons use approximately 1.9–2px strokes, with selective filled stars and active marks.

## Components

- **Buttons:** Blue filled and blue outlined variants share centered content, 12px gaps, and a 43px base minimum height. Hover changes the background over 0.18s. Disabled buttons use half opacity and a disabled cursor. Page-specific compact buttons reduce these dimensions.
- **Inputs:** Visible labels sit above bordered wrappers with 16px horizontal padding and a 48px base minimum height. Focus changes the wrapper border to blue; native input content remains transparent.
- **Navigation:** Icon-and-label links use rounded selected blue backgrounds with white text. Unselected hover backgrounds are pale blue. The drawer preserves the same navigation identity.
- **Badges and filters:** Green badges denote positive status; filter pills switch to blue with white text when selected. Preserve readable text labels instead of relying on color alone.
- **Panels and course cards:** Shared panel borders and padding support titles, text links, and list rows. Course cards combine clipped imagery, metadata, teacher identity, and a full-width action; noncompact card bodies flex to align actions.
- **Progress:** Thin rounded bars and circular percentage rings use blue for learning progress and green for completion.
- **Heroes and certificate:** Heroes blend local images into pale blue/mint backgrounds. The certificate combines white paper, curved green/blue corner ornaments, and a gold seal. Replacement hero/course assets and simplified certificate ornament deliberately approximate the supplied screenshots.

Visible keyboard focus uses a 3px blue outline with a 3px offset where not superseded by field rules. Reduced-motion preferences disable transitions. Course-image hover scales gently to 1.035 over 0.2s.

## Do's and Don'ts

- Do preserve the supplied reference hierarchy and copy when extending a screen.
- Do reuse shared primitives and inspect both stylesheets before adding overrides.
- Do preserve local image crops, aspect ratios, and responsive text wrapping.
- Don't substitute the PDF brand blue for every screenshot-derived action blue.
- Don't claim exact pixel parity: typography, replacement images, outline icons, and certificate ornament remain deliberate differences.
- Don't imply production services from demo controls; interaction behavior is local to this React application.
