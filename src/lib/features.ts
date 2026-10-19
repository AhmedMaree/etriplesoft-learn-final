/**
 * Demonstration-only learner feature: community.
 * It shows fixture content, not real data, so it stays hidden (navigation, promos and
 * route) unless NEXT_PUBLIC_SHOW_DEMO_FEATURES=true. See docs/phases/OPEN-DECISIONS.md
 * (D22) before enabling it for learners. The AI assistant (docs/phases/PHASE-25-AI-ASSISTANT.md),
 * the calendar (docs/phases/PHASE-23-CALENDAR.md) and messages (docs/phases/PHASE-26-COMMUNITY-MESSAGES.md)
 * are real features and are not gated here.
 */
export const demoFeaturesEnabled = process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "true";

export const DEMO_ONLY_ROUTES = ["community"] as const;
