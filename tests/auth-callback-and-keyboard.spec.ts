import { test, expect } from "@playwright/test";

// Expired / reused / invalid email links: a PKCE code is single-use and short-lived, so a
// consumed or expired link behaves exactly like an unknown code at the exchange step.
test("invalid, expired or reused confirmation codes land on login with a safe notice (EN and AR)", async ({ page }) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/auth/callback?code=expired-or-reused-code&next=%2F${locale}%2Foverview`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?notice=expiredLink$`));
    await expect(page.locator("#auth-error")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    expect(new URL(page.url()).origin).toBe("http://127.0.0.1:3010");
  }
});

test("invalid, expired or reused recovery codes land on reset-password and cannot change a password", async ({ page }) => {
  for (const locale of ["en", "ar"] as const) {
    await page.goto(`/${locale}/auth/callback?code=expired-or-reused-code&next=%2F${locale}%2Freset-password`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/reset-password\\?notice=recoveryExpired$`));
    await expect(page.locator("#auth-error")).toBeVisible();
    await page.locator('input[name="password"]').fill("Long-enough-1");
    await page.locator('input[name="confirm_password"]').fill("Long-enough-1");
    await page.locator("form.auth-fields button[type=submit]").click();
    await expect(page.locator("#auth-error")).toBeVisible();
    await expect(page.locator(".auth-message.success")).toHaveCount(0);
  }
});

for (const locale of ["en", "ar"] as const) {
  test(`login is keyboard operable with visible focus and named controls (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/login`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");

    for (const control of await page.locator("form.auth-fields input:not([type=hidden]), form.auth-fields button").all()) {
      const name = (await control.getAttribute("aria-label")) || (await control.innerText().catch(() => "")) || "";
      expect(name.trim().length, "control needs an accessible name").toBeGreaterThan(0);
    }

    // Walk the focus order from the email field and require a visible focus indicator on each stop.
    await page.locator('input[name="email"]').focus();
    const visited: string[] = [];
    for (let step = 0; step < 6; step += 1) {
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const indicator = (s: CSSStyleDeclaration | null) =>
          !!s && ((s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none");
        const wrap = el.closest(".input-wrap");
        return {
          name: el.getAttribute("name") || el.getAttribute("aria-label") || el.textContent?.trim() || "",
          visible: indicator(getComputedStyle(el)) || indicator(wrap ? getComputedStyle(wrap) : null),
        };
      });
      visited.push(info.name);
      expect(info.visible, `focus indicator on ${info.name}`).toBe(true);
      await page.keyboard.press("Tab");
      if (!(await page.evaluate(() => !!document.activeElement?.closest("form.auth-fields, .login-options")))) break;
    }
    expect(visited).toContain("email");
    expect(visited).toContain("password");

    // Enter in the password field submits (wrong credentials -> alert, still on login).
    await page.locator('input[name="email"]').fill("nobody-keyboard@example.test");
    await page.locator('input[name="password"]').fill("wrong-password-1");
    await page.keyboard.press("Enter");
    await expect(page.locator("#auth-error")).toBeVisible();
  });
}
