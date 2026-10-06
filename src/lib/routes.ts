export const demoRoutes = [
  "overview",
  "courses",
  "ai-page",
  "community",
  "messages",
  "calendar",
  "certificates",
  "settings",
  "detail-course",
  "assessment",
  "payment",
  "sign-up",
] as const;

export type DemoRoute = (typeof demoRoutes)[number];

export function isDemoRoute(value: string): value is DemoRoute {
  return demoRoutes.some((route) => route === value);
}
