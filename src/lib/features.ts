/**
 * Demonstration-only learner features: AI assistant, community, messages and calendar.
 * They show fixture content, not real data, so they stay hidden (navigation, promos and
 * routes) unless NEXT_PUBLIC_SHOW_DEMO_FEATURES=true. See docs/phases/OPEN-DECISIONS.md
 * (D04, D05, D21, D22) before enabling any of them for learners.
 */
export const demoFeaturesEnabled = process.env.NEXT_PUBLIC_SHOW_DEMO_FEATURES === "true";

export const DEMO_ONLY_ROUTES = ["ai-page", "community", "messages", "calendar"] as const;
