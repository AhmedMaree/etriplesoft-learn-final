import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const routes = [
  "/",
  "/overview",
  "/courses",
  "/ai-page",
  "/community",
  "/messages",
  "/calendar",
  "/certificates",
  "/settings",
  "/detail-course",
  "/assessment",
  "/payment",
  "/sign-up",
];
const widths = [1448, 390];
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010";
const fallbackExecutable =
  "C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
  (fs.existsSync(fallbackExecutable) ? fallbackExecutable : undefined);
const outputDirectory = path.join(".impeccable", "current-review");

fs.mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const reports = [];

try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const width of widths) {
    await page.setViewportSize({
      width,
      height: width > 700 ? 1086 : 844,
    });

    for (const route of routes) {
      errors.length = 0;
      await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate(() => document.fonts.ready);
      const name = route === "/" ? "root" : route.slice(1);
      await page.screenshot({
        path: path.join(outputDirectory, `${name}-${width}.png`),
        fullPage: true,
      });

      const report = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        brokenImages: [...document.images]
          .filter((image) => !image.complete || !image.naturalWidth)
          .map((image) => image.src),
      }));
      reports.push({ route, ...report, errors: [...errors] });
    }
  }

  await page.close();
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(outputDirectory, "report.json"),
  `${JSON.stringify(reports, null, 2)}\n`,
);
console.log(JSON.stringify(reports, null, 2));
