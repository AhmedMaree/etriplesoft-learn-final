# Asset sources

- `logo.png`: unchanged copy of the supplied `EXPORTS/Main PNG.png`.
- `logo-display.svg`: SVG viewport wrapping the supplied logo to remove transparent artboard whitespace at display time; original pixels are preserved.
- `profile-image.png`, `ai-character.png`: supplied by the user.
- `learner-hero.png`: generated with the built-in image generation tool from the supplied signup and course-detail references. Exact generation prompt is stored in `learner-hero.png.json`.
- `course-thumbnails.png`: generated with the built-in image generation tool from `courses.png`. Exact generation prompt is stored in `course-thumbnails.png.json`.
- `course-0.svg` through `course-5.svg`: SVG viewports over the generated six-image sheet; original generated pixels are preserved.
- `learn-font.woff2`: Inter variable, Latin, from `@fontsource-variable/inter`; see `FONT-LICENSE.txt`.

All source references at the repository root are preserved.
