---
name: code-quality
description: Use for implementation reviews, refactors, or final verification of application code quality and maintainability.
---

# Code Quality Review

Evaluate changed code for:

- unnecessary duplication
- dead code
- incorrect abstractions
- excessively large components
- unnecessary Client Components
- unsafe TypeScript
- unused dependencies
- unnecessary effects
- N+1 style data patterns
- unstable keys
- duplicated constants
- unclear naming

Do not refactor unrelated code.

Do not add abstraction for hypothetical future needs.

Prefer understandable code over clever code.

Tests must validate real behavior.

Never hardcode implementation specifically to satisfy one test.
