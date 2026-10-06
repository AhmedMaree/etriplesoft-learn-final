---
name: visual-parity
description: Use when implementing, migrating, refactoring, or fixing an existing ETripleSoft Learn UI where the current design, reference screenshot, or approved implementation must be preserved.
---

# Visual Parity

The existing/reference design is authoritative.

Do not redesign.

Compare:

- container dimensions
- widths
- heights
- spacing
- text line breaks
- font size
- font weight
- line height
- alignment
- card sizing
- image crop
- artwork placement
- border radius
- shadows
- gradients

Reuse existing design tokens and components.

Do not approximate a reference when the existing implementation already contains the correct values.

When changing architecture, minimize CSS changes.

Verify desktop and mobile separately.

If a mismatch remains, fix the underlying layout rather than adding arbitrary offsets unless the design genuinely requires them.
