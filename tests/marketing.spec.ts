import { expect, test } from "@playwright/test";

const paths = [
  "",
  "/catalog",
  "/catalog/odoo-development",
  "/catalog/odoo-automation",
  "/learning-paths",
  "/odoo-modules",
  "/about",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
  "/refund-policy",
];
const locales = ["en", "ar"] as const;
const widths = [320, 375, 430, 768, 1024, 1280, 1440, 1920];

test("public site routes render in both locales without horizontal overflow", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of locales) {
      for (const path of paths) {
        const url = `/${locale}${path}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded" });
        expect(response?.status(), url).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await expect(page.locator("h1").first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
        expect(fits, `${url} overflows at ${width}px`).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("landing links visitors to sign up and log in, and the dashboard lives at /overview", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Sign up" }).first()).toHaveAttribute("href", "/en/sign-up");
  await expect(page.getByRole("link", { name: "Log in" }).first()).toHaveAttribute("href", "/en/login");
  await page.goto("/en/overview");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Foverview$/);
});

test("course filter by role works and the language switch keeps the page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/catalog");
  await expect(page.locator(".mk-card")).toHaveCount(7);
  await page.getByRole("button", { name: /^End User/ }).click();
  await expect(page).toHaveURL(/role=end-user/);
  await expect(page.locator(".mk-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Arabic" }).first().click();
  await expect(page).toHaveURL(/\/ar\/catalog\?role=end-user/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("landing role filter and FAQ are interactive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en", { waitUntil: "networkidle" });
  const filter = page.getByRole("group", { name: "Filter popular courses by role" });
  const total = await page.locator(".mk-carousel > li").count();
  await filter.getByRole("button", { name: "Automation Specialist" }).click();
  await expect(filter.getByRole("button", { name: "Automation Specialist" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".mk-carousel > li").count()).toBeLessThan(total);
  const item = page.locator(".mk-faq-item").first();
  await item.locator("summary").click();
  await expect(item).toHaveAttribute("open", "");
});

test("Arabic learning-path and Odoo-module editorial content is localized", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/ar/learning-paths");
    if (width < 768) {
      const firstRoleCard = page.locator(".mk-path-card").first();
      const trigger = firstRoleCard.getByRole("button");
      await expect(trigger).toBeVisible();
      if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
      await expect(firstRoleCard.locator(".mk-path-detail")).toBeVisible();
      await expect(firstRoleCard.locator(".mk-path-detail")).toContainText("دورة");
    } else {
      await expect(page.getByRole("tab", { name: "المستخدم النهائي" })).toBeVisible();
    }
    if (width >= 768) {
      await expect(page.getByText(/تعرّف على ترابط CRM/).first()).toBeVisible();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `/ar/learning-paths overflows at ${width}px`,
    ).toBe(true);

    await page.goto("/ar/odoo-modules");
    await expect(page.getByRole("button", { name: /المبيعات/ }).first()).toBeVisible();
    await expect(page.getByText("أمر بيع", { exact: true })).toBeVisible();
    await expect(page.locator(".mk-eco-panel")).not.toContainText("Lead");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `/ar/odoo-modules overflows at ${width}px`,
    ).toBe(true);
  }
});
