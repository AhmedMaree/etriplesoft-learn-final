import { test, expect } from "@playwright/test";
const routes = [
  "/en",
  "/en/courses",
  "/en/ai-page",
  "/en/community",
  "/en/messages",
  "/en/calendar",
  "/en/certificates",
  "/en/settings",
  "/en/detail-course",
  "/en/assessment",
  "/en/payment",
  "/en/sign-up",
  "/en/login",
  "/en/forgot-password",
  "/en/reset-password",
  "/ar/login",
  "/ar/forgot-password",
  "/ar/reset-password",
  "/ar",
  "/ar/courses",
  "/ar/ai-page",
  "/ar/community",
  "/ar/messages",
  "/ar/calendar",
  "/ar/certificates",
  "/ar/settings",
  "/ar/detail-course",
  "/ar/assessment",
  "/ar/payment",
  "/ar/sign-up",
];
test("all localized routes render without overflow at required widths", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1086 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const expectedDirection = route.startsWith("/ar") ? "rtl" : "ltr";
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        expectedDirection,
      );
      await expect(page.locator("h1").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} overflows at ${width}px`,
      ).toBe(true);
      await expect(page.locator("body")).not.toContainText("undefined");
    }
  }
  expect(errors).toEqual([]);
});
test("published course filters and search work together", async ({ page }) => {
  await page.goto("/en/courses");
  await expect(page.getByTestId("learner-course-card")).toHaveCount(6);
  await expect(page.getByTestId("course-enroll-now").first()).toBeVisible();
  const cartAction = page.getByTestId("course-add-to-cart").first();
  await expect(cartAction).toBeVisible();
  await expect(cartAction).toHaveAttribute("href", /\/en\/payment\?course=/);
  await page
    .getByRole("link", { name: "Technical", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/category=technical/);
  await expect(page.getByTestId("learner-course-card")).toHaveCount(3);
  await page.locator('input[name="q"]').fill("Python");
  await page.locator('input[name="q"]').press("Enter");
  await expect(page.getByTestId("learner-course-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Enroll now", exact: true }).click();
  // The detail opens on the same learner route, not on the public catalog.
  await expect(page).toHaveURL(/\/en\/courses\?course=python-fundamentals$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Python Fundamentals" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Curriculum" })).toBeVisible();
});
test("signup validates passwords and does not persist identity in local storage", async ({
  page,
}) => {
  await page.goto("/en/sign-up");
  await page.getByLabel("Email address").fill("learner@example.com");
  await page.getByLabel("Your name").fill("Demo Learner");
  await page
    .getByRole("textbox", { name: "University" })
    .fill("Example University");
  await page.getByRole("textbox", { name: "Faculty" }).fill("Engineering");
  await page.getByLabel("Password", { exact: true }).fill("test-pass-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("different-pass");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".auth-message[role='alert']")).toContainText(
    "Passwords do not match",
  );
  await expect(page.locator('[name="confirm_password"]')).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator('[name="confirm_password"]')).toHaveAttribute(
    "aria-describedby",
    "auth-error",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("learner-name")),
  ).toBeNull();
});
test("signup learner fields switch without submitting stale values", async ({
  page,
}) => {
  await page.goto("/en/sign-up");
  await expect(page.getByRole("textbox", { name: "University" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Faculty" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Job title" })).toHaveCount(0);

  await page.getByRole("radio", { name: /Professional/ }).check();
  await expect(page.getByRole("textbox", { name: "Job title" })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Company name" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "University" })).toHaveCount(
    0,
  );
  await page.getByRole("textbox", { name: "Job title" }).fill("Engineer");

  await page.getByRole("radio", { name: /My company enrolled me/ }).check();
  await expect(
    page.getByRole("textbox", { name: "Company invitation code" }),
  ).toBeVisible();
  await expect(
    page.getByText(/will not be verified or grant organization access/),
  ).toBeVisible();
  expect(
    await page.locator("form").evaluate((form) => {
      if (!(form instanceof HTMLFormElement)) return false;
      return new FormData(form).has("job_title");
    }),
  ).toBe(false);

  await page.goto("/ar/sign-up");
  await expect(page.getByRole("radio", { name: /طالب/ })).toBeVisible();
  await page.getByRole("radio", { name: /متخصص/ }).check();
  await expect(
    page.getByRole("textbox", { name: "المسمى الوظيفي" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
test("anonymous dashboard and settings access redirects to localized login", async ({
  page,
}) => {
  await page.goto("/ar/overview");
  await expect(page).toHaveURL(/\/ar\/login\?next=%2Far%2Foverview$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.goto("/en/settings");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fsettings$/);
});
test("auth callback rejects invalid links and external return destinations", async ({
  page,
}) => {
  await page.goto(
    "/ar/auth/callback?error=access_denied&next=https%3A%2F%2Fevil.example",
  );
  await expect(page).toHaveURL(/\/ar\/login\?notice=invalidLink$/);
  expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3010");

  await page.goto(
    "/en/auth/callback?error=access_denied&next=%2Fen%2Freset-password",
  );
  await expect(page).toHaveURL(/\/en\/reset-password\?notice=recoveryExpired$/);
});
test("legacy assessment entry requires authentication instead of client grading", async ({
  page,
}) => {
  await page.goto("/en/assessment");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fassessment$/);
  await expect(page.locator(".question-numbers")).toHaveCount(0);
  // Persisted grading/resume/certificate eligibility are covered by assessment-flow.spec.ts
  // against real local Supabase, rather than fixed public answer arrays.
});
test("assistant sends local replies and context switch is interactive", async ({
  page,
}) => {
  await page.goto("/en/ai-page");
  await page
    .getByRole("textbox", { name: "Ask the AI assistant" })
    .fill("Recommend a course");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".message.user").last()).toContainText(
    "Recommend a course",
  );
  await expect(page.locator(".message.assistant").last()).toContainText(
    "Python Fundamentals",
  );
  const toggle = page.getByRole("switch", {
    name: "Use current course context",
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});
test("calendar changes months, switches views and downloads an import file", async ({
  page,
}) => {
  await page.goto("/en/calendar");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-toolbar")).toContainText("May 2024");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator(".agenda button")).toHaveCount(11);
  await page.locator(".agenda button").first().click();
  await expect(page.getByRole("dialog")).toContainText("Odoo ERP Live Session");
  await page.getByRole("button", { name: "Close event" }).click();
  const file = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Sync Calendar", exact: true })
    .click();
  expect((await file).suggestedFilename()).toBe("etriplesoft-learning.ics");
});
test("checkout requires authentication and never renders demo card collection", async ({
  page,
}) => {
  await page.goto("/en/payment");
  await expect(page).toHaveURL(/\/en\/login\?next=/);
  await expect(page.getByRole("textbox", { name: "Card number" })).toHaveCount(
    0,
  );
});
test("mobile navigation opens, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/courses", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page
    .locator(".sidebar nav")
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fsettings$/);
  await expect(page.locator(".sidebar")).toHaveCount(0);
});

test("legacy fragment URLs resolve to the matching App Router page", async ({
  page,
}) => {
  await page.goto("/#courses");
  await expect(page).toHaveURL(/\/en\/courses$/);
  await expect(
    page.getByRole("heading", { name: "All Courses" }),
  ).toBeVisible();
});

test("legacy routes, query strings, and language switching preserve the page", async ({
  page,
}) => {
  const legacy = [
    ["/courses?q=Python", "/en/courses?q=Python"],
    ["/detail-course", "/en/courses"],
    ["/ai-page", "/en/ai-page"],
    ["/community", "/en/community"],
    ["/messages", "/en/messages"],
    ["/calendar", "/en/calendar"],
    ["/certificates", "/en/login?next=%2Fen%2Fcertificates"],
    ["/settings", "/en/login?next=%2Fen%2Fsettings"],
    ["/assessment", "/en/login?next=%2Fen%2Fassessment"],
    ["/payment", "/en/payment"],
    ["/sign-up", "/en/sign-up"],
    ["/login", "/en/login"],
    ["/forgot-password", "/en/forgot-password"],
    ["/reset-password", "/en/reset-password"],
    ["/overview", "/en/login?next=%2Fen%2Foverview"],
  ];
  for (const [oldUrl, target] of legacy) {
    await page.goto(oldUrl);
    const escapedTarget = target.replaceAll("/", "\\/").replaceAll("?", "\\?");
    await expect(page).toHaveURL(new RegExp(`${escapedTarget}$`));
  }
  await page.goto("/en/courses?q=Python");
  await page.getByRole("button", { name: "Switch language: Arabic" }).click();
  await expect(page).toHaveURL(/\/ar\/courses\?q=Python$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("rejects unsupported locale prefixes", async ({ page }) => {
  const response = await page.goto("/fr/courses");
  expect(response?.status()).toBe(404);
});

test("localized pages expose the correct canonical and alternate URLs", async ({
  page,
}) => {
  const response = await page.goto("/ar/courses");
  const linkHeader = response?.headers().link ?? "";
  expect(linkHeader).toContain('hreflang="en"');
  expect(linkHeader).toContain('hreflang="ar"');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://learn.etriplesoft.com/ar/courses",
  );
  await expect(page).toHaveTitle("الدورات | ETripleSoft Learn");
});
