import { test, expect } from "@playwright/test";
const routes = [
  "overview",
  "courses",
  "ai-page",
  "detail-course",
  "assessment",
  "calendar",
  "certificates",
  "payment",
  "settings",
  "sign-up",
];
test("all ten pages render at desktop, tablet and phone widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [1448, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1086 });
    for (const route of routes) {
      await page.goto("/#" + route);
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
test("course filtering and search work together", async ({ page }) => {
  await page.goto("/#courses");
  await expect(page.locator(".course-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Technical", exact: true }).click();
  await expect(page.locator(".course-card")).toHaveCount(3);
  await page.getByRole("textbox", { name: "Search courses" }).fill("Python");
  await expect(page.locator(".course-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View Course", exact: true }).click();
  await expect(page).toHaveURL(/#detail-course$/);
  await page.getByRole("button", { name: "Curriculum", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Course Curriculum" }),
  ).toBeVisible();
});
test("signup validates passwords and opens the learner dashboard", async ({
  page,
}) => {
  await page.goto("/#sign-up");
  await page.getByLabel("Your Email").fill("learner@example.com");
  await page.getByLabel("Your Name").fill("Demo Learner");
  await page.getByLabel("Password", { exact: true }).fill("test-pass-123");
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("different-pass");
  await page.getByLabel("Age", { exact: true }).fill("24");
  await page.getByLabel("Gender", { exact: true }).selectOption("Male");
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Passwords do not match",
  );
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill("test-pass-123");
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(page).toHaveURL(/#overview$/);
  await expect(page.locator(".user-menu")).toContainText("Demo Learner");
});
test("settings persist and cancel restores saved values", async ({ page }) => {
  await page.goto("/#settings");
  await page.getByLabel("Your Name", { exact: true }).fill("Updated Learner");
  await page
    .getByLabel("Your Email", { exact: true })
    .fill("updated@example.com");
  await page
    .getByLabel("About you", { exact: true })
    .fill("Learning Odoo every day.");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.reload();
  await expect(page.getByLabel("Your Name", { exact: true })).toHaveValue(
    "Updated Learner",
  );
  await expect(page.getByLabel("Your Email", { exact: true })).toHaveValue(
    "updated@example.com",
  );
  await page.getByLabel("Your Name", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Your Name", { exact: true })).toHaveValue(
    "Updated Learner",
  );
  await page
    .locator(".settings-nav")
    .getByRole("button", { name: /Notifications/ })
    .click();
  await page
    .getByRole("switch", { name: "Email notifications", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.reload();
  await page
    .locator(".settings-nav")
    .getByRole("button", { name: /Notifications/ })
    .click();
  await expect(
    page.getByRole("switch", { name: "Email notifications", exact: true }),
  ).toHaveAttribute("aria-checked", "false");
});
test("assessment saves answers, changes questions and scores submission", async ({
  page,
}) => {
  await page.goto("/#assessment");
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Please answer all 10");
  const correct = [0, 1, 2, 0, 3, 0, 2, 1, 3, 0];
  for (let i = 0; i < 10; i++) {
    await page
      .locator(".question-numbers")
      .getByRole("button", { name: String(i + 1), exact: true })
      .count()
      .then(async (n) => {
        if (n)
          await page
            .locator(".question-numbers")
            .getByRole("button", { name: String(i + 1), exact: true })
            .click();
        else await page.locator(".question-numbers button").nth(i).click();
      });
    await page.locator(".answers input").nth(correct[i]).check();
  }
  await page.getByRole("button", { name: "Save Answer", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(page.locator(".assessment-result")).toContainText("100%");
  await page.getByRole("button", { name: "View Certificate" }).click();
  await expect(page).toHaveURL(/#certificates$/);
});
test("assistant sends local replies and context switch is interactive", async ({
  page,
}) => {
  await page.goto("/#ai-page");
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
  await page.goto("/#calendar");
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
test("demo checkout applies a coupon without collecting payment", async ({
  page,
}) => {
  await page.goto("/#payment");
  await page.getByRole("textbox", { name: "Coupon code" }).fill("LEARN10");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".total")).toContainText("$78.21");
  await page
    .getByRole("button", { name: "Pay with Kashier", exact: true })
    .click();
  await expect(page).toHaveURL(/#detail-course$/);
  await expect(page.getByRole("status")).toContainText(
    "No payment was collected",
  );
});
test("mobile navigation opens, navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#overview");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/open/);
  await page
    .locator(".sidebar nav")
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page).toHaveURL(/#settings$/);
  await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
});
