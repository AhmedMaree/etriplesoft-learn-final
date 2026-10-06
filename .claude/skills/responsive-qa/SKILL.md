---
name: responsive-qa
description: Use after frontend changes or when fixing layout/responsive behavior across desktop, tablet, and mobile interfaces.
---

# Responsive QA

Check changed interfaces at:

320
375
430
768
1024
1280
1440
1920

Inspect:

- horizontal overflow
- flex/grid wrapping
- text truncation
- line breaks
- artwork scaling
- image aspect ratios
- navigation
- buttons
- forms
- modals
- cards
- tables
- video
- iframe
- sticky elements

Do not solve mobile layouts by shrinking desktop layouts indiscriminately.

Mobile layouts may reorganize content while preserving the same design language and content hierarchy.

Fix responsive problems at the component level rather than with broad global CSS overrides.
