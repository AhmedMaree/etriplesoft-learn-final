import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const proxyControl = "http://127.0.0.1:3219/__test";

for (const scenario of [
  { locale: "en", direction: "ltr", width: 320 },
  { locale: "ar", direction: "rtl", width: 320 },
  { locale: "en", direction: "ltr", width: 1440 },
  { locale: "ar", direction: "rtl", width: 1440 },
]) {
  test(`catalog loading is announced and completes (${scenario.locale}, ${scenario.width}px)`, async ({ page, request }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: 900 });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await request.post(`${proxyControl}/reset`);

    const navigation = page.goto(`/${scenario.locale}/catalog`);
    try {
      const loading = page.locator('section[role="status"][aria-busy="true"]');
      await expect(loading).toBeVisible();
      await expect(loading).toHaveAttribute("aria-live", "polite");
      await expect(loading).not.toBeEmpty();
      await expect(page.locator("html")).toHaveAttribute("lang", scenario.locale);
      await expect(page.locator("html")).toHaveAttribute("dir", scenario.direction);
      if (scenario.locale === "ar") {
        await expect.poll(() => loading.innerText()).toMatch(/\p{Script=Arabic}/u);
      } else {
        await expect(loading).toContainText(/loading/i);
      }
      await expect.poll(async () => {
        const status = await request.get(`${proxyControl}/status`);
        return (await status.json()).pending as number;
      }).toBeGreaterThan(0);

      const screenshot = testInfo.outputPath(`phase09-loading-${scenario.locale}-${scenario.width}.png`);
      await fs.mkdir(testInfo.outputDir, { recursive: true });
      await page.screenshot({ path: screenshot, fullPage: true });
      await testInfo.attach("loading-state", { path: screenshot, contentType: "image/png" });

      const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(dimensions.content, `loading state overflows at ${scenario.width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
    } finally {
      await request.post(`${proxyControl}/release`);
      await navigation.catch(() => undefined);
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('section[role="status"][aria-busy="true"]')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}
