import { expect, test } from "@playwright/test";

test("public course detail reads the published course in the requested locale", async ({ page }) => {
  await page.goto("/en/catalog/python-fundamentals");
  await expect(page.getByRole("heading", { level: 1, name: "Python Fundamentals" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Python Fundamentals");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.goto("/ar/catalog/python-fundamentals");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Python Fundamentals");
  await expect.poll(() => page.getByRole("heading", { level: 1 }).innerText()).toMatch(/\p{Script=Arabic}/u);
});

test("free course enrollment is localized and returns unauthenticated learners to the course", async ({ page }) => {
  await page.goto("/en/catalog/python-fundamentals");
  const englishEnroll = page.getByTestId("course-enroll-free");
  await expect(englishEnroll).toHaveText("Enroll for free");
  await englishEnroll.click();
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fcatalog%2Fpython-fundamentals/);

  await page.goto("/ar/catalog/python-fundamentals");
  await expect(page.getByTestId("course-enroll-free")).toHaveText("سجّل في الدورة مجانًا");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("enrollment pending feedback is immediate, localized, keyboard-operable and non-duplicable", async ({ page }) => {
  test.setTimeout(120_000);
  for (const locale of ["en", "ar"] as const) {
    for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1086 });
      let releaseRequest!: () => void;
      let announceRequest!: () => void;
      let submissions = 0;
      const requestHeld = new Promise<void>((resolve) => { releaseRequest = resolve; });
      const requestSeen = new Promise<void>((resolve) => { announceRequest = resolve; });
      await page.route("**/*python-fundamentals*", async (route) => {
        if (route.request().method() === "POST") {
          submissions += 1;
          announceRequest();
          await requestHeld;
        }
        await route.continue();
      });

      await page.goto(`/${locale}/catalog/python-fundamentals`);
      await page.waitForLoadState("networkidle");
      const button = page.getByTestId("course-enroll-free");
      await button.focus();
      const submitRequest = page.waitForRequest((request) =>
        request.method() === "POST" && request.url().includes("python-fundamentals"),
      );
      await page.keyboard.press("Enter");
      await submitRequest;
      await requestSeen;

      await expect(button).toHaveAttribute("aria-disabled", "true");
      await expect(button).toHaveAttribute("aria-busy", "true");
      await expect(button).toHaveText(locale === "en" ? "Enrolling…" : "جارٍ التسجيل…");
      await expect(button).toBeFocused();
      const focus = await button.evaluate((element) => ({
        style: getComputedStyle(element).outlineStyle,
        width: getComputedStyle(element).outlineWidth,
      }));
      expect(focus.style).toBe("solid");
      expect(Number.parseFloat(focus.width)).toBeGreaterThan(0);
      await button.click();
      await page.keyboard.press("Enter");
      expect(submissions).toBe(1);
      await expect(page.getByRole("status")).toContainText(
        locale === "en" ? "Your enrollment is being processed" : "جارٍ معالجة تسجيلك",
      );
      const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(dimensions.content, `${locale} pending state overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
      if (width === 375) await page.screenshot({ path: `tmp/phase10-manual-review/${locale}-pending-375.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });

      releaseRequest();
      await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?next=`));
      await page.unrouteAll({ behavior: "wait" });
    }
  }
});

test("catalog search is server-backed and keeps exact-locale published results", async ({ page }) => {
  await page.goto("/en/catalog?q=Python");
  await expect(page.getByRole("heading", { level: 2, name: "Python Fundamentals" })).toBeVisible();
  await expect(page.locator(".mk-card")).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("Odoo System Admin");

  await page.goto("/ar/catalog?q=Python");
  await expect(page.locator(".mk-card")).toHaveCount(1);
  await expect(page.locator(".mk-card")).toContainText("أساسيات Python");

  await page.goto("/en/catalog?q=course-that-does-not-exist");
  await expect(page.getByText("No courses found", { exact: true })).toBeVisible();
});

test("public detail includes the published outline and ordered instructor attribution", async ({ page }) => {
  await page.goto("/en/catalog/crash-course-odoo-erp");
  await expect(page.getByRole("heading", { level: 2, name: "Course outline" })).toBeVisible();
  await expect(page.getByText("Business Workflow & Introduction Erp")).toBeVisible();
  await expect(page.getByText("Ahmed Raza")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Protected body");
});

test("learner course cards use canonical detail URLs and legacy routes resolve safely", async ({ page }) => {
  await page.goto("/en/courses?q=Python");
  await expect(page.getByRole("heading", { level: 2, name: "Python Fundamentals" })).toBeVisible();
  await expect(page.getByRole("link", { name: /View Course/ }).first()).toHaveAttribute(
    "href",
    "/en/catalog/python-fundamentals",
  );

  await page.goto("/en/detail-course");
  await expect(page).toHaveURL(/\/en\/detail-course$/);
  await expect(page.getByRole("heading", { level: 2, name: "Choose a course" })).toBeVisible();

  await page.goto("/en/detail-course?slug=python-fundamentals");
  await expect(page).toHaveURL(/\/en\/catalog\/python-fundamentals$/);
  await expect(page.getByRole("heading", { level: 1, name: "Python Fundamentals" })).toBeVisible();
});

test("catalog and learner course results remain responsive in English and Arabic", async ({ page }) => {
  const routes = [
    { url: "/en/catalog?q=Python", direction: "ltr" },
    { url: "/ar/catalog?q=Python", direction: "rtl" },
    { url: "/en/courses?q=Python", direction: "ltr" },
    { url: "/ar/courses?q=Python", direction: "rtl" },
  ] as const;

  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1086 });
    for (const route of routes) {
      await page.goto(route.url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("dir", route.direction);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(dimensions.content, `${route.url} overflows at ${width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  }
});

test("a draft translation is not shown and offers an explicit published locale link", async ({ page }) => {
  await page.goto("/ar/catalog/odoo-system-admin");

  await expect(page.getByTestId("course-unavailable")).toContainText(
    "هذه الدورة غير متاحة بهذه اللغة حتى الآن",
  );
  await expect(page.getByRole("link", { name: "عرض النسخة الإنجليزية" })).toHaveAttribute(
    "href",
    "/en/catalog/odoo-system-admin",
  );
  await expect(page.locator("main")).not.toContainText("Odoo System Admin");
});

test("course detail and unavailable states fit all required viewport widths in both directions", async ({ page }) => {
  const routes = [
    { url: "/en/catalog/python-fundamentals", direction: "ltr" },
    { url: "/ar/catalog/python-fundamentals", direction: "rtl" },
    { url: "/ar/catalog/odoo-system-admin", direction: "rtl" },
    { url: "/en/catalog/python-fundamentals?enrollment=unavailable", direction: "ltr" },
    { url: "/ar/catalog/python-fundamentals?enrollment=unavailable", direction: "rtl" },
  ] as const;

  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1086 });
    for (const route of routes) {
      await page.goto(route.url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("dir", route.direction);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (route.url.includes("python-fundamentals")) {
        await expect(page.getByTestId("course-enroll-free")).toBeVisible();
      }
      if (route.url.includes("enrollment=unavailable")) {
        await expect(page.locator('p[role="alert"]')).toBeVisible();
      }
      const dimensions = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(dimensions.content, `${route.url} overflows at ${width}px`).toBeLessThanOrEqual(
        dimensions.viewport + 1,
      );
    }
  }
});
