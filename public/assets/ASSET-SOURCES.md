# Asset sources

- `logo.png`: unchanged copy of the supplied `EXPORTS/Main PNG.png`.
- `logo-display.svg`: SVG viewport wrapping the supplied logo to remove transparent artboard whitespace at display time; original pixels are preserved.
- `profile-image.png`, `ai-character.png`: supplied by the user.
- `learner-hero.png`: generated with the built-in image generation tool from the supplied signup and course-detail references. Exact generation prompt is stored in `learner-hero.png.json`.
- `course-thumbnails.png`: generated with the built-in image generation tool from `courses.png`. Exact generation prompt is stored in `course-thumbnails.png.json`.
- `course-0.svg` through `course-5.svg`: SVG viewports over the generated six-image sheet; original generated pixels are preserved.
- `learn-font.woff2`: Inter variable, Latin, from `@fontsource-variable/inter`; see `FONT-LICENSE.txt`.

All source references at the repository root are preserved.
- `learning-books-art.png`: graduation-cap-and-books artwork supplied by the user (Your courses section decoration); background made transparent, cropped and resized to 640px wide.
- `progress-books-art.png`, `certificate-award-art.png`: transparent artwork supplied by the user for the Overview right rail (learning progress and quick links); cropped to content and resized to 360px.
- `all-courses-artwork.png`: course-list artwork supplied by the user (copied from `courses-images/my-courses-page/`, which is not tracked in git).
- `all-courses-art-clear.png`: transparent-background version of `all-courses-artwork.png` (background removed, cropped, 760px wide) for the All Courses hero.
