/** Anchor id for a team member on the About page, e.g. "Ahmed Emad" -> "ahmed-emad". */
export function teamAnchorId(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}
