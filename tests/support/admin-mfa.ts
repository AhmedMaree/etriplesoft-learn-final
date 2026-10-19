import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { enrollAdminTotp, totpCode } from "../../scripts/lib/admin-mfa.mjs";

export { enrollAdminTotp, totpCode, verifyAdminTotp } from "../../scripts/lib/admin-mfa.mjs";

// Gives a test admin a verified TOTP factor (admin authority needs aal2). Returns the secret.
export async function enrollTestAdminTotp(url: string, publishableKey: string, email: string, password: string) {
  const client = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in for MFA enrollment failed: ${error.message}`);
  return enrollAdminTotp(client) as Promise<string>;
}

// After a browser sign-in: open the admin area once and enter the code, upgrading the session to aal2.
export async function completeAdminMfa(page: Page, locale: string, secret: string) {
  await page.goto(`/${locale}/admin`);
  await passAdminMfa(page, secret);
}

// Completes the admin area's "enter your authentication code" screen when it is shown.
export async function passAdminMfa(page: Page, secret: string) {
  const title = page.locator("#admin-mfa-title");
  if (!(await title.isVisible())) return;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.locator('.admin-mfa input[name="code"]').fill(totpCode(secret));
    await page.locator(".admin-mfa-form button[type=submit]").click();
    const outcome = await Promise.race([
      title.waitFor({ state: "detached" }).then(() => "done"),
      page.locator("#admin-mfa-error").waitFor().then(() => "retry"),
    ]);
    if (outcome === "done") return;
    // A code is accepted once; wait for the next 30-second step.
    await page.waitForTimeout(30000 - (Date.now() % 30000) + 500);
  }
  await expect(title).toBeHidden();
}
