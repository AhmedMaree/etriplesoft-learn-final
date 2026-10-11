import { test, expect } from "@playwright/test";

// Captures are review evidence, not automatically approved visual baselines.
for (const locale of ["en", "ar"] as const) {
  for (const width of [320, 375, 430, 768, 1024, 1280, 1440, 1920]) {
    test(`${locale} design foundation at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1086 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      for (const route of ["courses", "sign-up"]) {
        await page.goto(`/${locale}/${route}`);
        await expect(page).toHaveURL(new RegExp(`/${locale}/${route}$`));
        await expect(page.locator("h1").first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr",
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        for (const image of await page.locator("img:visible").all()) {
          await image.scrollIntoViewIfNeeded();
          await expect
            .poll(() =>
              image.evaluate(
                (element) =>
                  element instanceof HTMLImageElement &&
                  element.complete &&
                  element.naturalWidth > 0,
              ),
            )
            .toBe(true);
        }
        await page.evaluate(() => {
          for (const element of document.querySelectorAll("*")) {
            if (element.scrollTop) element.scrollTo({ top: 0, behavior: "instant" });
          }
          window.scrollTo({ top: 0, behavior: "instant" });
        });
        const capture = testInfo.outputPath(`${locale}-${route}-${width}.png`);
        await page.screenshot({
          path: capture,
          fullPage: true,
          animations: "disabled",
        });
        await testInfo.attach(`${locale}-${route}-${width}`, {
          path: capture,
          contentType: "image/png",
        });
        if (route === "sign-up") {
          await expect(page.locator('input[type="email"]')).toHaveAttribute(
            "dir",
            "ltr",
          );
          await page.keyboard.press("Tab");
          expect(
            await page.evaluate(() => {
              const focused = document.activeElement;
              return (
                focused instanceof HTMLElement &&
                focused !== document.body &&
                getComputedStyle(focused).outlineStyle !== "none"
              );
            }),
          ).toBe(true);
        }
      }
      expect(errors).toEqual([]);
    });
  }
}
