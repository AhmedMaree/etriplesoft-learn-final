import { expect, test } from "@playwright/test";
import { currentLevels, recommendCourses } from "../src/features/placement/recommend";
import type { PlacementStatus } from "../src/features/placement/types";

// Pure rule tests: no browser or database involved.

const catalog = [
  { slug: "crash-course-odoo-erp", category: "functional", level: "beginner" },
  { slug: "python-fundamentals", category: "technical", level: "beginner" },
  { slug: "odoo-development", category: "technical", level: "advanced" },
  { slug: "odoo-implementation", category: "functional", level: "intermediate" },
  { slug: "odoo-user-guide", category: "functional", level: "beginner" },
  { slug: "odoo-system-admin", category: "technical", level: "intermediate" },
];

function status(overrides: Partial<PlacementStatus>): PlacementStatus {
  return {
    learnerType: "professional",
    skipped: false,
    enrolled: false,
    areas: ["functional", "technical"],
    goals: { role: "developer", interests: ["technical"], experience: "some" },
    result: null,
    completed: [],
    ...overrides,
  };
}

const result = (areas: { area: string; level: "beginner" | "intermediate" | "advanced" }[]) => ({
  id: "r1",
  method: "quiz" as const,
  createdAt: "2026-10-20T00:00:00Z",
  areas: areas.map((item) => ({ ...item, correct: 0, total: 4 })),
});

test("a beginner developer starts with the beginner technical course", () => {
  const learner = status({ result: result([{ area: "technical", level: "beginner" }]) });
  const picks = recommendCourses(catalog, currentLevels(learner), ["technical"], new Set());
  expect(picks.map((pick) => [pick.course.slug, pick.reason])).toEqual([
    ["python-fundamentals", "match"],
    ["odoo-system-admin", "nextStep"],
    ["odoo-development", "challenge"],
  ]);
});

test("an intermediate developer gets the same level first, then the next step, then foundations", () => {
  const learner = status({ result: result([{ area: "technical", level: "intermediate" }]) });
  const picks = recommendCourses(catalog, currentLevels(learner), ["technical"], new Set());
  expect(picks.map((pick) => [pick.course.slug, pick.reason])).toEqual([
    ["odoo-system-admin", "match"],
    ["odoo-development", "nextStep"],
    ["python-fundamentals", "foundation"],
  ]);
});

test("enrolled courses are never suggested and other areas only fill remaining places", () => {
  const learner = status({ result: result([{ area: "technical", level: "beginner" }]) });
  const picks = recommendCourses(
    catalog,
    currentLevels(learner),
    ["technical"],
    new Set(["python-fundamentals", "odoo-system-admin"]),
  );
  expect(picks.map((pick) => [pick.course.slug, pick.reason])).toEqual([
    ["odoo-development", "challenge"],
    ["crash-course-odoo-erp", "explore"],
    ["odoo-user-guide", "explore"],
  ]);
});

test("nothing is suggested when every course is already started", () => {
  const learner = status({});
  const picks = recommendCourses(catalog, currentLevels(learner), ["technical"], new Set(catalog.map((course) => course.slug)));
  expect(picks).toEqual([]);
});

test("completing a course raises the level above the measured one", () => {
  const learner = status({
    goals: { role: "functional_consultant", interests: ["functional", "technical"], experience: "regular" },
    result: result([{ area: "functional", level: "beginner" }]),
    completed: [{ area: "functional", level: "beginner" }],
  });
  expect(currentLevels(learner)).toEqual([
    { area: "functional", level: "intermediate", measured: "beginner", raised: true },
    { area: "technical", level: "beginner", measured: null, raised: false },
  ]);
});

test("a completed course below the measured level does not lower it", () => {
  const learner = status({
    result: result([{ area: "technical", level: "advanced" }]),
    completed: [{ area: "technical", level: "beginner" }],
  });
  expect(currentLevels(learner)).toEqual([{ area: "technical", level: "advanced", measured: "advanced", raised: false }]);
});
